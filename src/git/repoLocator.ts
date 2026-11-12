
 import { existsSync } from 'node:fs';
import { CommitHelperError, isCommitHelperError } from '../errors';
import type { GitRunner } from './gitRunner';


export interface LocatedRepository {


  root: string; 

  foundFrom: string;
}


export async function getGitVersion(runner: GitRunner, cwd: string = process.cwd()): Promise<string> { 
  const out = await runner.run(cwd, ['--version']);
  return out.trim();  
}


 export async function isGitAvailable(runner: GitRunner, cwd: string = process.cwd()): Promise<boolean> {

   try {  
    await getGitVersion(runner, cwd);  

    return true;
  } catch (err) {

    if (isCommitHelperError(err) && err.code === 'GIT_NOT_FOUND') {

       return false;

    }

    return true;
  }

}


export async function locateRepository(runner: GitRunner, candidates: readonly string[]): Promise<LocatedRepository> {
    const unique = [...new Set(candidates.filter((c) => c.trim() !== ''))];
    if (unique.length === 0) { 
    throw new CommitHelperError('NO_WORKSPACE');
  }


    let lastFailure: CommitHelperError | undefined;
  for (const folder of unique) {

    if (!existsSync(folder)) {

      continue;
    }
    try {

      const out = await runner.run(folder,['rev-parse', '--show-toplevel']);

      const root = out.trim();

      if (root !== '') {
          return { root, foundFrom: folder };

      }
     } catch (err) {

      if (!isCommitHelperError(err)) {
        throw err;
      }

     if (err.code === 'GIT_NOT_FOUND' || err.code === 'GIT_TIMEOUT' || err.code === 'FORBIDDEN_GIT_COMMAND') {
        throw err;

      }
      lastFailure = err;
     } 
    }
   throw new CommitHelperError('NOT_A_REPOSITORY', lastFailure?.detail);
} 

