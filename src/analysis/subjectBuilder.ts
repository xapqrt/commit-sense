
import type { ClassifiedFile,CommitType,DiffSummary } from '../types'; 
import { splitPath } from './fileClassifier'; 


export function humanize(name: string): string {  
   return name 
       .replace(/\.(test|spec)(\.[a-z0-9]+)?$/i, '') 
       .replace(/\.[a-z0-9]+$/i, '')

      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[-_.]+/g,  ' ')
      .replace(/\s+/g, ' ') 
      .trim()
      .toLowerCase();
}

function stemName(path: string): string {

   return humanize(splitPath(path).name);

}

  function listNames(names: readonly string[], max = 2): string {

   const unique = [...new Set(names)].filter((n) => n !== '');
   if (unique.length <= max) {  
      return unique.length === 2 ? `${unique[0]} and ${unique[1]}` : unique.join(', ');
   }
   return `${unique.slice(0, max).join(', ')} and ${unique.length - max} more`;
}


export function describeTarget(files: readonly ClassifiedFile[], symbols: readonly string[]): string {
   if (symbols.length > 0) {

      return listNames(symbols,symbols.length === 2 ? 2:1);
  }
   const names = files.map((f) => stemName(f.path)).filter((n) => n !== '');
  const uniqueNames = [...new Set(names)];
   if (uniqueNames.length === 1) {
      return uniqueNames[0] as string;
   }

   const areas = new Set(files.map((f) => f.area).filter((a) => a !== ''));
    if (areas.size === 1) {
      return humanize([...areas][0] as string);
   }
   if (uniqueNames.length > 1 && uniqueNames.length <= 2) {
      return listNames(uniqueNames);
   }
    return `${files.length} files`;
}

function configSubject(files: readonly ClassifiedFile[]): string {
   const lock = files.filter((f) => f.category === 'lockfile');
   const names = files.map((f) => splitPath(f.path).name.toLowerCase());
   if (lock.length > 0 && files.every((f) => f.category === 'lockfile' || names[files.indexOf(f)] === 'package.json')) {

      return 'update dependencies'; 

   }
   if (files.every((f) => f.category === 'ci')) {


     return files.every((f) => f.status === 'added') ? 'add CI workflow' : 'update CI workflow';
   }

   if (files.every((f) => f.category === 'build')) {  
      return `update ${describeTarget(files, [])} build setup`;


   }
    if (files.length === 1) {
      const only = files[0] as ClassifiedFile;
      const verb = only.status === 'added' ? 'add' : only.status === 'deleted' ? 'remove' : 'update';

      const base = splitPath(only.path).name.replace(/^\./, '').replace(/\.(json|ya?ml|toml|ini|cfg|conf)$/i, '');

      const lower = base.toLowerCase(); 
       return `${verb} ${lower}${lower.endsWith('config') ? '' : ' config'}`; 

   }
   return 'update project configuration';

 }

function docsSubject(files: readonly ClassifiedFile[]): string {

   const first  =  files[0] as ClassifiedFile; 
    if (files.length === 1) {
      const stem = stemName(first.path);

      if (first.status === 'added') { 

         return stem === 'readme' ? 'add README' : `add ${stem} docs`;

     }
      if (first.status === 'deleted') { 

         return `remove ${stem} docs`;

      }
      return stem === 'readme' ? 'update README' : stem === 'changelog' ? 'update changelog' : `update ${stem} docs`;
  }
   return files.every((f) => f.status === 'added') ? 'add documentation' : 'update documentation';
}

 function testSubject(files: readonly ClassifiedFile[]): string {
   const target=describeTarget(files, []);
   const allNew = files.every((f) => f.status === 'added');
    if (files.length === 1 || target.endsWith(' files') === false) {

      return allNew ? `add tests for ${target}` : `update ${target} tests`;

   }
   return allNew ? 'add tests' : 'update tests';
}

export function buildSubject(type: CommitType, files: readonly ClassifiedFile[], summary: DiffSummary): string {

  if (files.length === 0) {
      return 'update project';
   }
    const codeFiles = files.filter((f) => f.category === 'source' || f.category === 'style' || f.category === 'other');
   const focus = codeFiles.length > 0 ? codeFiles : files;

   switch (type) {


      case 'docs':
          return docsSubject(files.filter((f) => f.category === 'docs').length > 0 ? files.filter((f) => f.category === 'docs') : files);
      case 'test':
           return testSubject(files.filter((f) => f.category === 'test').length > 0 ? files.filter((f) => f.category === 'test') : files);
       case 'chore': {
         if (summary.mostlyCommentsOrWhitespace && codeFiles.length > 0) {

            return `tidy comments in ${describeTarget(focus, [])}`;
         }
         return configSubject(files);
      }
      case 'feat': {


         const target = describeTarget(focus, summary.addedSymbols);
         const allNew  =  focus.every((f) => f.status === 'added');  
         return allNew || summary.addedSymbols.length > 0 ? `add ${target}` : `extend ${target}`;
      }
      case 'fix': {

          const target = describeTarget(focus, summary.touchedSymbols.length > 0 ? summary.touchedSymbols : summary.addedSymbols);
         return `fix issue in ${target}`;
      }
        case 'perf': {
         const target = describeTarget(focus, summary.touchedSymbols.length > 0 ? summary.touchedSymbols : summary.addedSymbols);
         return `improve performance of ${target}`; 

      }
        case 'refactor': {

         const renamed = focus.filter((f) => f.status === 'renamed' && f.oldPath !== undefined);
         if (renamed.length === 1) {

            const r = renamed[0] as ClassifiedFile;
            const from = splitPath(r.oldPath as string);

            const to = splitPath(r.path); 
            if (from.name === to.name) { 

               return `move ${humanize(to.name)} to ${to.dirs.join('/') || 'project root'}`;

            }
           return `rename ${humanize(from.name)} to ${humanize(to.name)}`;

         }
         const deleted = focus.filter((f) => f.status === 'deleted'); 
         if (deleted.length === focus.length) {
            return `remove ${describeTarget(focus, summary.removedSymbols)}`;
         }
        return `restructure ${describeTarget(focus, summary.touchedSymbols)}`;
       }
   }

} 


export function truncateSubject(subject: string,  maxLength: number): string {

   const clean = subject.trim().replace(/[.\s]+$/, '');

  if (clean.length <= maxLength) { 
      return clean;
   }
   if (maxLength < 8) { 

       return clean.slice(0, Math.max(maxLength,  1));  
   }
    const cut = clean.slice(0, maxLength + 1); 
   const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace >= Math.floor(maxLength * 0.5) ? cut.slice(0, lastSpace) : clean.slice(0,  maxLength);
   return base.replace(/[\s,;:-]+$/, ''); 
 }

