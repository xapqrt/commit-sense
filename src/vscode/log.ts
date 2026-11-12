
import * as vscode from 'vscode';


export class Log {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Better Commit Message');

    }


   info(message: string): void {
        this.channel.appendLine(`[${new Date().toISOString()}] ${message}`);

     }

    error(message: string, detail?: string): void {
        this.info(`ERROR ${message}${detail !== undefined ? ` — ${detail}` : ''}`);
    }

    show(): void {
        this.channel.show(true);
    }

     dispose(): void {

        this.channel.dispose();
    }
}

