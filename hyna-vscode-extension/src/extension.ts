import * as vscode from 'vscode';
import { detectDeveloperTool } from './toolDetector';
import { HynaClient } from './hynaClient';
import { IdleDetectorService } from './idleService';
import { getActiveGitBranch } from './gitService';
import type { DeveloperTool, ExtensionSessionState } from './types';

let hynaClient: HynaClient;
let idleDetector: IdleDetectorService;
let statusBarItem: vscode.StatusBarItem;
let heartbeatTimer: NodeJS.Timeout | null = null;

let sessionState: ExtensionSessionState = {
  userId: '',
  tool: 'vscode',
  status: 'active',
  lastActivityAt: Date.now(),
};

export async function activate(context: vscode.ExtensionContext) {
  const tool = detectDeveloperTool();
  sessionState.tool = tool;

  hynaClient = new HynaClient(context);

  // Initialize status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'hyna.status';
  context.subscriptions.push(statusBarItem);

  // 1. Register Commands
  const toolName = tool === 'cursor' ? 'Cursor' : tool === 'antigravity' ? 'Antigravity' : 'VS Code';
  const toolTag = tool === 'cursor' ? 'CRSR' : tool === 'antigravity' ? 'AGY' : 'VSCD';

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.connect', async () => {
      const code = await vscode.window.showInputBox({
        title: `Connect ${toolName} to Hyna Studio`,
        prompt: 'Enter the pairing code from Hyna Web (/settings/integrations)',
        placeHolder: `HYNA-${toolTag}-1234`,
        validateInput: (val) => (val && val.trim().length >= 6 ? null : 'Code must be at least 6 characters'),
      });

      if (!code) return;

      const deviceName = (process.env.COMPUTERNAME || process.env.HOSTNAME || 'Developer PC').trim();
      vscode.window.showInformationMessage(`Connecting to Hyna Studio with code ${code}...`);

      const res = await hynaClient.connectWithCode(code, tool, deviceName);
      if (res.success && res.userId) {
        sessionState.userId = res.userId;
        vscode.window.showInformationMessage(`Successfully connected ${toolName} to Hyna Studio!`);
        startTrackingSession();
      } else {
        vscode.window.showErrorMessage(`Failed to connect: ${res.error || 'Invalid code'}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.disconnect', async () => {
      const confirm = await vscode.window.showWarningMessage(
        `Disconnect this ${toolName} workstation from Hyna?`,
        'Disconnect',
        'Cancel'
      );
      if (confirm === 'Disconnect') {
        stopTrackingSession();
        await hynaClient.disconnect();
        vscode.window.showInformationMessage('Hyna activity tracking disconnected.');
        updateStatusBar();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.selectProject', async () => {
      const projects = await hynaClient.fetchProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No active projects found in Hyna Studio.');
        return;
      }

      const items = projects.map((p) => ({ label: p.name, description: p.id }));
      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select active Hyna Project for tracking',
      });

      if (pick) {
        sessionState.projectId = pick.description;
        sessionState.projectName = pick.label;
        sessionState.taskId = undefined;
        sessionState.taskTitle = undefined;
        sendHeartbeat('workspace_changed');
        updateStatusBar();
        vscode.window.showInformationMessage(`Active Project set to: ${pick.label}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.selectTask', async () => {
      if (!sessionState.projectId) {
        vscode.window.showWarningMessage('Please select a Hyna Project first before selecting a task.');
        await vscode.commands.executeCommand('hyna.selectProject');
        if (!sessionState.projectId) return;
      }

      const tasks = await hynaClient.fetchTasks(sessionState.projectId);
      if (tasks.length === 0) {
        vscode.window.showInformationMessage('No tasks found under the selected project.');
        return;
      }

      const items = tasks.map((t) => ({ label: t.title, description: t.id }));
      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select active Task',
      });

      if (pick) {
        sessionState.taskId = pick.description;
        sessionState.taskTitle = pick.label;
        sendHeartbeat('task_started');
        updateStatusBar();
        vscode.window.showInformationMessage(`Active Task set to: ${pick.label}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.status', async () => {
      const isConnected = Boolean(sessionState.userId);
      if (!isConnected) {
        const choice = await vscode.window.showInformationMessage(
          `Hyna Tracker: Disconnected (${tool === 'cursor' ? 'Cursor' : 'VS Code'})`,
          'Connect Now'
        );
        if (choice === 'Connect Now') {
          vscode.commands.executeCommand('hyna.connect');
        }
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `Hyna Tracker: ${sessionState.status.toUpperCase()} (${tool === 'cursor' ? 'Cursor' : 'VS Code'})\nProject: ${sessionState.projectName || 'None'}\nTask: ${sessionState.taskTitle || 'None'}\nWorkspace: ${sessionState.workspaceName || 'None'}`,
        'Change Project',
        'Change Task',
        'Disconnect'
      );

      if (action === 'Change Project') vscode.commands.executeCommand('hyna.selectProject');
      if (action === 'Change Task') vscode.commands.executeCommand('hyna.selectTask');
      if (action === 'Disconnect') vscode.commands.executeCommand('hyna.disconnect');
    })
  );

  // 2. Check for previously stored connection
  const storedUserId = await hynaClient.getStoredUserId();
  if (storedUserId) {
    sessionState.userId = storedUserId;
    startTrackingSession();
  } else {
    updateStatusBar();
  }
}

function startTrackingSession() {
  const config = vscode.workspace.getConfiguration('hyna');
  const idleTimeoutMin = config.get<number>('idleTimeoutMinutes') || 5;
  const heartbeatSec = Math.max(30, config.get<number>('heartbeatIntervalSeconds') || 45);

  // Initialize Idle Detector
  if (idleDetector) idleDetector.dispose();
  idleDetector = new IdleDetectorService(
    idleTimeoutMin,
    () => handleIdleTransition(),
    () => handleActiveTransition()
  );

  // Set workspace name
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    sessionState.workspaceName = workspaceFolders[0].name;
  }

  sessionState.status = 'active';

  // Send initial session start event
  sendHeartbeat('session_started');

  // Register document listeners
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document) {
      handleFileActivity(editor.document.fileName);
    }
  });

  // Start heartbeat interval
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    sendHeartbeat('session_heartbeat');
  }, heartbeatSec * 1000);

  updateStatusBar();
}

function stopTrackingSession() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (idleDetector) {
    idleDetector.dispose();
  }
  if (sessionState.userId) {
    sendHeartbeat('session_ended');
  }
  sessionState.status = 'ended';
  sessionState.userId = '';
}

async function handleFileActivity(fullPath: string) {
  if (!sessionState.userId) return;
  const config = vscode.workspace.getConfiguration('hyna');
  const trackPath = config.get<boolean>('trackRelativeFilePath') ?? true;

  // Sanitize path to safe relative path (e.g. src/App.tsx)
  let safePath = '';
  let safeName = '';

  if (trackPath) {
    const relative = vscode.workspace.asRelativePath(fullPath);
    safePath = relative;
    safeName = relative.split(/[\\/]/).pop() || '';
  }

  sessionState.currentFile = safePath;
  sessionState.lastActivityAt = Date.now();

  sendHeartbeat('file_activity', {
    fileName: safeName,
    filePath: safePath,
  });
}

function handleIdleTransition() {
  sessionState.status = 'idle';
  sendHeartbeat('idle');
  updateStatusBar();
}

function handleActiveTransition() {
  sessionState.status = 'active';
  sessionState.lastActivityAt = Date.now();
  sendHeartbeat('active');
  updateStatusBar();
}

async function sendHeartbeat(
  eventType: any,
  extra: { fileName?: string; filePath?: string } = {}
) {
  if (!sessionState.userId) return;

  const branch = await getActiveGitBranch();
  sessionState.gitBranch = branch;

  await hynaClient.sendActivityEvent({
    userId: sessionState.userId,
    tool: sessionState.tool,
    eventType,
    projectId: sessionState.projectId,
    taskId: sessionState.taskId,
    workspaceName: sessionState.workspaceName,
    fileName: extra.fileName || (sessionState.currentFile ? sessionState.currentFile.split(/[\\/]/).pop() : undefined),
    filePath: extra.filePath || sessionState.currentFile,
    gitBranch: branch,
    timestamp: new Date().toISOString(),
  });

  updateStatusBar();
}

function updateStatusBar() {
  const isConnected = Boolean(sessionState.userId);
  const toolName = sessionState.tool === 'cursor' ? 'Cursor' : 'VS Code';

  if (!isConnected) {
    statusBarItem.text = `$(circle-slash) Hyna: Offline`;
    statusBarItem.tooltip = `Hyna Studio Activity Tracker (${toolName}) - Click to connect`;
    statusBarItem.color = '#9ca3af';
  } else if (sessionState.status === 'idle') {
    statusBarItem.text = `$(history) Hyna: Idle (${toolName})`;
    statusBarItem.tooltip = `Hyna Studio: Workstation Idle\nProject: ${sessionState.projectName || 'None'}\nTask: ${sessionState.taskTitle || 'None'}`;
    statusBarItem.color = '#f59e0b';
  } else {
    const projectTag = sessionState.projectName ? ` · ${sessionState.projectName}` : '';
    statusBarItem.text = `$(pulse) Hyna: Active (${toolName}${projectTag})`;
    statusBarItem.tooltip = `Hyna Studio: Actively Working\nTool: ${toolName}\nProject: ${sessionState.projectName || 'None'}\nTask: ${sessionState.taskTitle || 'None'}\nWorkspace: ${sessionState.workspaceName || 'None'}`;
    statusBarItem.color = '#10b981';
  }

  statusBarItem.show();
}

export function deactivate() {
  stopTrackingSession();
}
