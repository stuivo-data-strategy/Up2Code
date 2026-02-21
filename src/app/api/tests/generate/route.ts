import { NextResponse } from 'next/server';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export async function POST(req: Request) {
    try {
        const { file, content } = await req.json();

        if (!file || !content) {
            return NextResponse.json({ error: 'file and content are required' }, { status: 400 });
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const suggestions: Array<{
            id: number;
            functionName: string;
            file: string;
            type: 'unit' | 'integration';
            line: number;
            description: string;
            code: string;
            accepted: boolean;
        }> = [];
        let idCounter = 1;

        const addSuggestion = (name: string, line: number, type: 'unit' | 'integration' = 'unit') => {
            const isReactComponent = name.charAt(0) === name.charAt(0).toUpperCase() && content.includes('react');

            let description = `Unit tests for ${name} — validates core logic and edge cases.`;
            const fileName = file.split('/').pop()?.replace(/\.[^/.]+$/, '');
            let code = `import { ${name} } from './${fileName}';

describe('${name}', () => {
  it('should execute successfully with valid inputs', () => {
    // TODO: Setup mock data
    const result = ${name}(/* args */);
    expect(result).toBeDefined();
  });

  it('should handle invalid or missing inputs gracefully', () => {
    // TODO: Test error boundaries
    expect(() => ${name}(/* invalid args */)).toThrow();
  });
});`;

            if (isReactComponent) {
                description = `Component tests for ${name} — validates rendering and user interactions.`;
                code = `import { render, screen } from '@testing-library/react';
import ${name} from './${fileName}';

describe('${name}', () => {
  it('should render successfully', () => {
    render(<${name} />);
    expect(screen.getByRole('main')).toBeInTheDocument(); // Update selector
  });
});`;
            }

            suggestions.push({
                id: idCounter++,
                functionName: name,
                file: file,
                type: isReactComponent ? 'integration' : type,
                line: line,
                description: description,
                code: code,
                accepted: false,
            });
        };

        traverse(ast, {
            ExportNamedDeclaration(path) {
                if (path.node.declaration) {
                    if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
                        addSuggestion(path.node.declaration.id.name, path.node.declaration.loc?.start.line || 0);
                    } else if (path.node.declaration.type === 'VariableDeclaration') {
                        path.node.declaration.declarations.forEach(decl => {
                            if (decl.id.type === 'Identifier') {
                                if (decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')) {
                                    addSuggestion(decl.id.name, decl.loc?.start.line || 0);
                                }
                            }
                        });
                    }
                }
            },
            ExportDefaultDeclaration(path) {
                if (path.node.declaration) {
                    if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
                        addSuggestion(path.node.declaration.id.name, path.node.declaration.loc?.start.line || 0);
                    } else if (path.node.declaration.type === 'Identifier') {
                        addSuggestion(path.node.declaration.name, path.node.declaration.loc?.start.line || 0);
                    }
                }
            }
        });

        // Optionally, find top level functions even if not exported (for internal testing suggestions)
        // Leaving this out for now to focus on pure public API testing

        return NextResponse.json({ suggestions });

    } catch (err) {
        console.error('Failed to generate tests:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
