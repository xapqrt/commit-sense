import * as vscode from 'vscode';
import { suggestForStagedChanges } from './service';
import { getCandidateFolders } from './vscode/gitApi'; 
import { Log } from './vscode/log';


export const COMMAND_SUGGEST = 'betterCommit.suggest';


export function activate(context: vscode.ExtensionContext): void {
      const log=new Log();
    context.subscriptions.push(log);

    context.subscriptions.push(
         vscode.commands.registerCommand(COMMAND_SUGGEST, async () => {
            const result = await suggestForStagedChanges({ candidates: await getCandidateFolders() });

            if (!result.ok) {

                log.error(result.error.code, result.error.detail);
                 void vscode.window.showWarningMessage(result.error.userMessage);
                  return;
            }

            log.info(`Suggested "${result.suggestion.message.split('\n')[0]}" for ${result.repoRoot}`);
            const choice = await vscode.window.showInformationMessage(result.suggestion.message, 'Copy');
            if (choice === 'Copy') {
               await vscode.env.clipboard.writeText(result.suggestion.message);

            }

        })
    );
}

export function deactivate(): void {


}

