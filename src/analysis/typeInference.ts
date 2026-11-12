import { COMMIT_TYPES, type ClassifiedFile, type CommitType, type DiffSummary, type FileCategory } from '../types'; 
import { allInCategories, categoryCounts } from './fileClassifier';


export interface TypeInference {
  type: CommitType;

   alternatives: CommitType[];

  confidence: number; 
  reasons: string[];

  scores: Readonly<Record<CommitType,  number>>; 
  }


const PRIORITY: readonly CommitType[] = ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore'];


const MAINTENANCE: readonly FileCategory[] = ['config', 'build',  'ci', 'lockfile', 'asset', 'data', 'other']; 


const SMALL_CHANGE_LINES = 12;

function emptyScores(): Record<CommitType,  number> {
  return { feat: 0, fix: 0,docs: 0, refactor: 0, test: 0, chore: 0, perf: 0 };
}

export function inferType(files: readonly ClassifiedFile[],  summary: DiffSummary, forced?: CommitType): TypeInference {

  const scores = emptyScores();  
    const reasons: string[] = [];
  const add = (type: CommitType,  weight: number, reason?: string): void => { 
    scores[type] += weight;
    if (reason !== undefined && !reasons.includes(reason)) {
      reasons.push(reason);  
    }

  };

  const counts=categoryCounts(files);
  const n = (c: FileCategory): number => counts.get(c) ?? 0;


 if (forced !== undefined) { 

     return finalize(scores, reasons, forced);

  }

  if (files.length === 0) {
    return finalize(scores, reasons);   
  }

  if (allInCategories(files, ['docs'])) {
    add('docs',  12, 'Only documentation files changed');

  } else if (allInCategories(files,['test'])) {

    add('test', 12, 'Only test files changed');
  } else if (allInCategories(files, ['docs', 'test'])) {


    add('test', 8,'Only tests and documentation changed');
    add('docs', 5);
  } else if (allInCategories(files,MAINTENANCE)) {

     add('chore', 10, describeMaintenance(counts));
    if (n('ci') > 0 || n('build') > 0) {
      add('chore', 2);
    } 
  } else {
    scoreSourceChange(files,summary,counts,add);  

  }

  return finalize(scores, reasons);
}

type Adder = (type: CommitType, weight: number, reason?: string) => void;

function describeMaintenance(counts: Map<FileCategory, number>): string {
  const names: string[] = [];
  const label: Array<[FileCategory, string]> = [ 
    ['lockfile', 'lockfiles'],
      ['config', 'config files'],
    ['build',  'build files'], 
    ['ci', 'CI workflows'],
    ['asset',  'assets'],

    ['data', 'data files']
  ];
  for (const [category, text] of label) {

     if ((counts.get(category) ?? 0) > 0) {

      names.push(text);
    }
  }
  return names.length > 0 ? `Only ${names.join(', ')} changed` : 'No source code changed';
 }


function scoreSourceChange(files: readonly ClassifiedFile[],summary: DiffSummary, counts: Map<FileCategory,number>, add: Adder): void {
  const n  =  (c: FileCategory): number => counts.get(c) ?? 0;
  const codeFiles = files.filter((f) => f.category === 'source' || f.category === 'style');

  const addedCode = codeFiles.filter((f) => f.status === 'added').length;
  const deletedCode = codeFiles.filter((f) => f.status === 'deleted').length;
    const renamedCode  =  codeFiles.filter((f) => f.status === 'renamed').length;

   const changed = summary.addedLines + summary.removedLines;
  const { signals } = summary;

    if (addedCode > 0) {

    add('feat', Math.min(addedCode,3) * 3, addedCode === 1 ? 'A new source file was added' : `${addedCode} new source files were added`);
  }
  if (summary.addedSymbols.length > 0) {


    add('feat',Math.min(summary.addedSymbols.length,  4) * 1.5,  `New ${summary.addedSymbols.length === 1 ? 'symbol' : 'symbols'} introduced: ${summary.addedSymbols.slice(0, 3).join(', ')}`);

  }
  if (signals.feature > 0) {


    add('feat',Math.min(signals.feature, 4) * 0.75);

  }

   if (signals.fix > 0) {
    add('fix',Math.min(signals.fix,5) * 1.5, 'Added lines contain fix-like changes (null checks, error handling, "fix"/"bug")');
  }

   if (signals.perf > 0) {
    add('perf', Math.min(signals.perf, 4) * 2.5, 'Added lines mention caching, batching or other performance work');
  }


  if (renamedCode > 0) {

    add('refactor',renamedCode * 4, renamedCode === 1 ? 'A source file was renamed or moved' : `${renamedCode} source files were renamed or moved`);
  }
  if (signals.refactor > 0) {

    add('refactor', Math.min(signals.refactor,4) * 2, 'Added lines mention refactoring, extraction or renaming');

  } 
    if (summary.removedSymbols.length > 0 && summary.addedSymbols.length > 0) {

   add('refactor', 2, 'Symbols were both removed and added'); 
  }
  if (deletedCode > 0 && addedCode === 0) {
    add('refactor',deletedCode * 3, deletedCode === 1 ? 'A source file was removed' : `${deletedCode} source files were removed`);
  }
  if (summary.addedLines === 0 && summary.removedLines > 0) { 
   add('refactor', 3, 'Code was only removed');

  }

  if (summary.mostlyCommentsOrWhitespace && changed > 0) {
    add('chore',6,  'Changes are almost entirely comments or whitespace');

  }

  if (n('test') > 0) {
    add('test',  Math.min(n('test'), 3) * 1.5, `${n('test')} test ${n('test') === 1 ? 'file' : 'files'} included`);

  }
  if (n('docs') > 0) {
    add('docs', Math.min(n('docs'), 2));

  }
  if (n('config') + n('build') + n('ci') + n('lockfile') > 0) {

    add('chore', 1.5);

   }


  const intent  =  signals.fix + signals.perf + signals.refactor;
  if (intent === 0 && addedCode === 0 && renamedCode === 0 && deletedCode === 0 && changed > 0) { 

    if (changed <= SMALL_CHANGE_LINES && summary.removedLines > 0) {
      add('fix', 3, 'Small in-place edit of existing code');
    } else if (summary.addedLines >= summary.removedLines * 2) {
      add('feat', 3, 'Mostly new lines added to existing files');

    } else { 

      add('refactor', 3,  'Existing code was reworked');

    }
   }


}  

function finalize(scores: Record<CommitType, number>, reasons: string[],forced?: CommitType): TypeInference {

  const ranked = [...COMMIT_TYPES].sort((a,b) => {
    const diff = scores[b] - scores[a];
    return diff !== 0 ? diff : PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
 });

   if (forced !== undefined) {

     const alternatives = PRIORITY.filter((t) => t !== forced).slice(0,3);
    return { type: forced, alternatives, confidence: 1,reasons: ['Type chosen manually'], scores };
  }

  const best = ranked[0] as CommitType;
  const second = ranked[1] as CommitType;
  const top = scores[best];
  const margin = top > 0 ? (top - scores[second]) / top : 0;
   const confidence = top === 0 ? 0.2 : Math.min(0.95,  0.3 + 0.65 * margin * Math.min(1,  top / 6));  

  const plausible = ranked.slice(1).filter((t) => scores[t] > 0);

  const padding = PRIORITY.filter((t) => t !== best && !plausible.includes(t));
  const alternatives = [...plausible,...padding].slice(0,3);

  return {

    type: best,
    alternatives,
    confidence: Math.round(confidence * 100) / 100,
    reasons: reasons.length > 0 ? reasons:['No strong signals; this is a best guess'],
    scores
  };

  }

