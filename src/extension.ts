import * as vscode from 'vscode';

import { CONFIG_SECTION, readSettings } from './vscode/config';

import { Log } from './vscode/log';
  import { SuggestionPanel } from './vscode/panel';
import { createStatusBarItem } from './vscode/statusBar'; 

export const COMMAND_SUGGEST = 'betterCommit.suggest';


export function activate(context: vscode.ExtensionContext): void {
  const log = new Log();

  context.subscriptions.push(log);
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_SUGGEST, () => SuggestionPanel.show(log)));
  let statusBar: vscode.StatusBarItem | undefined;
  const applyStatusBar = (): void => {
    if (readSettings().showStatusBar) {
      statusBar ??= createStatusBarItem(COMMAND_SUGGEST);
    } else {

     statusBar?.dispose();
      statusBar = undefined;
     }
  };
 applyStatusBar();
  context.subscriptions.push(
     vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) {
          applyStatusBar();

      }
    }),
    { dispose: () => statusBar?.dispose() }

  );

}

export function deactivate(): void {

 }

