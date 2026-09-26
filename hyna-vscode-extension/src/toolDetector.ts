import * as vscode from 'vscode';
import type { DeveloperTool } from './types';

/**
 * Detects whether the extension is running inside Cursor or standard VS Code.
 * Cursor is built on VS Code's extension host, but sets appName to 'Cursor'
 * and exposes Cursor-specific environment variables.
 */
export function detectDeveloperTool(): DeveloperTool {
  const appName = (vscode.env.appName || '').toLowerCase();
  const execPath = (process.execPath || '').toLowerCase();

  if (
    appName.includes('antigravity') ||
    execPath.includes('antigravity') ||
    Boolean(process.env.ANTIGRAVITY_AGENT)
  ) {
    return 'antigravity';
  }

  if (
    appName.includes('cursor') ||
    execPath.includes('cursor') ||
    Boolean(process.env.CURSOR_VERSION) ||
    Boolean(process.env.CURSOR_AGENT)
  ) {
    return 'cursor';
  }

  return 'vscode';
}
