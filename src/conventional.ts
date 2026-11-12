import { COMMIT_TYPES,isCommitType, type CommitType } from './types';


export interface ParsedHeader {


    type: string;
     scope?: string;  
    breaking: boolean;
    subject: string;


}

 export function formatHeader(type: CommitType,scope: string | undefined, subject: string,  breaking = false): string {
    const scopePart = scope !== undefined && scope !== '' ? `(${scope})` : ''; 
    return `${type}${scopePart}${breaking ? '!' : ''}: ${subject}`;

}

export function formatMessage(header: string, body?: string): string {
     const trimmed = body?.trim();

    return trimmed !== undefined && trimmed !== '' ? `${header}\n\n${trimmed}` : header;
}


export function headerOverhead(type: CommitType, scope: string | undefined, breaking: boolean): number {
    return type.length + (scope !== undefined && scope !== '' ? scope.length + 2:0) + (breaking ? 1 : 0) + 2;


}

const HEADER_RE = /^([a-zA-Z]+)(?:\(([^()\r\n]*)\))?(!)?: (.*)$/;


export function parseHeader(message: string): ParsedHeader | undefined {
      const firstLine = message.split(/\r?\n/, 1)[0] ?? '';  
     const match  =  HEADER_RE.exec(firstLine);
    if (match === null) { 
        return undefined;
     }
    const parsed: ParsedHeader = { type: match[1] as string, breaking: match[3] === '!', subject: match[4] as string };

    if (match[2] !== undefined && match[2] !== '') {

        parsed.scope = match[2];
    }
    return parsed;
} 


export function withType(message: string,type: CommitType): string {

    const lines = message.split(/\r?\n/);
   const first = lines[0] ?? '';
    const match=HEADER_RE.exec(first);
    if (match === null) {

        return `${type}: ${first.trim()}${lines.length > 1 ? '\n' + lines.slice(1).join('\n') : ''}`.trimEnd();
    } 
    const scope = match[2] !== undefined && match[2] !== '' ? `(${match[2]})` : '';
    lines[0] = `${type}${scope}${match[3] ?? ''}: ${match[4] as string}`;
    return lines.join('\n');
}

export interface ValidationIssue { 
   severity: 'error' | 'warning';
    message: string;
 }


export function validateMessage(message: string, maxHeaderLength = 72): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const lines = message.split(/\r?\n/);
      const header = lines[0] ?? '';


    if (header.trim() === '') {
        return [{ severity: 'error', message: 'The message is empty.' }];
    }

    const parsed = parseHeader(header);

    if (parsed === undefined) {

        issues.push({ severity: 'error', message: 'The first line should look like "type(scope): subject".' });
    } else {
        if (!isCommitType(parsed.type)) {

            issues.push({ severity: 'warning', message: `"${parsed.type}" is not one of: ${COMMIT_TYPES.join(', ')}.` });
        }
       if (parsed.subject.trim() === '') {
            issues.push({ severity: 'error', message: 'The subject after the colon is empty.' });
         } else {
            if (/[.]$/.test(parsed.subject.trim())) {

                issues.push({ severity: 'warning',message: 'Subject lines normally do not end with a period.' });
            }

            if (/^[A-Z]/.test(parsed.subject)) {
                issues.push({ severity: 'warning',  message: 'Subjects usually start with a lower-case verb.' });
            }


          }  
    }

    if (header.length > maxHeaderLength) {
        issues.push({ severity: 'warning', message: `The first line is ${header.length} characters; ${maxHeaderLength} or fewer is recommended.` });
    }
    if (lines.length > 1 && (lines[1] ?? '').trim() !== '') {
        issues.push({ severity: 'warning', message: 'Leave a blank line between the subject and the body.' });
    }
     return issues;

  }

