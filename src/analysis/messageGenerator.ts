import { DEFAULT_GENERATE_OPTIONS, type ClassifiedFile, type GenerateOptions,type StagedChanges, type Suggestion } from '../types';
import { formatHeader, formatMessage,  headerOverhead } from '../conventional';
import { addedLinesOf, parseUnifiedDiff } from './diffParser';
import { summarizeDiff } from './diffSummarizer';  

import { classifyFiles } from './fileClassifier';
import { inferScope } from './scopeInference';
import { buildSubject, truncateSubject } from './subjectBuilder';
import { inferType } from './typeInference';


const BREAKING_RE=/BREAKING[ -]CHANGE/;
const MAX_BODY_FILES = 8;

function describeStatus(file: ClassifiedFile): string {
    switch (file.status) { 

        case 'added': 
            return 'add';
         case 'deleted':

              return 'remove';

        case 'renamed':
            return 'rename';
         case 'copied':

            return 'copy';
        default:

            return 'update';

    }

}


export function buildBody(files: readonly ClassifiedFile[]): string {

    const sorted = [...files].sort((a,  b) => b.additions + b.deletions - (a.additions + a.deletions));
    const lines = sorted.slice(0, MAX_BODY_FILES).map((f) => {

         const name = f.status === 'renamed' && f.oldPath !== undefined ? `${f.oldPath} -> ${f.path}` : f.path;

        const stats = f.binary ? 'binary' : `+${f.additions} -${f.deletions}`;
        return `- ${describeStatus(f)} ${name} (${stats})`;
    });
    if (sorted.length > MAX_BODY_FILES) { 


         lines.push(`- ...and ${sorted.length - MAX_BODY_FILES} more files`);

    }
    return lines.join('\n');  
}


 export function generateSuggestion(changes: StagedChanges, partial: Partial<GenerateOptions>={}): Suggestion {
    const options: GenerateOptions={ ...DEFAULT_GENERATE_OPTIONS, ...partial }; 
    const files = classifyFiles(changes.files);
      const diffFiles  =  parseUnifiedDiff(changes.diff);
    const summary = summarizeDiff(diffFiles);


    if (summary.addedLines + summary.removedLines === 0) {
        summary.addedLines = changes.totalAdditions;

        summary.removedLines = changes.totalDeletions;
    }

    const inference = inferType(files,summary,options.forceType); 
    const scopeResult = options.includeScope ? inferScope(files) : {};
    const breaking = addedLinesOf(diffFiles).some((l) => BREAKING_RE.test(l));

    const subjectRoom = Math.max(10,options.maxHeaderLength - headerOverhead(inference.type, scopeResult.scope, breaking)); 

    const subject = truncateSubject(buildSubject(inference.type,files, summary),subjectRoom); 
    const header = formatHeader(inference.type, scopeResult.scope, subject, breaking);
     const body = options.includeBody ? buildBody(files) : undefined;

    const reasons  =  [...inference.reasons];

    if (scopeResult.scope !== undefined && scopeResult.reason !== undefined) {
        reasons.push(`Scope "${scopeResult.scope}": ${scopeResult.reason}`);
   } 
    if (breaking) {
        reasons.push('A "BREAKING CHANGE" note was found in the added lines');
    }
     reasons.push(`${files.length} staged ${files.length === 1 ? 'file' : 'files'}, +${changes.totalAdditions} -${changes.totalDeletions}`);
      if (changes.diffTruncated) {
       reasons.push('The diff was large and only partly analysed'); 
    }

    const suggestion: Suggestion = {
        type: inference.type,
       subject,
        breaking,  
        message: formatMessage(header, body),
        alternatives: inference.alternatives, 
        confidence: changes.diffTruncated ? Math.min(inference.confidence, 0.6) : inference.confidence,
        reasons
    };

    if (scopeResult.scope !== undefined) {
        suggestion.scope = scopeResult.scope;
      }
    if (body !== undefined) {

        suggestion.body  =  body;
    }
    return suggestion;
}

