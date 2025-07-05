import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function openGitPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'gitAssistant',
    'Git Assistant',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const mediaPath = path.join(context.extensionPath, 'media', 'ui.html');
  const html = fs.readFileSync(mediaPath, 'utf-8');
  panel.webview.html = html;

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case 'checkGit':
          const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
          exec('git rev-parse --is-inside-work-tree', { cwd: folder }, (err) => {
            if (err) {
              panel.webview.postMessage({ status: 'not-initialized' });
            } else {
              panel.webview.postMessage({ status: 'initialized' });
            }
          });
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}
