


export const COMMIT_TYPES = ['feat', 'fix', 'docs','refactor', 'test', 'chore', 'perf'] as const;
export type CommitType = (typeof COMMIT_TYPES)[number];

export function isCommitType(value: string): value is CommitType {
   return (COMMIT_TYPES as readonly string[]).includes(value);

}


  export const COMMIT_TYPE_LABELS: Readonly<Record<CommitType, string>> = {
   feat: 'A new feature',
   fix: 'A bug fix',
   docs: 'Documentation only changes',
   refactor: 'Code change that neither fixes a bug nor adds a feature',
   test: 'Adding or correcting tests',
   chore: 'Maintenance, tooling, dependencies, config', 
   perf: 'A change that improves performance'
};

export type ChangeStatus =
   | 'added'
   | 'modified'
   | 'deleted'
   | 'renamed'
   | 'copied'
   | 'typechange'
   | 'unmerged'
     | 'unknown';


export interface StagedFile {

   path: string;

   oldPath?: string;

    status: ChangeStatus;

   additions: number;
   deletions: number; 
  binary: boolean;

 }


export interface StagedChanges {


   repoRoot: string;
   files: StagedFile[]; 
   totalAdditions: number;  
    totalDeletions: number;

     diff: string;
   diffTruncated: boolean; 
}


export type FileCategory =

   | 'source'
   | 'test'
   | 'docs'
     | 'config'
   | 'build'
   | 'ci'

   | 'style'
   | 'asset'

    | 'lockfile'
   | 'data'
     | 'other';

export interface ClassifiedFile extends StagedFile {
   category: FileCategory;

   extension: string;

   area: string;  

}

export interface DiffHunk {

   oldStart: number;
    newStart: number;

   heading: string;
   added: string[];
   removed: string[];
}

export interface FileDiff {


    path: string;
   hunks: DiffHunk[];  
}


export interface DiffSummary {

   addedSymbols: string[];

   removedSymbols: string[];

   touchedSymbols: string[];
   addedLines: number;

   removedLines: number; 

   mostlyCommentsOrWhitespace: boolean;

   signals: DiffSignals;
 }

export interface DiffSignals {

   fix: number;  
   perf: number;
  feature: number;
   refactor: number;
   test: number;

}

export interface Suggestion { 
   type: CommitType; 
   scope?: string;
   subject: string;
   body?: string;

    breaking: boolean;

   message: string;

    alternatives: CommitType[];

   confidence: number;

   reasons: string[];
}

export interface GenerateOptions {

   maxHeaderLength: number;

   includeScope: boolean;
   includeBody: boolean;

     forceType?: CommitType;

}

export const DEFAULT_GENERATE_OPTIONS: Readonly<GenerateOptions> = {

     maxHeaderLength: 72, 
   includeScope: true,
   includeBody: false

};

