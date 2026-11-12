import * as vscode from 'vscode';
import { Log } from './vscode/log';
  import { SuggestionPanel } from './vscode/panel';

export const COMMAND_SUGGEST = 'betterCommit.suggest';


export function activate(context: vscode.ExtensionContext): void {

    const log = new Log();

   context.subscriptions.push(log); 
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_SUGGEST, () => SuggestionPanel.show(log)));
}

export function deactivate(): void {

}

