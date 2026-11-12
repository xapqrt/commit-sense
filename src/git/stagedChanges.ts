import { CommitHelperError } from '../errors';
import type { StagedChanges } from '../types';
import type { GitRunner } from './gitRunner';
import { mergeStagedFiles, parseNameStatus,  parseNumstat } from './parsers';

 export interface CollectOptions {


  maxDiffChars: number;

  statsOnly?: boolean;
}


export const DEFAULT_COLLECT_OPTIONS: Readonly<CollectOptions> = {  
    maxDiffChars: 200_000  


};


 export async function collectStagedChanges(
  runner: GitRunner,
 repoRoot: string,
  options: CollectOptions=DEFAULT_COLLECT_OPTIONS

): Promise<StagedChanges> {
  const common=['diff','--cached','-M', '--no-color', '--no-ext-diff', '--no-textconv'];
  const [nameStatusRaw,numstatRaw] = await Promise.all([
    runner.run(repoRoot,[...common, '--name-status', '-z']),
    runner.run(repoRoot, [...common, '--numstat','-z'])
  ]);

    const files = mergeStagedFiles(parseNameStatus(nameStatusRaw),parseNumstat(numstatRaw));
  if (files.length === 0) {

    throw new CommitHelperError('NO_STAGED_CHANGES');
  }  

  let diff = ''; 
  let diffTruncated = false;
  if (options.statsOnly !== true) {

    const patch = await runner.run(repoRoot, [...common,'--unified=0']);
     if (patch.length > options.maxDiffChars) {


      diff = patch.slice(0, options.maxDiffChars);
      diffTruncated = true;
    } else {  
      diff = patch;
    }

   }


  return {

    repoRoot,
     files,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    diff,
    diffTruncated
  };
}

