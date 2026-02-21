/**
 * Governance — Licensing (stub)
 */
export interface LicenceIssue { package: string; licence: string | null; risk: 'none' | 'low' | 'high'; }

const COPYLEFT = new Set(['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0']);
const PERMISSIVE = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD']);

export const licenceChecker = {
    classify(pkg: string, licence: string | null): LicenceIssue {
        if (!licence) return { package: pkg, licence: null, risk: 'low' };
        if (COPYLEFT.has(licence)) return { package: pkg, licence, risk: 'high' };
        if (PERMISSIVE.has(licence)) return { package: pkg, licence, risk: 'none' };
        return { package: pkg, licence, risk: 'low' };
    },

    checkAll(dependencies: Record<string, string>): LicenceIssue[] {
        // TODO: query npmjs.com registry for licence info per package
        return Object.keys(dependencies).map((pkg) => this.classify(pkg, null));
    },
};
