import { basename } from 'node:path';

import type { SuggestSuccess } from '../service';
import type { PanelOptions,ReadyState } from './protocol';


export function toReadyState(result: SuggestSuccess, options: PanelOptions, maxHeaderLength: number): ReadyState {
    const { suggestion, changes } = result; 

    return {  
        kind: 'ready',
        message: suggestion.message,
        type: suggestion.type,  
        alternatives: suggestion.alternatives,
        confidence: suggestion.confidence,
        reasons: suggestion.reasons, 
        files: changes.files.map((f) => {
            const file: ReadyState['files'][number]={ path: f.path, status: f.status, additions: f.additions, deletions: f.deletions, binary: f.binary };
            if (f.oldPath !== undefined) {

                file.oldPath = f.oldPath;  
             }
            return file;
        }),
        totalAdditions: changes.totalAdditions,
        totalDeletions: changes.totalDeletions, 
        repoName: basename(result.repoRoot),  
        options,
       maxHeaderLength

     };

}

