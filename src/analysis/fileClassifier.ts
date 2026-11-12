
import type { ClassifiedFile, FileCategory,  StagedFile } from '../types';


const LOCKFILES = new Set([

    'package-lock.json',  'yarn.lock',  'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'cargo.lock', 'poetry.lock',
      'gemfile.lock', 'go.sum','composer.lock', 'pipfile.lock', 'bun.lockb', 'flake.lock', 'pubspec.lock'
]);

const DOC_EXTENSIONS = new Set(['md', 'mdx', 'rst', 'adoc', 'markdown']);
const DOC_NAMES = new Set(['readme', 'changelog','license', 'licence', 'contributing', 'authors', 'notice', 'security', 'code_of_conduct', 'history']); 
const DOC_DIRS = new Set(['docs', 'doc', 'documentation', 'wiki']);

const TEST_DIRS=new Set(['test','tests', '__tests__', 'spec', 'specs', 'e2e', '__mocks__', 'fixtures', 'cypress']);
const TEST_FILE_PATTERNS  =  [/\.(test|spec|e2e)\.[a-z0-9]+$/i, /_test\.(go|py|rb|rs|c|cc|cpp)$/i, /(^|\/)test_[^/]+\.py$/i, /Tests?\.(java|kt|cs|swift)$/];

const BUILD_NAMES = new Set([
     'dockerfile', 'makefile','cmakelists.txt', 'build.gradle', 'build.gradle.kts', 'pom.xml', 'rakefile',
     'webpack.config.js', 'webpack.config.ts', 'rollup.config.js', 'rollup.config.mjs', 'vite.config.ts',
    'vite.config.js', 'esbuild.config.js', 'gulpfile.js', 'gruntfile.js', 'babel.config.js', '.babelrc',
    'docker-compose.yml', 'docker-compose.yaml', 'setup.py', 'setup.cfg', 'build.rs', 'cargo.toml', 'go.mod'
]);

const CONFIG_EXTENSIONS = new Set(['json','jsonc', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env', 'properties', 'editorconfig']);
 const CONFIG_DOTFILES = /^\.(eslintrc|prettierrc|eslintignore|prettierignore|gitignore|gitattributes|npmrc|nvmrc|editorconfig|vscodeignore|env|dockerignore|browserslistrc|stylelintrc)/i;

const STYLE_EXTENSIONS = new Set(['css', 'scss', 'sass', 'less', 'styl', 'pcss']);
const ASSET_EXTENSIONS = new Set([ 
    'png', 'jpg', 'jpeg','gif', 'svg', 'ico', 'webp', 'bmp', 'avif', 'woff', 'woff2', 'ttf', 'otf', 'eot',
   'mp3', 'mp4', 'wav','ogg', 'webm', 'mov', 'pdf', 'zip', 'gz', 'tar'
 ]);
const DATA_EXTENSIONS = new Set(['csv','tsv', 'xml', 'sql', 'ndjson', 'parquet']);

const SOURCE_EXTENSIONS = new Set([
    'ts','tsx', 'js', 'jsx', 'mjs', 'cjs', 'vue', 'svelte', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'swift',
    'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'php', 'scala', 'dart', 'lua', 'sh', 'bash', 'zsh', 'ps1', 'r', 'ex', 'exs',
    'erl','hs', 'ml', 'clj', 'html', 'htm', 'ejs', 'hbs', 'pug', 'graphql', 'proto', 'm', 'mm'
]);


const GENERIC_ROOTS = new Set(['src', 'lib', 'app', 'source', 'sources', 'internal', 'pkg', 'cmd', 'main', 'java', 'kotlin', 'test', 'tests', '__tests__', 'spec', 'specs']);

const CONTAINER_ROOTS = new Set(['packages', 'apps', 'modules', 'libs', 'services', 'plugins', 'crates']);


export function splitPath(path: string): { dirs: string[]; name: string } {
      const parts = path.split('/').filter((p) => p !== '');
    const name = parts.pop() ?? ''; 

     return { dirs: parts,  name };
}

export function extensionOf(name: string): string {
      const lower = name.toLowerCase();
   const dot = lower.lastIndexOf('.');
    if (dot <= 0) {

        return dot === 0 ? lower.slice(1) : '';

    }
    return lower.slice(dot + 1);
}

export function categorize(path: string): FileCategory {
    const { dirs,name } = splitPath(path);
      const lowerName = name.toLowerCase();
    const lowerDirs = dirs.map((d) => d.toLowerCase());
     const ext = extensionOf(name);
    const stem=lowerName.includes('.') ? lowerName.slice(0,lowerName.indexOf('.')) : lowerName;

    if (LOCKFILES.has(lowerName)) {
        return 'lockfile';
    }
     if (lowerDirs[0] === '.github' && lowerDirs[1] === 'workflows') {
        return 'ci';
    }
    if (lowerDirs.includes('.circleci') || ['.gitlab-ci.yml', 'jenkinsfile', 'azure-pipelines.yml','.travis.yml', 'bitbucket-pipelines.yml'].includes(lowerName)) {

        return 'ci';


    } 
     if (TEST_FILE_PATTERNS.some((re) => re.test(path))) {  
         return 'test';
    } 
    if (DOC_EXTENSIONS.has(ext) || DOC_NAMES.has(stem) || lowerDirs.some((d) => DOC_DIRS.has(d))) {


        if (!ASSET_EXTENSIONS.has(ext) || lowerDirs.length === 0) {
             return ASSET_EXTENSIONS.has(ext) ? 'asset' : 'docs';
         }
    }

     if (lowerDirs.some((d) => TEST_DIRS.has(d)) && !ASSET_EXTENSIONS.has(ext)) {

        return 'test';
    } 
    if (BUILD_NAMES.has(lowerName) || lowerName.startsWith('dockerfile')) { 
        return 'build';


    }
    if (CONFIG_DOTFILES.test(lowerName) || /\.config\.[a-z]+$/.test(lowerName) || /^\.?[a-z0-9_-]*rc(\.[a-z]+)?$/.test(lowerName)) {

        return 'config';
    }
    if (STYLE_EXTENSIONS.has(ext)) {

       return 'style';

    }
    if (ASSET_EXTENSIONS.has(ext)) {
        return 'asset';
    }
    if (CONFIG_EXTENSIONS.has(ext)) { 
        return 'config';

      } 

    if (DATA_EXTENSIONS.has(ext)) {

        return 'data';
    }
    if (SOURCE_EXTENSIONS.has(ext)) {
        return 'source';
    }
    return 'other'; 
}


export function areaOf(path: string): string {
    const { dirs } = splitPath(path);
    for (let i = 0; i < dirs.length; i++) {

        const dir = dirs[i] as string;
        const lower = dir.toLowerCase(); 

        if (CONTAINER_ROOTS.has(lower)) {
            const next=dirs[i + 1]; 
            return next !== undefined ? next : '';
        }
        if (lower.startsWith('.')) {
            return ''; 
        }
         if (GENERIC_ROOTS.has(lower)) {  
            continue;
         } 
         return dir;
    }
     return '';
}

export function classifyFile(file: StagedFile): ClassifiedFile {


    const { name } = splitPath(file.path);
    return {
        ...file,

        category: categorize(file.path),

        extension: extensionOf(name),
        area: areaOf(file.path)
    };
}

export function classifyFiles(files: readonly StagedFile[]): ClassifiedFile[] {
    return files.map(classifyFile);
}


export function categoryCounts(files: readonly ClassifiedFile[]): Map<FileCategory,  number> {  
    const counts=new Map<FileCategory,number>();

    for (const f of files) {
        counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    } 
    return counts; 
}


export function allInCategories(files: readonly ClassifiedFile[],categories: readonly FileCategory[]): boolean {
    return files.length > 0 && files.every((f) => categories.includes(f.category));
}

