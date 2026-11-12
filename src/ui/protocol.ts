
import { COMMIT_TYPES,isCommitType,type CommitType,type ChangeStatus } from '../types';
import type { ValidationIssue } from '../conventional';


export interface PanelFile {
    path: string;

    oldPath?: string; 

    status: ChangeStatus;
    additions: number;
    deletions: number;
    binary: boolean;

 }

export interface PanelOptions {
    includeScope: boolean;

    includeBody: boolean;
}


export interface ReadyState {

      kind: 'ready';
    message: string; 

    type: CommitType;  
    alternatives: CommitType[];
    confidence: number;
    reasons: string[];
    files: PanelFile[];
    totalAdditions: number;
    totalDeletions: number;

    repoName: string;
      options: PanelOptions; 
    maxHeaderLength: number;
} 

export interface LoadingState {

   kind: 'loading';
}

export interface ErrorState { 
    kind: 'error';

    message: string;

}

export type PanelState=ReadyState | LoadingState | ErrorState;

export type WebviewToHost =
     | { command: 'ready' }
    | { command: 'refresh' }
    | { command: 'copy'; text: string }
    | { command: 'edit'; text: string }
   | { command: 'retype'; type: CommitType; text: string }
    | { command: 'option'; name: keyof PanelOptions; value: boolean };

 export type HostToWebview = 
     | { command: 'validation'; issues: ValidationIssue[] }

    | { command: 'setMessage'; text: string; type: CommitType }
    | { command: 'copied' };


export const MAX_MESSAGE_CHARS = 20000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;  
}

export function parseWebviewMessage(raw: unknown): WebviewToHost | undefined {
    if (!isRecord(raw) || typeof raw.command !== 'string') {
        return undefined; 

    }

    const text  =  typeof raw.text === 'string' && raw.text.length <= MAX_MESSAGE_CHARS ? raw.text:undefined;
    switch (raw.command) {

        case 'ready':
            return { command: 'ready' };
        case 'refresh':
            return { command: 'refresh' };
        case 'copy':
            return text !== undefined ? { command: 'copy', text } : undefined;
        case 'edit':
            return text !== undefined ? { command: 'edit',  text }:undefined;
        case 'retype': 
            return text !== undefined && typeof raw.type === 'string' && isCommitType(raw.type) ? { command: 'retype', type: raw.type, text } : undefined;
        case 'option':
            return (raw.name === 'includeScope' || raw.name === 'includeBody') && typeof raw.value === 'boolean'
                ? { command: 'option', name: raw.name,value: raw.value }
                : undefined;
        default:
            return undefined;

    }
}

export { COMMIT_TYPES };

