import type { ClassifiedFile } from '../types'; 
import { splitPath } from './fileClassifier';


export interface ScopeInference {
      scope?: string;
    reason?: string; 

}


const GENERIC_STEMS = new Set(['index','main', 'app', 'mod', 'lib', 'utils', 'util', 'helpers', 'common', 'types', 'constants', 'init', '__init__']);


const DOMINANCE  =  0.7;
 const MAX_SCOPE_LENGTH = 24;

export function sanitizeScope(raw: string): string | undefined {


    const cleaned = raw
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/, '')
        .replace(/[^a-z0-9._/-]+/g, '-')

        .replace(/^[-._/]+|[-._/]+$/g,  '')
        .slice(0, MAX_SCOPE_LENGTH)
        .replace(/[-._/]+$/g,'');
    return cleaned === '' ? undefined : cleaned;
}

function weight(file: ClassifiedFile): number {

     return Math.max(1, file.additions + file.deletions);
 } 

function stemOf(path: string): string {
    const { name } = splitPath(path);
    const dot=name.indexOf('.', 1);

    return dot > 0 ? name.slice(0,dot)  :  name;

}

function found(scope: string | undefined, reason: string): ScopeInference {
    return scope === undefined ? {} : { scope, reason };

}

export function inferScope(files: readonly ClassifiedFile[]): ScopeInference {
     if (files.length === 0) {
        return {};

    }


    const manifestNames = new Set(['package.json', 'cargo.toml', 'go.mod', 'pyproject.toml', 'requirements.txt', 'gemfile', 'pom.xml', 'composer.json']);
    if (files.every((f) => f.category === 'lockfile' || manifestNames.has(splitPath(f.path).name.toLowerCase())) && files.some((f) => f.category === 'lockfile')) {
        return { scope: 'deps',reason: 'Only dependency manifests and lockfiles changed' };

    }

    if (files.every((f) => f.category === 'ci')) {

        return { scope: 'ci', reason: 'Only CI workflow files changed' };


    }  

    if (files.every((f) => f.category === 'docs')) {
        const readmeOnly = files.every((f) => stemOf(f.path).toLowerCase() === 'readme');
        return readmeOnly ? { scope: 'readme',reason: 'Only the README changed' } : {};
     }


    const byArea  =  new Map<string, number>();
    let total = 0;
    for (const f of files) {
         total += weight(f);
        if (f.area !== '') {

             byArea.set(f.area, (byArea.get(f.area) ?? 0) + weight(f));
        }
      }
    const ranked = [...byArea.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0]; 
    if (top !== undefined && top[1] / total >= DOMINANCE) {


        return found(sanitizeScope(top[0]), `Most changes are under "${top[0]}/"`);
    }


    if (files.length === 1) {
        const only = files[0] as ClassifiedFile;
       const stem = stemOf(only.path);
        if (!GENERIC_STEMS.has(stem.toLowerCase()) && (only.category === 'source' || only.category === 'style' || only.category === 'test')) {
            const scoped = stem.replace(/\.(test|spec)$/i, '');
            return found(sanitizeScope(scoped),`The only changed file is ${splitPath(only.path).name}`);
        }  
    }


    const stems = new Set(files.filter((f) => f.category === 'source' || f.category === 'test').map((f) => stemOf(f.path).replace(/\.(test|spec)$/i, '').replace(/^test_/, '').replace(/_test$/,'').toLowerCase()));  
    if (stems.size === 1 && files.every((f) => f.category === 'source' || f.category === 'test')) {  
        const stem = [...stems][0] as string;
        if (!GENERIC_STEMS.has(stem)) {


            return found(sanitizeScope(stem), 'A source file and its test changed together');


        }
    }


    return {};
}

