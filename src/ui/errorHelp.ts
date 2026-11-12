 import type { ErrorCode } from '../errors';


export interface ErrorHelp {  
   title: string;

  tone: 'info' | 'problem';
   steps: string[];
}

const HELP: Record<ErrorCode, ErrorHelp> = {

   NO_STAGED_CHANGES: {
      title: 'Nothing is staged yet',
      tone: 'info',
      steps: [
         'Open Source Control and click "+" next to the files you want in this commit.',
        'Come back here and press Refresh. Unstaged edits and untracked files are ignored on purpose.' 
      ]
   },
   GIT_NOT_FOUND: {

      title: 'Git is not available',
      tone: 'problem',
      steps: ['Install Git from https://git-scm.com.', 'If it is installed in an unusual place, set "git.path" in your VS Code settings.','Restart VS Code, then press Refresh.']


   },
   NOT_A_REPOSITORY: {

      title: 'This folder is not a Git repository',
      tone: 'problem',

      steps: ['Open the folder that contains your repository (the one with a .git folder).',  'Press Refresh once the right folder is open.']  

   },
   NO_WORKSPACE: {


      title: 'No folder is open',
       tone: 'problem',
      steps: ['Use File > Open Folder to open a project that uses Git.', 'Then press Refresh.']
   }, 
   GIT_FAILED: {
       title: 'Git could not read your staged changes',

      tone: 'problem',  
      steps: ['Open the "Better Commit Message" output channel for technical details.','Check that the repository is not corrupted, then press Refresh.']
   },
   GIT_TIMEOUT: {
      title: 'Git took too long to answer',

      tone: 'problem',

     steps: ['Very large repositories or slow network drives can cause this.','Try again in a moment.']
   }, 

   FORBIDDEN_GIT_COMMAND: { 
      title: 'A Git command was blocked',
      tone: 'problem',

      steps: ['This extension only runs read-only Git commands. This is a bug; please report it with the output channel contents.']

   }

};

export function errorHelp(code: ErrorCode): ErrorHelp {

   return HELP[code];

}  

