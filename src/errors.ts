


export type ErrorCode =
    | 'GIT_NOT_FOUND'
    | 'NOT_A_REPOSITORY'
    | 'NO_WORKSPACE'

    | 'NO_STAGED_CHANGES'
    | 'GIT_FAILED'
    | 'GIT_TIMEOUT'
    | 'FORBIDDEN_GIT_COMMAND';

const FRIENDLY: Record<ErrorCode, string>={

     GIT_NOT_FOUND:
        'Git was not found. Install Git (https://git-scm.com) or set "git.path" in your VS Code settings, then try again.',
    NOT_A_REPOSITORY: 'The current folder is not inside a Git repository.',
    NO_WORKSPACE: 'Open a folder that contains a Git repository first.',
    NO_STAGED_CHANGES:
       'There are no staged changes. Stage some files (for example with the "+" button in Source Control) and refresh.',  

    GIT_FAILED: 'Git reported an error while reading your staged changes.',
    GIT_TIMEOUT: 'Git took too long to respond while reading your staged changes.',
    FORBIDDEN_GIT_COMMAND:
        'Blocked: this extension only runs read-only Git commands and refused to run a command that could modify your repository.'
 };

export class CommitHelperError extends Error {

    readonly code: ErrorCode;

    readonly detail?: string;

    constructor(code: ErrorCode, detail?: string) {
        super(FRIENDLY[code]);
        this.name = 'CommitHelperError';
        this.code = code;
        this.detail  =  detail;
    }


    get userMessage(): string {

        return this.message;
    }
  }


export function isCommitHelperError(value: unknown): value is CommitHelperError {

      return value instanceof CommitHelperError;
} 


export function toCommitHelperError(value: unknown): CommitHelperError {
    if (isCommitHelperError(value)) {

        return value; 
    }
    const detail = value instanceof Error ? value.message : String(value);

    return new CommitHelperError('GIT_FAILED',  detail);


  }

