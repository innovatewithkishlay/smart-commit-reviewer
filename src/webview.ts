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

  const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'checkGit': {
        exec('git rev-parse --is-inside-work-tree', { cwd }, (err) => {
          if (err) {
            panel.webview.postMessage({ status: 'not-initialized' });
          } else {
            exec('git status --short', { cwd }, (err, stdout) => {
              const changes = stdout.trim().split('\n').filter(Boolean);
              panel.webview.postMessage({ status: 'initialized', changes });
            });
          }
        });
        break;
      }
      case 'runGitInit': {
        exec('git init', { cwd }, (err) => {
          if (err) {
            panel.webview.postMessage({ status: 'init-failed' });
          } else {
            panel.webview.postMessage({ status: 'init-success' });
          }
        });
        break;
      }
      case 'setRemote': {
        const { repoUrl } = message;
        exec(`git remote add origin ${repoUrl}`, { cwd }, (err) => {
          if (err) {
            panel.webview.postMessage({ status: 'remote-failed' });
          } else {
            panel.webview.postMessage({ status: 'remote-set' });
          }
        });
        break;
      }
      case 'setBranch': {
        exec(`git branch -M main`, { cwd }, (err) => {
          if (err) {
            panel.webview.postMessage({ status: 'branch-failed' });
          } else {
            panel.webview.postMessage({ status: 'branch-set' });
          }
        });
        break;
      }
      case 'pushChanges': {
        exec(`git push -u origin main`, { cwd }, (err, stdout, stderr) => {
          if (err) {
            panel.webview.postMessage({ status: 'push-failed', error: stderr });
          } else {
            panel.webview.postMessage({ status: 'push-success' });
          }
        });
        break;
      }
    }
  });
}
