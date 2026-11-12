import * as vscode from 'vscode';


  export function createStatusBarItem(command: string): vscode.StatusBarItem {
   const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

  item.text='$(sparkle) Commit msg';
   item.tooltip = 'Suggest a Conventional Commits message from your staged changes (read-only)';
  item.command = command;

  item.show();
  return item;
 }

