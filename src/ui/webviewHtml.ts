import { randomBytes } from 'node:crypto'; 
  import { COMMIT_TYPE_LABELS, COMMIT_TYPES,type CommitType } from '../types';
import { errorHelp } from './errorHelp';
import type { ErrorState, PanelFile, PanelState, ReadyState } from './protocol';  


export function escapeHtml(value: string): string {
     return value.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

}

const MAX_LISTED_FILES = 40;

  const STATUS_BADGE: Record<string, { letter: string; label: string }> = {

    added: { letter: 'A', label: 'Added' },

    modified: { letter: 'M',label: 'Modified' },
    deleted: { letter: 'D', label: 'Deleted' },

     renamed: { letter: 'R', label: 'Renamed' },  
   copied: { letter: 'C', label: 'Copied' },
   typechange: { letter: 'T', label: 'Type changed' }, 
    unmerged: { letter: 'U', label: 'Unmerged' },  
     unknown: { letter: '?',label: 'Unknown' }
};

const STYLE=`
:root{--bg:var(--vscode-sideBar-background,var(--vscode-editor-background,#1e1e1e));--fg:var(--vscode-foreground,#cccccc);--muted:var(--vscode-descriptionForeground,#9d9d9d);
--border:var(--vscode-panel-border,#3c3c3c);--input-bg:var(--vscode-input-background,#2a2a2a);--input-fg:var(--vscode-input-foreground,#e6e6e6);
--accent:var(--vscode-button-background,#0e639c);--accent-fg:var(--vscode-button-foreground,#ffffff);--accent-hover:var(--vscode-button-hoverBackground,#1177bb);
--sec-bg:var(--vscode-button-secondaryBackground,#3a3d41);--sec-fg:var(--vscode-button-secondaryForeground,#ffffff);
--ok:var(--vscode-testing-iconPassed,#73c991);--warn:var(--vscode-editorWarning-foreground,#cca700);--err:var(--vscode-errorForeground,#f48771);
--mono:var(--vscode-editor-font-family,Menlo,Consolas,monospace)}
*{box-sizing:border-box}body{margin:0;padding:14px 16px 20px;background:var(--bg);color:var(--fg);font:13px/1.45 var(--vscode-font-family,-apple-system,'Segoe UI',sans-serif)}
h1{font-size:13px;margin:0 0 2px;font-weight:600}h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:18px 0 6px;font-weight:600}
.sub{color:var(--muted);font-size:12px;margin:0 0 12px}.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer}
.chip:hover{border-color:var(--accent)}.chip.on{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}
.chip.alt{border-style:dashed}.chip .star{opacity:.8;margin-left:4px}
textarea{width:100%;min-height:92px;resize:vertical;padding:8px 10px;border-radius:4px;border:1px solid var(--border);background:var(--input-bg);color:var(--input-fg);font:13px/1.5 var(--mono)}
textarea:focus{outline:1px solid var(--accent);border-color:var(--accent)}
.meta{display:flex;justify-content:space-between;color:var(--muted);font-size:11.5px;margin-top:4px}.over{color:var(--warn)}
button.btn{font:inherit;padding:5px 14px;border:0;border-radius:3px;background:var(--accent);color:var(--accent-fg);cursor:pointer}
button.btn:hover{background:var(--accent-hover)}button.btn.sec{background:var(--sec-bg);color:var(--sec-fg)}
.issues{list-style:none;padding:0;margin:8px 0 0}.issues li{font-size:12px;padding:2px 0}.issues .error{color:var(--err)}.issues .warning{color:var(--warn)}
.conf{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}.bar{flex:0 0 110px;height:6px;border-radius:3px;background:var(--border);overflow:hidden}
.bar>i{display:block;height:100%;background:var(--ok)}.bar.mid>i{background:var(--warn)}.bar.low>i{background:var(--err)}
label.opt{display:flex;gap:6px;align-items:center;font-size:12px;margin-right:14px;cursor:pointer}
details{margin-top:12px;border:1px solid var(--border);border-radius:4px;padding:6px 10px}summary{cursor:pointer;font-size:12px;color:var(--muted)}
details ul{margin:6px 0 2px;padding-left:18px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}td{padding:2px 4px;vertical-align:top}td.p{word-break:break-all;font-family:var(--mono)}td.n{white-space:nowrap;text-align:right;font-family:var(--mono)}
.add{color:var(--ok)}.del{color:var(--err)}.badge{display:inline-block;width:18px;text-align:center;border-radius:3px;font-size:10.5px;font-weight:700;border:1px solid var(--border)}
.b-added{color:var(--ok)}.b-deleted{color:var(--err)}.b-renamed,.b-modified{color:var(--warn)}
.foot{margin-top:18px;color:var(--muted);font-size:11.5px;border-top:1px solid var(--border);padding-top:10px}.flash{color:var(--ok);font-size:12px;min-height:16px}
.skeleton{color:var(--muted);padding:24px 0}.notice{border:1px solid var(--border);border-left-width:4px;border-radius:4px;padding:10px 12px;margin:14px 0}.notice.problem{border-left-color:var(--err)}.notice.info{border-left-color:var(--accent)}.notice p{margin:6px 0;color:var(--muted)}.notice ol{margin:6px 0 0;padding-left:18px}.notice li{margin:3px 0}
`;


const SCRIPT = `
(function(){
  var api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage: function(){} };
  var box = document.getElementById('msg');
  var counter = document.getElementById('counter');
  var issuesEl = document.getElementById('issues');
  var flash = document.getElementById('flash');
  var max = Number(box.getAttribute('data-max')) || 72;
  function post(m){ api.postMessage(m); }
  function updateCounter(){
    var len = (box.value.split(/\\r?\\n/)[0] || '').length;
    counter.textContent = 'First line: ' + len + ' / ' + max;
    counter.className = len > max ? 'over' : '';
  }
  function setActive(type){
    document.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-type') === type); });
  }
  function showIssues(list){
    issuesEl.textContent = '';
    list.forEach(function(i){ var li = document.createElement('li'); li.className = i.severity; li.textContent = (i.severity === 'error' ? '\\u2716 ' : '\\u26A0 ') + i.message; issuesEl.appendChild(li); });
  }
  box.addEventListener('input', function(){ updateCounter(); post({ command: 'edit', text: box.value }); });
  document.querySelectorAll('.chip').forEach(function(c){
    c.addEventListener('click', function(){ post({ command: 'retype', type: c.getAttribute('data-type'), text: box.value }); });
  });
  document.getElementById('copy').addEventListener('click', function(){ post({ command: 'copy', text: box.value }); });
  document.getElementById('refresh').addEventListener('click', function(){ post({ command: 'refresh' }); });
  document.querySelectorAll('input[data-option]').forEach(function(i){
    i.addEventListener('change', function(){ post({ command: 'option', name: i.getAttribute('data-option'), value: i.checked }); });
  });
  window.addEventListener('message', function(e){
    var m = e.data || {};
    if (m.command === 'validation') { showIssues(m.issues || []); }
    if (m.command === 'setMessage') { box.value = m.text; setActive(m.type); updateCounter(); post({ command: 'edit', text: box.value }); }
    if (m.command === 'copied') { flash.textContent = 'Copied. Paste it into the Source Control message box.'; setTimeout(function(){ flash.textContent = ''; }, 3500); }
  });
  updateCounter();
  post({ command: 'ready' });
})();
`;

const ERROR_SCRIPT=`
(function(){
  var api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage: function(){} };
  document.getElementById('refresh').addEventListener('click', function(){ api.postMessage({ command: 'refresh' }); });
})();
`;

function chips(state: ReadyState): string {  

    return COMMIT_TYPES.map((type: CommitType) => {  
        const isSuggested = type === state.type;
        const isAlt = state.alternatives.includes(type);
        const cls = ['chip', isSuggested ? 'on' : '', isAlt ? 'alt' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-type="${type}" title="${escapeHtml(COMMIT_TYPE_LABELS[type])}">${type}${isSuggested ? '<span class="star">★</span>' : ''}</button>`;
    }).join('');

} 

function confidenceBar(confidence: number): string {
    const pct=Math.round(confidence * 100); 
    const cls = pct >= 65 ? '' : pct >= 40 ? ' mid':' low';
   return `<div class="conf"><span>Confidence</span><span class="bar${cls}"><i style="width:${pct}%"></i></span><span>${pct}%</span></div>`;

}


function fileRow(file: PanelFile): string {

    const badge = STATUS_BADGE[file.status] ?? STATUS_BADGE.unknown;
    const name = file.status === 'renamed' && file.oldPath !== undefined ? `${file.oldPath} → ${file.path}`:file.path;
    const stats = file.binary ? '<span>binary</span>' : `<span class="add">+${file.additions}</span> <span class="del">-${file.deletions}</span>`;
    return `<tr><td><span class="badge b-${file.status}" title="${badge?.label ?? ''}">${badge?.letter ?? '?'}</span></td><td class="p">${escapeHtml(name)}</td><td class="n">${stats}</td></tr>`;
}  

function fileTable(state: ReadyState): string {

    const shown = state.files.slice(0, MAX_LISTED_FILES).map(fileRow).join('');
    const extra = state.files.length - MAX_LISTED_FILES;
    const more = extra > 0 ? `<tr><td></td><td class="p">…and ${extra} more files</td><td></td></tr>` : ''; 
    return `<table>${shown}${more}</table>`; 
}

function renderReady(state: ReadyState): string {
    const reasons = state.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('');  
    return `
<h1>Suggested commit message</h1>
<p class="sub">${escapeHtml(state.repoName)} · ${state.files.length} staged ${state.files.length === 1 ? 'file' : 'files'} · <span class="add">+${state.totalAdditions}</span> <span class="del">-${state.totalDeletions}</span></p>
${confidenceBar(state.confidence)}
<h2>Type</h2>
<div class="chips" role="group" aria-label="Commit type">${chips(state)}</div>
<h2>Message</h2>
<textarea id="msg" spellcheck="false" aria-label="Commit message" data-max="${state.maxHeaderLength}">${escapeHtml(state.message)}</textarea>
<div class="meta"><span id="counter"></span><span id="flash" class="flash" role="status"></span></div>
<ul class="issues" id="issues" aria-live="polite"></ul>
<div class="row" style="margin-top:10px"><button class="btn" id="copy" type="button">Copy message</button><button class="btn sec" id="refresh" type="button">Refresh</button></div>
<div class="row" style="margin-top:12px">
<label class="opt"><input type="checkbox" data-option="includeScope" ${state.options.includeScope ? 'checked' : ''}> Include scope</label>
<label class="opt"><input type="checkbox" data-option="includeBody" ${state.options.includeBody ? 'checked' : ''}> Include file list as body</label></div>
<details><summary>Why this suggestion?</summary><ul>${reasons}</ul></details>
<h2>Staged files</h2>
${fileTable(state)}
<p class="foot">Read-only helper: it never commits, stages files or changes your history. Copy the message and paste it into the Source Control box.</p>`;
}

function renderError(state: ErrorState): string {
      const help = errorHelp(state.code); 

    const steps=help.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
      return `<h1>Better Commit Message</h1> 
<div class="notice ${help.tone}" role="${help.tone === 'problem' ? 'alert' : 'status'}"><strong>${escapeHtml(help.title)}</strong><p>${escapeHtml(state.message)}</p><ol>${steps}</ol></div>
<div class="row"><button class="btn" id="refresh" type="button">Refresh</button></div>
<p class="foot">Read-only helper: it never commits, stages files or changes your history.</p>`;
}


function renderBody(state: PanelState): string {
    switch (state.kind) { 
        case 'loading':
            return '<h1>Better Commit Message</h1><p class="skeleton">Reading staged changes…</p>';
       case 'error': 
            return renderError(state);
         case 'ready':
            return renderReady(state);

    }  

}

 export function renderPanelHtml(state: PanelState,  nonce: string, cspSource: string): string { 
    const csp = `default-src 'none'; style-src 'nonce-${nonce}' ${cspSource}; script-src 'nonce-${nonce}';`;
    const script = state.kind === 'ready' ? `<script nonce="${nonce}">${SCRIPT}</script>` : state.kind === 'error' ? `<script nonce="${nonce}">${ERROR_SCRIPT}</script>` : '';
   return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Better Commit Message</title>
<style nonce="${nonce}">${STYLE}</style></head><body>${renderBody(state)}${script}</body></html>`;
}

  export function makeNonce(): string {

    return randomBytes(16).toString('base64');
}

