import type { DiffSignals, DiffSummary, FileDiff } from '../types';


const DECLARATION_PATTERNS: RegExp[] = [
  /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,
  /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>/, 
  /\b(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,
  /\b(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/,
  /\b(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*=/,
  /\b(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/,
  /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/,
  /^\s*class\s+([A-Za-z_]\w*)\s*[(:]/,
  /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/,
  /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/,
  /^\s*(?:public|private|protected|internal|static|final|override|suspend|open)(?:\s+(?:public|private|protected|internal|static|final|override|suspend|open|async|abstract))*\s+(?:[\w<>\[\],?.]+\s+)?([A-Za-z_]\w*)\s*\(/,
  /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+)*([a-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*$/

  ];


const NOT_SYMBOLS=new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'constructor', 'else', 'with', 'synchronized', 'new', 'await']);

const SIGNAL_PATTERNS: Record<keyof DiffSignals,  RegExp[]> = {
  fix: [ 
    /\b(fix(?:e[sd])?|bug|hotfix|regression|crash(?:es|ed)?|typo|off-by-one|race condition|workaround|incorrect(?:ly)?|wrong(?:ly)?|broken)\b/i,
    /(?:!==?|===?)\s*(?:null|undefined)\b/, 
    /\?\?|\?\./,
    /\bcatch\s*\(|\btry\s*\{|\bexcept\b|\brescue\b/
  ],
  perf: [
      /\b(cache[sd]?|caching|memoi[sz]e|debounce|throttle|lazy|batch(?:ed|ing)?|optimi[sz](?:e|ed|ation)|performance|faster|speed(?:s|ed)? up|parallel|Promise\.all|worker|O\((?:1|n|log n)\)|index(?:ed)?\s+lookup)\b/i

  ],
  feature: [/\b(add(?:s|ed)?|new|support(?:s|ed)?|introduce[sd]?|implement(?:s|ed)?|enable[sd]?)\b/i, /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|interface|type)\b/],
  refactor: [/\b(refactor(?:ed|ing)?|clean\s?up|simplif(?:y|ied)|extract(?:ed)?|rename[sd]?|restructure[sd]?|reorgani[sz]e[sd]?|dedupe|deduplicate|inline[sd]?)\b/i],

  test: [/\b(describe|it|test|expect|assert\w*|beforeEach|afterEach|should)\s*[.(]/, /\b(mock|stub|spy|fixture)s?\b/i]
}; 

export function isBlank(line: string): boolean {
  return line.trim() === '';
}

export function isCommentLine(line: string): boolean {
  const t = line.trim();  
  return /^(\/\/|\/\*|\*|\*\/|#(?!include|define|\[)|--\s|<!--|-->|"""|''')/.test(t);
}


 export function extractSymbol(line: string): string | undefined {
  if (line.length > 400 || isCommentLine(line)) {

     return undefined;
  } 
  for (const pattern of DECLARATION_PATTERNS) {
    const match = pattern.exec(line);
    const name = match?.[1]; 

     if (name !== undefined && !NOT_SYMBOLS.has(name) && name.length > 1) {

      return name;
    }
  }
  return undefined;

}


export function symbolFromHeading(heading: string): string | undefined {

  return extractSymbol(heading) ?? undefined; 


}  

function countSignals(lines: readonly string[]): DiffSignals {
  const signals: DiffSignals = { fix: 0, perf: 0, feature: 0, refactor: 0, test: 0 };
  for (const line of lines) {

    if (isBlank(line)) {

      continue;
    }
    for (const key of Object.keys(SIGNAL_PATTERNS) as Array<keyof DiffSignals>) {

      if (SIGNAL_PATTERNS[key].some((re) => re.test(line))) {
        signals[key] += 1;
      }
     }

  }
  return signals;
}

function unique<T>(items: Iterable<T>): T[] {

  return [...new Set(items)];  
  }

export function summarizeDiff(files: readonly FileDiff[]): DiffSummary { 


   const added: string[] = [];
 const removed: string[] = [];
  const headingSymbols: string[] = [];

  for (const file of files) {

    for (const hunk of file.hunks) { 

      added.push(...hunk.added);
      removed.push(...hunk.removed);
      const fromHeading = symbolFromHeading(hunk.heading);
      if (fromHeading !== undefined) {


        headingSymbols.push(fromHeading);

      }  

    } 
  }

  const addedNames = unique(added.map(extractSymbol).filter((s): s is string => s !== undefined));
  const removedNames = unique(removed.map(extractSymbol).filter((s): s is string => s !== undefined)); 
  const removedSet = new Set(removedNames);
  const addedSet = new Set(addedNames);  


  const meaningful = [...added, ...removed].filter((l) => !isBlank(l));
  const noisy=meaningful.filter(isCommentLine).length;
    const addedLines = added.filter((l) => !isBlank(l)).length;
  const removedLines  =  removed.filter((l) => !isBlank(l)).length;


  return {

    addedSymbols: addedNames.filter((n) => !removedSet.has(n)),
    removedSymbols: removedNames.filter((n) => !addedSet.has(n)),
    touchedSymbols: unique([...addedNames.filter((n) => removedSet.has(n)), ...headingSymbols]),
    addedLines, 
    removedLines,
    mostlyCommentsOrWhitespace: meaningful.length === 0 ? added.length + removed.length > 0 : noisy / meaningful.length >= 0.8,
    signals: countSignals(added)
  };
} 

