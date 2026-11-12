import { execFile, type ExecFileException } from 'node:child_process';
import { CommitHelperError } from '../errors';


const ALLOWED_SUBCOMMANDS = new Set(['rev-parse', 'diff','status', 'ls-files', '--version']);


 const FORBIDDEN_SUBCOMMANDS = new Set([

   'add',  'am','apply', 'branch', 'checkout', 'cherry-pick', 'clean', 'clone', 'commit', 'commit-tree',

  'config','fetch', 'gc', 'init', 'merge', 'mv', 'pull', 'push', 'rebase', 'reflog', 'remote', 'reset',
  'restore', 'revert','rm', 'stash', 'switch', 'symbolic-ref', 'tag', 'update-index', 'update-ref',
  'worktree', 'write-tree'
]);


const FORBIDDEN_FLAGS = ['--output', '--ext-diff', '--textconv', '--exec', '--open-files-in-pager', '-O'];

export function assertReadOnlyGitArgs(args: readonly string[]): void {
  const sub=args[0];
  if (sub === undefined || sub.startsWith('-') && sub !== '--version') {
    throw new CommitHelperError('FORBIDDEN_GIT_COMMAND', `unexpected leading argument: ${String(sub)}`);
   }
  if (FORBIDDEN_SUBCOMMANDS.has(sub) || !ALLOWED_SUBCOMMANDS.has(sub)) {

    throw new CommitHelperError('FORBIDDEN_GIT_COMMAND', `git ${sub}`);

  }
  for (const arg of args.slice(1)) {

    if (arg === '--') {
      break; 
    }
   const bad = FORBIDDEN_FLAGS.find((flag) => arg === flag || arg.startsWith(`${flag}=`));
    if (bad !== undefined) {

      throw new CommitHelperError('FORBIDDEN_GIT_COMMAND',  `git ${sub} ${bad}`);
   }
  }
  if (sub === 'diff' && !args.includes('--cached') && !args.includes('--staged')) {


    throw new CommitHelperError('FORBIDDEN_GIT_COMMAND', 'git diff without --cached');

  }
}


export interface GitRunner {

  run(cwd: string,args: readonly string[]): Promise<string>;
}

export interface GitRunnerOptions {

    gitPath?: string; 
  timeoutMs?: number;  

  maxBuffer?: number;

}


const SAFE_GLOBAL_ARGS = ['--no-pager', '-c', 'core.quotepath=false','-c', 'color.ui=never'];

  export class CliGitRunner implements GitRunner {
  private readonly gitPath: string;
   private readonly timeoutMs: number;
  private readonly maxBuffer: number;

  constructor(options: GitRunnerOptions = {}) {
      this.gitPath = options.gitPath && options.gitPath.trim() !== '' ? options.gitPath : 'git';

    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxBuffer = options.maxBuffer ?? 32 * 1024 * 1024;
  }

  run(cwd: string, args: readonly string[]): Promise<string> {
    try {

      assertReadOnlyGitArgs(args);


    } catch (err) {

     return Promise.reject(err);

    }
    const fullArgs = args[0] === '--version' ? [...args] : [...SAFE_GLOBAL_ARGS,...args];
    return new Promise<string>((resolve,reject) => {
       execFile( 
        this.gitPath,
        fullArgs,
        { 
          cwd,
          encoding: 'utf8',
          timeout: this.timeoutMs,
          maxBuffer: this.maxBuffer,
          windowsHide: true,
            env: {
           ...process.env,

            GIT_OPTIONAL_LOCKS: '0',
            GIT_PAGER: 'cat',
            GIT_EXTERNAL_DIFF: '',
            LC_ALL: 'C' 
         }
        },
        (error,stdout, stderr) => {
          if (error === null) {
            resolve(stdout);
            return;
          }
          reject(mapExecError(error, String(stderr)));

        }
      );
    });

  }
}

function mapExecError(error: ExecFileException, stderr: string): CommitHelperError {
  if (error.code === 'ENOENT') {
    return new CommitHelperError('GIT_NOT_FOUND', error.message);

  }
 if (error.killed === true) {
    return new CommitHelperError('GIT_TIMEOUT', error.message);

  }
  if (/not a git repository/i.test(stderr)) {
    return new CommitHelperError('NOT_A_REPOSITORY',stderr.trim());
   }  

    const detail  =  stderr.trim() !== '' ? stderr.trim() : error.message;
  return new CommitHelperError('GIT_FAILED', detail);

}

