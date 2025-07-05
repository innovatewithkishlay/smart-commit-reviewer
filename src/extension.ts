import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.generateCommit', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    const cwd = workspaceFolders[0].uri.fsPath;

    exec('git diff --cached', { cwd }, (err, stdout, stderr) => {
      if (err) {
        vscode.window.showErrorMessage('Failed to get git diff.');
        return;
      }

      const summary = summarizeDiff(stdout);
      const commitMsg = generateCommitMessage(summary);

      vscode.window.showInformationMessage(`Suggested Commit: "${commitMsg}"`, 'Copy', 'Commit Now')
        .then((selection) => {
          if (selection === 'Copy') {
            vscode.env.clipboard.writeText(commitMsg);
            vscode.window.showInformationMessage('Commit message copied to clipboard.');
          } else if (selection === 'Commit Now') {
            exec(`git commit -m "${commitMsg}"`, { cwd }, (err) => {
              if (err) {
                vscode.window.showErrorMessage('Failed to commit changes.');
              } else {
                vscode.window.showInformationMessage('Committed successfully!');
              }
            });
          }
        });
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }

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
