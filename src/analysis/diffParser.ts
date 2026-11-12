import type { DiffHunk, FileDiff } from '../types';


 const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/;

function stripPrefix(path: string): string {

  const trimmed = path.replace(/\t.*$/, '');
  if (trimmed.startsWith('a/') || trimmed.startsWith('b/')) {

    return trimmed.slice(2);


  }
  return trimmed; 
}


function pathFromHeader(header: string): string {
  const rest=header.slice('diff --git '.length);
  const half = (rest.length - 1) / 2;
  if (Number.isInteger(half) && rest.charAt(half) === ' ') {  
    const left = rest.slice(0, half);
    const right = rest.slice(half + 1);

    if (stripPrefix(left) === stripPrefix(right)) {
      return stripPrefix(right);
     }
  }
  const idx = rest.lastIndexOf(' b/');
  return idx >= 0 ? rest.slice(idx + 3) : rest;

}

export function parseUnifiedDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let hunk: DiffHunk | undefined;
  let inHeader = false;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) { 


      current  =  { path: pathFromHeader(line), hunks: [] };
      files.push(current);
     hunk = undefined;
      inHeader = true;
      continue;

    } 
    if (current === undefined) {

      continue;
    }
    if (inHeader) {
       if (line.startsWith('+++ ')) {
        const target = line.slice(4);
        if (target !== '/dev/null') {


          current.path = stripPrefix(target); 
        }
        continue;

      }
      if (line.startsWith('--- ')) {

        const source  =  line.slice(4);  
       if (source !== '/dev/null') {


          current.path = stripPrefix(source); 
        }
        continue;
      }
       if (line.startsWith('rename to ')) {
        current.path = line.slice('rename to '.length); 
          continue;
      }
      const match = HUNK_RE.exec(line);
       if (match === null) {
        continue;   
      }
      inHeader = false;
    }
    const m = HUNK_RE.exec(line);  

    if (m !== null) {
      hunk = {
         oldStart: Number(m[1]),
        newStart: Number(m[2]), 
        heading: (m[3] ?? '').trim(),
        added: [],
        removed: []

        };  

      current.hunks.push(hunk);
      continue; 
    }
    if (hunk === undefined) { 
      continue;
    }
    if (line.startsWith('+')) {

       hunk.added.push(line.slice(1));  

      } else if (line.startsWith('-')) {
       hunk.removed.push(line.slice(1));
    }

  }
  return files;
}


export function addedLinesOf(files: readonly FileDiff[]): string[] {

   return files.flatMap((f) => f.hunks.flatMap((h) => h.added));

}


 export function removedLinesOf(files: readonly FileDiff[]): string[] {

  return files.flatMap((f) => f.hunks.flatMap((h) => h.removed));
}

