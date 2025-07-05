import * as vscode from 'vscode';
import { exec } from 'child_process';
import { openGitPanel } from './webview'; 

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.generateCommit', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    const cwd = workspaceFolders[0].uri.fsPath;

    exec('git diff --cached --name-only', { cwd }, (checkErr, checkStdout) => {
      if (checkErr || !checkStdout.trim()) {
        vscode.window.showWarningMessage(
          "No changes are staged. Do you want to stage all changes with 'git add .'?",
          "Yes", "No"
        ).then((choice) => {
          if (choice === "Yes") {
            exec('git add .', { cwd }, (addErr) => {
              if (addErr) {
                vscode.window.showErrorMessage('Failed to stage changes.');
              } else {
                generateCommit(cwd);
              }
            });
          } else {
            vscode.window.showInformationMessage('No commit made.');
          }
        });
      } else {
        generateCommit(cwd);
      }
    });
  });

  context.subscriptions.push(disposable);

  let uiCmd = vscode.commands.registerCommand('extension.openGitUI', () => {
    openGitPanel(context);
  });

  context.subscriptions.push(uiCmd);
}

function generateCommit(cwd: string) {
  exec('git diff --cached', { cwd }, (diffErr, stdout) => {
    if (diffErr) {
      vscode.window.showErrorMessage('Failed to get git diff.');
      return;
    }

    const summary = summarizeDiff(stdout);
    const commitMsg = generateCommitMessage(summary);

    if (commitMsg === "No changes detected") {
      vscode.window.showInformationMessage("No staged changes found.");
      return;
    }

    vscode.window.showInformationMessage(`Suggested Commit: "${commitMsg}"`, 'Copy', 'Commit Now')
      .then((selection) => {
        if (selection === 'Copy') {
          vscode.env.clipboard.writeText(commitMsg);
          vscode.window.showInformationMessage('Commit message copied to clipboard.');
        } else if (selection === 'Commit Now') {
          exec(`git commit -m "${commitMsg}"`, { cwd }, (commitErr) => {
            if (commitErr) {
              vscode.window.showErrorMessage('Failed to commit changes.');
            } else {
              vscode.window.showInformationMessage('Committed successfully!');
            }
          });
        }
      });
  });
}

function summarizeDiff(diff: string): string[] {
  const lines = diff.split('\n');
  const summary: string[] = [];
  const fileChanges = new Set<string>();

  for (let line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/a\/(.+?)\s/);
      if (match) fileChanges.add(match[1]);
    }
  }

  return Array.from(fileChanges);
}

function generateCommitMessage(files: string[]): string {
  if (files.length === 0) return "No changes detected";
  if (files.length === 1) return `Updated ${files[0]}`;
  if (files.length <= 3) return `Modified ${files.join(', ')}`;
  return `Updated ${files.length} files`;
}

export function deactivate() { }
