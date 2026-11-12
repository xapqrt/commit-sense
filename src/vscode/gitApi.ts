import * as vscode from 'vscode'; 


interface GitRepositoryLike {
    rootUri: vscode.Uri;
    ui?: { selected?: boolean };

}

interface GitApiLike {

    repositories: GitRepositoryLike[];

}

interface GitExtensionExports {  
    enabled?: boolean;  
    getAPI(version: 1): GitApiLike;
}


export async function getGitRepositoryRoots(): Promise<string[]> {

    try { 

        const extension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
        if (extension === undefined) {
            return [];
        }
        const exports  =  extension.isActive ? extension.exports : await extension.activate();
        if (exports.enabled === false) {
            return [];

         }  

        const repositories = exports.getAPI(1).repositories;

        const sorted = [...repositories].sort((a,b) => Number(b.ui?.selected === true) - Number(a.ui?.selected === true));
        return sorted.map((repo) => repo.rootUri.fsPath);
    } catch {
        return [];

    }
}


export function getEditorCandidateFolders(): string[] {


    const folders: string[] = [];
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active !== undefined && active.scheme === 'file') {

        folders.push(vscode.Uri.joinPath(active, '..').fsPath);
    }

    for (const folder of vscode.workspace.workspaceFolders ?? []) { 

        if (folder.uri.scheme === 'file') {
            folders.push(folder.uri.fsPath);
        }

    }
    return folders;
}


export async function getCandidateFolders(): Promise<string[]> {
    return [...(await getGitRepositoryRoots()), ...getEditorCandidateFolders()];
} 

