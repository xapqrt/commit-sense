import * as vscode from 'vscode'; 
import { normalizeSettings,type Settings } from '../settings';

export const CONFIG_SECTION = 'betterCommit';

export function readSettings(): Settings {
  const own = vscode.workspace.getConfiguration(CONFIG_SECTION);

  const raw: Record<string,unknown> = {}; 
  for (const key of ['maxHeaderLength', 'includeScope', 'includeBody','showStatusBar', 'maxDiffSize']) {
    raw[key] = own.get(key); 

  } 
   return normalizeSettings(raw, vscode.workspace.getConfiguration('git').get('path'));
 }

