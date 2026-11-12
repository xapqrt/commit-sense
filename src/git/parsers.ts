 import type { ChangeStatus, StagedFile } from '../types';


 export interface NameStatusEntry {

   status: ChangeStatus;
   path: string;
   oldPath?: string; 


}

export interface NumstatEntry {

   additions: number; 
   deletions: number; 
   binary: boolean;
   path: string; 
     oldPath?: string;
}

export function statusFromLetter(letter: string): ChangeStatus {

   switch (letter.charAt(0)) {
      case 'A':
         return 'added';
      case 'M': 
         return 'modified';
      case 'D':
         return 'deleted';
        case 'R':
         return 'renamed';
      case 'C':
         return 'copied';
      case 'T':

         return 'typechange';
      case 'U':
         return 'unmerged';
       default:
         return 'unknown';
   } 

}


export function parseNameStatus(raw: string): NameStatusEntry[] {

   const tokens = raw.split('\0');
   const entries: NameStatusEntry[] = [];
   let i=0;
   while (i < tokens.length) {
     const code  =  tokens[i];
      if (code === undefined || code === '') {

         i++;
         continue;

      }
      const status = statusFromLetter(code);  
      if (status === 'renamed' || status === 'copied') {
         const oldPath = tokens[i + 1]; 
         const path = tokens[i + 2];

         if (oldPath !== undefined && path !== undefined) {
            entries.push({ status, path, oldPath });

         }

         i += 3;

      } else { 
         const path = tokens[i + 1];

         if (path !== undefined) {
            entries.push({ status,  path });
           }

         i += 2;
      }
    }
  return entries;  
}


export function parseNumstat(raw: string): NumstatEntry[] {


   const tokens=raw.split('\0');
   const entries: NumstatEntry[] = [];
   let i = 0;
   while (i < tokens.length) {  
      const token = tokens[i];
      if (token === undefined || token === '') {
          i++;
         continue;
      }
       const match = /^(-|\d+)\t(-|\d+)\t(.*)$/s.exec(token); 
      if (match === null) {

         i++; 
         continue;  
     }
      const binary = match[1] === '-' || match[2] === '-'; 
      const additions = binary ? 0 : Number(match[1]);
      const deletions = binary ? 0:Number(match[2]);
      const inlinePath = match[3] ?? '';
      if (inlinePath === '') {


          const oldPath = tokens[i + 1];

         const path = tokens[i + 2];
         if (oldPath !== undefined && path !== undefined) {

            entries.push({ additions,  deletions,binary,path, oldPath });
         }

         i += 3;

      } else {


         entries.push({ additions, deletions, binary, path: inlinePath });
         i++;
     }


   }
   return entries;

}  


export function mergeStagedFiles(statuses: NameStatusEntry[], stats: NumstatEntry[]): StagedFile[] {

   const statByPath = new Map<string, NumstatEntry>();  
   for (const stat of stats) {

      statByPath.set(stat.path,stat);
    }
   return statuses.map((entry) => {
      const stat = statByPath.get(entry.path);
      const file: StagedFile = { 
         path: entry.path,
         status: entry.status,
         additions: stat?.additions ?? 0,
         deletions: stat?.deletions ?? 0,
         binary: stat?.binary ?? false
       };
      if (entry.oldPath !== undefined) {
         file.oldPath = entry.oldPath;
      } 
      return file;
   });

}

