 import * as vscode from 'vscode';
import { validateMessage, withType } from '../conventional';
import { suggestForStagedChanges,  type SuggestResult } from '../service';

import { toReadyState } from '../ui/panelState';
import { parseWebviewMessage, type HostToWebview,  type PanelOptions } from '../ui/protocol';

import { makeNonce,renderPanelHtml } from '../ui/webviewHtml';
import type { CommitType } from '../types';
import { getCandidateFolders } from './gitApi';
import { readSettings } from './config';
import type { Log } from './log';


 const VIEW_TYPE = 'betterCommit.suggestion';


  export class SuggestionPanel {

    private static current: SuggestionPanel | undefined;

    private readonly panel: vscode.WebviewPanel;
    private readonly log: Log;
    private options: PanelOptions; 
    private maxHeader: number;

     private generated = '';
    private latest: SuggestResult | undefined; 
     private busy = false;

    static show(log: Log): void {


        if (SuggestionPanel.current !== undefined) { 

            SuggestionPanel.current.panel.reveal(undefined, false);

            void SuggestionPanel.current.refresh();
            return;  
        }
        SuggestionPanel.current = new SuggestionPanel(log); 
      }

    private constructor(log: Log) {

         this.log=log;
          const settings = readSettings();
        this.options = { includeScope: settings.includeScope,includeBody: settings.includeBody };
        this.maxHeader = settings.maxHeaderLength;
         this.panel=vscode.window.createWebviewPanel(VIEW_TYPE, 'Commit Message', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false }, { enableScripts: true, retainContextWhenHidden: true });

        this.panel.onDidDispose(() => { 
            SuggestionPanel.current = undefined;
        });
        this.panel.webview.onDidReceiveMessage((raw: unknown) => void this.onMessage(raw)); 

        void this.refresh();
    }

    private post(message: HostToWebview): void {
        void this.panel.webview.postMessage(message);
      }


    private render(html: string): void {

        this.panel.webview.html = html;

    }

    private async refresh(forceType?: CommitType): Promise<void> {
        if (this.busy) {
            return;
        }
        this.busy = true;
        try {
            this.render(renderPanelHtml({ kind: 'loading' }, makeNonce(), this.panel.webview.cspSource));
             const settings = readSettings();
            this.maxHeader = settings.maxHeaderLength;
            const result = await suggestForStagedChanges({

                candidates: await getCandidateFolders(),
               maxDiffChars: settings.maxDiffSize,
                ...(settings.gitPath !== undefined ? { gitPath: settings.gitPath } : {}),
                options: { includeScope: this.options.includeScope, includeBody: this.options.includeBody, maxHeaderLength: this.maxHeader,...(forceType !== undefined ? { forceType } : {}) }
            });
            this.latest = result;
            if (!result.ok) {

                this.log.error(result.error.code, result.error.detail);
                 this.render(renderPanelHtml({ kind: 'error', code: result.error.code,message: result.error.userMessage }, makeNonce(), this.panel.webview.cspSource));
                return;

           }
            this.generated = result.suggestion.message;
            this.log.info(`Suggested "${result.suggestion.message.split('\n')[0]}" for ${result.repoRoot}`);
            this.render(renderPanelHtml(toReadyState(result,  this.options, this.maxHeader),makeNonce(),  this.panel.webview.cspSource));  

        } finally {  
             this.busy = false;

        } 

     }

    private async onMessage(raw: unknown): Promise<void> {
        const message = parseWebviewMessage(raw);
          if (message === undefined) {
            this.log.error('Ignored an invalid message from the webview');
            return;
        }

        switch (message.command) {
            case 'ready': 
                this.post({ command: 'validation', issues: validateMessage(this.generated, this.maxHeader) });  
                 break;
            case 'refresh':
                await this.refresh();
                break;
             case 'edit':

                 this.post({ command: 'validation', issues: validateMessage(message.text, this.maxHeader) });
                break;
            case 'copy':
                await vscode.env.clipboard.writeText(message.text);
                 this.post({ command: 'copied' }); 
                break;
            case 'retype':
                if (message.text === this.generated) {

                     await this.refresh(message.type);

                } else {

                    this.post({ command: 'setMessage', text: withType(message.text, message.type), type: message.type });

                }
                break;
            case 'option':
                this.options = { ...this.options,[message.name]: message.value };
                await this.refresh();

                break;

        }
    }

    get lastResult(): SuggestResult | undefined {

         return this.latest; 
    }
}

