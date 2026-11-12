

export interface Settings {
   maxHeaderLength: number;
   includeScope: boolean;

   includeBody: boolean;
   showStatusBar: boolean;

   maxDiffSize: number;

   gitPath?: string;
} 

export const DEFAULT_SETTINGS: Readonly<Settings> = {
     maxHeaderLength: 72,
   includeScope: true,
   includeBody: false,
   showStatusBar: true,
   maxDiffSize: 200000
 };


export const LIMITS = {


   maxHeaderLength: { min: 30,  max: 120 },

    maxDiffSize: { min: 10000, max: 2000000 }  
} as const;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
   if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
   }
  return Math.min(max, Math.max(min, Math.round(value))); 
}

function bool(value: unknown,fallback: boolean): boolean {

   return typeof value === 'boolean' ? value : fallback;
}


export function pickGitPath(value: unknown): string | undefined {
   if (typeof value === 'string' && value.trim() !== '') {


      return value.trim();
   }
   if (Array.isArray(value)) {
      const first = value.find((v): v is string => typeof v === 'string' && v.trim() !== '');
      return first?.trim();
   }
   return undefined;
}


export function normalizeSettings(raw: Record<string,unknown>, gitPathRaw?: unknown): Settings {

   const settings: Settings  =  {

      maxHeaderLength: clampInt(raw.maxHeaderLength, LIMITS.maxHeaderLength.min, LIMITS.maxHeaderLength.max,DEFAULT_SETTINGS.maxHeaderLength), 
      includeScope: bool(raw.includeScope,  DEFAULT_SETTINGS.includeScope),
      includeBody: bool(raw.includeBody, DEFAULT_SETTINGS.includeBody),
      showStatusBar: bool(raw.showStatusBar, DEFAULT_SETTINGS.showStatusBar),
      maxDiffSize: clampInt(raw.maxDiffSize, LIMITS.maxDiffSize.min, LIMITS.maxDiffSize.max, DEFAULT_SETTINGS.maxDiffSize)

   };

   const gitPath = pickGitPath(gitPathRaw);
   if (gitPath !== undefined) {

       settings.gitPath = gitPath;

   }

   return settings;

}

