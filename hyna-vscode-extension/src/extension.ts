import * as vscode from 'vscode';
import { detectDeveloperTool } from './toolDetector';
import { HynaClient } from './hynaClient';
import { IdleDetectorService } from './idleService';
import { getActiveGitBranch } from './gitService';
import { HynaTerminalManager } from './terminalManager';
import type { DeveloperTool, ExtensionSessionState } from './types';

let hynaClient: HynaClient;
let idleDetector: IdleDetectorService | null = null;
let statusBarItem: vscode.StatusBarItem;
let heartbeatTimer: NodeJS.Timeout | null = null;
let trackerTerminal: HynaTerminalManager | null = null;

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

  const getToolDisplayName = (t: DeveloperTool) =>
    t === 'cursor' ? 'Cursor' : t === 'antigravity' ? 'Antigravity' : 'VS Code';

  const toolName = getToolDisplayName(tool);
  const toolTag = tool === 'cursor' ? 'CRSR' : tool === 'antigravity' ? 'AGY' : 'VSCD';

  // Initialize status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'hyna.status';
  context.subscriptions.push(statusBarItem);

  // Initialize Hyna Tracker Integrated Terminal
  trackerTerminal = new HynaTerminalManager(
    // On Ctrl+C from terminal
    async () => {
      await stopTrackingSession({ markDisconnectedInDb: true });
      vscode.window.showInformationMessage('Hyna Activity Tracker stopped and workstation disconnected.');
    },
    // On terminal tab closed by user
    async () => {
      await stopTrackingSession({ markDisconnectedInDb: true });
    }
  );

  // 1. Register Commands
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
        if (res.tool) {
          sessionState.tool = res.tool;
        }
        vscode.window.showInformationMessage(`Successfully connected ${getToolDisplayName(sessionState.tool)} to Hyna Studio! Starting live tracker terminal...`);
        startTrackingSession();
      } else {
        vscode.window.showErrorMessage(`Failed to connect: ${res.error || 'Invalid code'}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.disconnect', async () => {
      const currentToolName = getToolDisplayName(sessionState.tool);
      const confirm = await vscode.window.showWarningMessage(
        `Disconnect this ${currentToolName} workstation from Hyna?`,
        'Disconnect',
        'Cancel'
      );
      if (confirm === 'Disconnect') {
        await stopTrackingSession({ markDisconnectedInDb: true });
        await hynaClient.disconnect();
        sessionState.userId = '';
        sessionState.status = 'ended';
        sessionState.projectId = undefined;
        sessionState.projectName = undefined;
        sessionState.taskId = undefined;
        sessionState.taskTitle = undefined;
        sessionState.workspaceName = undefined;
        sessionState.currentFile = undefined;
        sessionState.gitBranch = undefined;
        if (trackerTerminal) {
          trackerTerminal.logSessionEnded();
          trackerTerminal.dispose();
        }
        vscode.window.showInformationMessage('Hyna activity tracking disconnected.');
        updateStatusBar();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.openTerminal', () => {
      if (trackerTerminal) {
        trackerTerminal.show(true);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.start', () => {
      if (!sessionState.userId) {
        vscode.window.showWarningMessage('Not connected to Hyna Studio yet. Please enter pairing code first.');
        vscode.commands.executeCommand('hyna.connect');
        return;
      }
      startTrackingSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.stop', async () => {
      await stopTrackingSession({ markDisconnectedInDb: true });
      vscode.window.showInformationMessage('Hyna live tracking stopped.');
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
        trackerTerminal?.updateInfo({ projectName: pick.label, taskTitle: 'None' });
        trackerTerminal?.logInfo(`Active Project changed to: ${pick.label}`);
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
        trackerTerminal?.updateInfo({ taskTitle: pick.label });
        trackerTerminal?.logInfo(`Active Task changed to: ${pick.label}`);
        sendHeartbeat('task_started');
        updateStatusBar();
        vscode.window.showInformationMessage(`Active Task set to: ${pick.label}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hyna.status', async () => {
      const isConnected = Boolean(sessionState.userId);
      const currentToolName = getToolDisplayName(sessionState.tool);
      if (!isConnected) {
        const choice = await vscode.window.showInformationMessage(
          `Hyna Tracker: Disconnected (${currentToolName})`,
          'Connect Now'
        );
        if (choice === 'Connect Now') {
          vscode.commands.executeCommand('hyna.connect');
        }
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `Hyna Tracker: ${sessionState.status.toUpperCase()} (${currentToolName})\nProject: ${sessionState.projectName || 'None'}\nTask: ${sessionState.taskTitle || 'None'}\nWorkspace: ${sessionState.workspaceName || 'None'}`,
        'Open Tracker Terminal',
        'Change Project',
        'Change Task',
        'Disconnect'
      );

      if (action === 'Open Tracker Terminal') vscode.commands.executeCommand('hyna.openTerminal');
      if (action === 'Change Project') vscode.commands.executeCommand('hyna.selectProject');
      if (action === 'Change Task') vscode.commands.executeCommand('hyna.selectTask');
      if (action === 'Disconnect') vscode.commands.executeCommand('hyna.disconnect');
    })
  );

  // 2. Check for previously stored connection
  const storedUserId = await hynaClient.getStoredUserId();
  const storedTool = await hynaClient.getStoredTool();
  if (storedUserId) {
    sessionState.userId = storedUserId;
    if (storedTool) {
      sessionState.tool = storedTool;
    }
    startTrackingSession();
  } else {
    updateStatusBar();
  }
}

function startTrackingSession() {
  const config = vscode.workspace.getConfiguration('hyna');
  const idleTimeoutMin = config.get<number>('idleTimeoutMinutes') || 5;
  const heartbeatSec = Math.max(30, config.get<number>('heartbeatIntervalSeconds') || 45);

  const getToolDisplayName = (t: DeveloperTool) =>
    t === 'cursor' ? 'Cursor' : t === 'antigravity' ? 'Antigravity IDE' : 'VS Code';

  // Set workspace name
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    sessionState.workspaceName = workspaceFolders[0].name;
  } else {
    sessionState.workspaceName = 'Single File Workspace';
  }

  const deviceName = (process.env.COMPUTERNAME || process.env.HOSTNAME || 'Developer PC').trim();

  // Initialize Idle Detector
  if (idleDetector) idleDetector.dispose();
  idleDetector = new IdleDetectorService(
    idleTimeoutMin,
    () => handleIdleTransition(),
    () => handleActiveTransition()
  );

  sessionState.status = 'active';

  // Automatically update and open the Hyna Tracker Terminal
  if (trackerTerminal) {
    trackerTerminal.updateInfo({
      toolName: getToolDisplayName(sessionState.tool),
      deviceName,
      workspaceName: sessionState.workspaceName,
      projectName: sessionState.projectName || 'None',
      taskTitle: sessionState.taskTitle || 'None',
    });
    trackerTerminal.show(true);
  }

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

export async function stopTrackingSession(options: { markDisconnectedInDb?: boolean } = { markDisconnectedInDb: true }) {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (idleDetector) {
    idleDetector.dispose();
    idleDetector = null;
  }

  if (sessionState.userId) {
    await sendHeartbeat('session_ended');
    if (options.markDisconnectedInDb) {
      await hynaClient.setDisconnectedStatus();
    }
  }

  sessionState.status = 'ended';
  trackerTerminal?.logSessionEnded();
  updateStatusBar();
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

  const branch = await getActiveGitBranch();
  trackerTerminal?.logActivity(safePath, branch);

  sendHeartbeat('file_activity', {
    fileName: safeName,
    filePath: safePath,
  });
}

function handleIdleTransition() {
  sessionState.status = 'idle';
  trackerTerminal?.logHeartbeat('idle');
  sendHeartbeat('idle');
  updateStatusBar();
}

function handleActiveTransition() {
  sessionState.status = 'active';
  sessionState.lastActivityAt = Date.now();
  trackerTerminal?.logHeartbeat('active');
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

  if (eventType === 'session_heartbeat') {
    trackerTerminal?.logHeartbeat(sessionState.status === 'idle' ? 'idle' : 'active');
  }

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
  const toolName =
    sessionState.tool === 'cursor' ? 'Cursor' : sessionState.tool === 'antigravity' ? 'Antigravity' : 'VS Code';

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

export async function deactivate(): Promise<void> {
  await stopTrackingSession({ markDisconnectedInDb: true });
  trackerTerminal?.dispose();
}
