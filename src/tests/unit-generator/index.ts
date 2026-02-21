/**
 * Test Intelligence — Unit Test Generator
 * Generates unit test scaffolding from AST function metadata.
 */
import type { ASTFunction } from '@/mapper/ast';

export interface TestSuggestion {
    functionName: string;
    file: string;
    testCode: string;
    testType: 'unit' | 'integration' | 'edge';
    description: string;
}

export const unitTestGenerator = {
    generateForFunction(fn: ASTFunction, sourceFile: string): TestSuggestion {
        const params = fn.parameters.map((p, i) => `param${i + 1}`).join(', ');
        const testCode = `
describe('${fn.name}', () => {
  it('should handle normal input', () => {
    // Arrange
    ${fn.parameters.map((p, i) => `const ${p || `param${i + 1}`} = undefined; // TODO: provide value`).join('\n    ')}
    
    // Act
    const result = ${fn.name}(${params});
    
    // Assert
    expect(result).toBeDefined();
  });

  it('should handle edge case: null/undefined inputs', () => {
    expect(() => ${fn.name}(${fn.parameters.map(() => 'null').join(', ')})).not.toThrow();
  });
});`.trim();

        return {
            functionName: fn.name,
            file: sourceFile,
            testCode,
            testType: 'unit',
            description: `Unit tests for ${fn.name} (${fn.parameters.length} parameter${fn.parameters.length !== 1 ? 's' : ''})`,
        };
    },

    generateForFile(functions: ASTFunction[], sourceFile: string): TestSuggestion[] {
        return functions
            .filter((fn) => fn.isExported)
            .map((fn) => this.generateForFunction(fn, sourceFile));
    },
};
