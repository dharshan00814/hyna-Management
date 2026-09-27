import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import type { DeveloperActivityEvent, DeveloperTool, ExtensionSessionState } from './types';

export class HynaClient {
  private supabase: SupabaseClient | null = null;
  private context: vscode.ExtensionContext;
  private queuedEvents: DeveloperActivityEvent[] = [];
  private activeSessionId: string | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadQueuedEvents();
    this.initializeClient();
  }

  public initializeClient() {
    const config = vscode.workspace.getConfiguration('hyna');
    const supabaseUrl = config.get<string>('supabaseUrl') || 'https://bpawtpzyodgzqjeglsye.supabase.co';
    const anonKey =
      config.get<string>('supabaseAnonKey') ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwYXd0cHp5b2RnenFqZWdsc3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg4NjYsImV4cCI6MjEwNDMyNDg2Nn0.LOAf1FWvr-z-kpgRBLffxq7cgqKvCC3A5Pw-jU_FTz4';

    if (supabaseUrl && anonKey) {
      this.supabase = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        },
      });
    }
  }

  /**
   * Helper to infer tool from code prefix (HYNA-AGY-, HYNA-CRSR-, HYNA-VSCD-)
   */
  public inferToolFromCode(code: string, fallback: DeveloperTool): DeveloperTool {
    const clean = (code || '').toUpperCase().trim();
    if (clean.includes('-AGY-') || clean.includes('ANTIGRAVITY')) return 'antigravity';
    if (clean.includes('-CRSR-') || clean.includes('CURSOR')) return 'cursor';
    if (clean.includes('-VSCD-') || clean.includes('VSCODE')) return 'vscode';
    return fallback;
  }

  /**
   * Connects extension to Hyna using a connection code generated on /settings/integrations.
   */
  public async connectWithCode(
    code: string,
    tool: DeveloperTool,
    deviceName: string
  ): Promise<{ success: boolean; userId?: string; tool?: DeveloperTool; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const cleanCode = code.trim().toUpperCase();
    const effectiveTool = this.inferToolFromCode(cleanCode, tool);

    try {
      // 1. Try secure RPC function first
      try {
        const { data: rpcData, error: rpcErr } = await this.supabase.rpc('verify_developer_connection_code', {
          p_code: cleanCode,
          p_tool: effectiveTool,
          p_device_name: deviceName,
        });

        if (!rpcErr && rpcData && rpcData.success) {
          const finalTool = (rpcData.tool as DeveloperTool) || effectiveTool;
          await this.context.secrets.store('hyna_user_id', rpcData.user_id);
          await this.context.secrets.store('hyna_tool', finalTool);
          await this.context.secrets.store('hyna_device_name', deviceName);
          if (rpcData.api_key) {
            await this.context.secrets.store('hyna_api_key', rpcData.api_key);
          }
          return { success: true, userId: rpcData.user_id, tool: finalTool };
        }
      } catch {
        // Fallback to direct query below
      }

      // 2. Direct table query fallback
      const { data, error } = await this.supabase
        .from('developer_integrations')
        .select('*')
        .eq('connection_code', cleanCode)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid or expired connection code.' };
      }

      const finalTool = (data.tool as DeveloperTool) || effectiveTool;
      const apiKey = data.api_key || `hyna_dev_${finalTool}_${Date.now()}`;

      // Save credentials in extension secure storage
      await this.context.secrets.store('hyna_user_id', data.user_id);
      await this.context.secrets.store('hyna_tool', finalTool);
      await this.context.secrets.store('hyna_device_name', deviceName);
      await this.context.secrets.store('hyna_api_key', apiKey);

      // Update integration state to connected
      await this.supabase
        .from('developer_integrations')
        .update({
          status: 'connected',
          device_name: deviceName,
          api_key: apiKey,
          connection_code: null,
          last_connected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return { success: true, userId: data.user_id, tool: finalTool };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  public async getStoredUserId(): Promise<string | undefined> {
    return this.context.secrets.get('hyna_user_id');
  }

  public async getStoredTool(): Promise<DeveloperTool | undefined> {
    return (await this.context.secrets.get('hyna_tool')) as DeveloperTool | undefined;
  }

  public async getStoredDeviceName(): Promise<string | undefined> {
    return this.context.secrets.get('hyna_device_name');
  }

  /**
   * Sets integration status to 'disconnected' in Supabase without clearing local stored credentials.
   * Useful when IDE closes or session ends.
   */
  public async setDisconnectedStatus(): Promise<void> {
    const userId = await this.getStoredUserId();
    const tool = await this.getStoredTool();

    if (this.supabase && userId && tool) {
      const nowIso = new Date().toISOString();
      try {
        // 1. Mark integration record as disconnected
        await this.supabase
          .from('developer_integrations')
          .update({
            status: 'disconnected',
            last_seen_at: nowIso,
            updated_at: nowIso,
          })
          .eq('user_id', userId)
          .eq('tool', tool);

        // 2. Terminate any active or idle sessions in developer_sessions
        await this.supabase
          .from('developer_sessions')
          .update({
            status: 'ended',
            ended_at: nowIso,
            last_activity_at: nowIso,
          })
          .eq('user_id', userId)
          .eq('tool', tool)
          .in('status', ['active', 'idle']);

        this.activeSessionId = null;
      } catch (e) {
        console.warn('[Hyna] setDisconnectedStatus warning:', e);
      }
    }
  }

  /**
   * Complete disconnect - marks status disconnected and purges local secrets.
   */
  public async disconnect(): Promise<void> {
    await this.setDisconnectedStatus();
    await this.context.secrets.delete('hyna_user_id');
    await this.context.secrets.delete('hyna_tool');
    await this.context.secrets.delete('hyna_device_name');
    await this.context.secrets.delete('hyna_api_key');
    this.activeSessionId = null;
  }

  /**
   * Sends activity event to Hyna backend. Queues locally if offline.
   */
  public async sendActivityEvent(event: DeveloperActivityEvent): Promise<boolean> {
    if (!this.supabase) {
      this.enqueueOfflineEvent(event);
      return false;
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Maintain or update developer_sessions row
      if (event.eventType === 'session_started' || !this.activeSessionId) {
        this.activeSessionId = crypto.randomUUID();
        const initialStatus =
          event.eventType === 'session_ended'
            ? 'ended'
            : event.eventType === 'idle'
            ? 'idle'
            : 'active';

        const { error: sessErr } = await this.supabase
          .from('developer_sessions')
          .insert({
            id: this.activeSessionId,
            user_id: event.userId,
            tool: event.tool,
            project_id: event.projectId || null,
            task_id: event.taskId || null,
            workspace_name: event.workspaceName || '',
            current_file: event.filePath || event.fileName || '',
            git_branch: event.gitBranch || '',
            started_at: nowIso,
            last_activity_at: nowIso,
            ended_at: event.eventType === 'session_ended' ? nowIso : null,
            status: initialStatus,
          });

        if (sessErr) {
          console.warn('[Hyna] Developer session insert error:', sessErr);
        }
      } else {
        const status =
          event.eventType === 'session_ended'
            ? 'ended'
            : event.eventType === 'idle'
            ? 'idle'
            : 'active';

        await this.supabase
          .from('developer_sessions')
          .update({
            project_id: event.projectId || null,
            task_id: event.taskId || null,
            workspace_name: event.workspaceName || '',
            current_file: event.filePath || event.fileName || '',
            git_branch: event.gitBranch || '',
            last_activity_at: nowIso,
            status,
            ended_at: event.eventType === 'session_ended' ? nowIso : null,
          })
          .eq('id', this.activeSessionId);
      }

      // 2. Insert developer_activity_events
      await this.supabase.from('developer_activity_events').insert({
        user_id: event.userId,
        session_id: this.activeSessionId,
        project_id: event.projectId || null,
        task_id: event.taskId || null,
        tool: event.tool,
        event_type: event.eventType,
        workspace_name: event.workspaceName || '',
        file_name: event.fileName || '',
        file_path: event.filePath || '',
        git_branch: event.gitBranch || '',
        metadata: event.metadata || {},
        created_at: event.timestamp || nowIso,
      });

      // 3. Touch integration last_seen_at & status
      const isEnded = event.eventType === 'session_ended';
      await this.supabase
        .from('developer_integrations')
        .update({
          last_seen_at: nowIso,
          status: isEnded ? 'disconnected' : 'connected',
          updated_at: nowIso,
        })
        .eq('user_id', event.userId)
        .eq('tool', event.tool);

      // Drain any queued offline events
      this.flushOfflineEvents();
      return true;
    } catch (err) {
      console.warn('[Hyna] Offline or network error, queuing event locally:', err);
      this.enqueueOfflineEvent(event);
      return false;
    }
  }

  public async fetchProjects(): Promise<{ id: string; name: string }[]> {
    if (!this.supabase) return [];
    try {
      const { data } = await this.supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true });
      return data || [];
    } catch {
      return [];
    }
  }

  public async fetchTasks(projectId: string): Promise<{ id: string; title: string }[]> {
    if (!this.supabase) return [];
    try {
      const { data } = await this.supabase
        .from('tasks')
        .select('id, title')
        .eq('project_id', projectId)
        .order('title', { ascending: true });
      return data || [];
    } catch {
      return [];
    }
  }

  private enqueueOfflineEvent(event: DeveloperActivityEvent) {
    if (this.queuedEvents.length > 100) {
      this.queuedEvents.shift(); // keep bounded
    }
    this.queuedEvents.push(event);
    this.saveQueuedEvents();
  }

  private async flushOfflineEvents() {
    if (this.queuedEvents.length === 0 || !this.supabase) return;
    const batch = [...this.queuedEvents];
    this.queuedEvents = [];
    this.saveQueuedEvents();

    try {
      const rows = batch.map((evt) => ({
        user_id: evt.userId,
        session_id: this.activeSessionId,
        project_id: evt.projectId || null,
        task_id: evt.taskId || null,
        tool: evt.tool,
        event_type: evt.eventType,
        workspace_name: evt.workspaceName || '',
        file_name: evt.fileName || '',
        file_path: evt.filePath || '',
        git_branch: evt.gitBranch || '',
        metadata: evt.metadata || {},
        created_at: evt.timestamp,
      }));

      await this.supabase.from('developer_activity_events').insert(rows);
    } catch (err) {
      // Re-queue on failure
      this.queuedEvents = [...batch, ...this.queuedEvents];
      this.saveQueuedEvents();
    }
  }

  private loadQueuedEvents() {
    const raw = this.context.globalState.get<string>('hyna_offline_events');
    if (raw) {
      try {
        this.queuedEvents = JSON.parse(raw);
      } catch {
        this.queuedEvents = [];
      }
    }
  }

  private saveQueuedEvents() {
    this.context.globalState.update(
      'hyna_offline_events',
      JSON.stringify(this.queuedEvents)
    );
  }
}
