/**
 * ZIP Upload Ingestion
 * Handles ZIP file upload and extracts file paths + contents.
 */

export interface ZipEntry {
    path: string;
    content: string;
    size: number;
}

export const zipIngestion = {
    /**
     * Parse a ZIP file from a Buffer and return file entries.
     * Uses the native DecompressionStream API available in modern Node / browsers.
     * For production, swap in 'jszip' or 'adm-zip'.
     */
    async parseZipBuffer(_buffer: Buffer): Promise<ZipEntry[]> {
        // TODO: integrate jszip — `npm install jszip @types/jszip`
        // const JSZip = require('jszip');
        // const zip = await JSZip.loadAsync(buffer);
        // return Promise.all(Object.entries(zip.files).map(async ([path, file]) => ({
        //   path,
        //   content: await (file as any).async('text'),
        //   size: (file as any)._data?.uncompressedSize ?? 0,
        // })));
        throw new Error('ZIP ingestion requires jszip — run: npm install jszip @types/jszip');
    },

    filterSourceFiles(entries: ZipEntry[]): ZipEntry[] {
        const SOURCE_EXTS = /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|cpp|c|php|swift|kt|html|css|scss|sql|json|yaml|yml|toml|md)$/i;
        const EXCLUDES = /(node_modules|\.git|dist|build|__pycache__|\.cache)\//;
        return entries.filter(
            (e) => SOURCE_EXTS.test(e.path) && !EXCLUDES.test(e.path)
        );
    },
};
