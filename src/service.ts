 import { CommitHelperError, toCommitHelperError } from './errors';
import { generateSuggestion } from './analysis/messageGenerator';
import { CliGitRunner, type GitRunner } from './git/gitRunner';
 import { isGitAvailable, locateRepository } from './git/repoLocator';
 import { collectStagedChanges,DEFAULT_COLLECT_OPTIONS } from './git/stagedChanges';

import type { GenerateOptions, StagedChanges, Suggestion } from './types';


export interface SuggestRequest {


   candidates: readonly string[];

    gitPath?: string;
    options?: Partial<GenerateOptions>;
    maxDiffChars?: number;

    runner?: GitRunner;
}

export interface SuggestSuccess {  
    ok: true;
    repoRoot: string;
    suggestion: Suggestion;
    changes: StagedChanges;
    gitVersion?: string;
}

export interface SuggestFailure {
    ok: false; 

    error: CommitHelperError;
  }

export type SuggestResult = SuggestSuccess | SuggestFailure; 

export async function suggestForStagedChanges(request: SuggestRequest): Promise<SuggestResult> { 
    const runner = request.runner ?? new CliGitRunner(request.gitPath !== undefined ? { gitPath: request.gitPath } : {});
    try {

          if (!(await isGitAvailable(runner))) {
            throw new CommitHelperError('GIT_NOT_FOUND');

        }
        const located = await locateRepository(runner,request.candidates);
        const changes  =  await collectStagedChanges(runner,  located.root, { 

            ...DEFAULT_COLLECT_OPTIONS,
             maxDiffChars: request.maxDiffChars ?? DEFAULT_COLLECT_OPTIONS.maxDiffChars

        });
        const suggestion=generateSuggestion(changes, request.options);
        return { ok: true,  repoRoot: located.root,suggestion,changes };

    } catch (err) {


        return { ok: false, error: toCommitHelperError(err) };


     }

}

