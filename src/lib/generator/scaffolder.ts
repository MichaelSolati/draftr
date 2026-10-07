import {type ArchitectureProject} from '../../types/spec';

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export function generateProjectFiles(
  project: ArchitectureProject
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // 1. Generate Services / Classes
  for (const cls of project.classes) {
    const lines: string[] = [
      `// Auto-generated architecture stub: ${cls.name}`,
      `export ${cls.kind} ${cls.name} {`,
    ];

    for (const prop of cls.properties) {
      lines.push(`  ${prop.visibility} ${prop.name}: ${prop.type};`);
    }

    if (cls.properties.length > 0 && cls.methods.length > 0) {
      lines.push('');
    }

    for (const meth of cls.methods) {
      const params = meth.parameters
        .map(p => `${p.name}: ${p.type}`)
        .join(', ');
      lines.push(
        `  ${meth.visibility} ${meth.name}(${params}): ${meth.returnType} {`
      );
      if (meth.calls && meth.calls.length > 0) {
        for (const call of meth.calls) {
          lines.push(
            `    // Invokes ${call.targetClass}.${call.targetMethod}()`
          );
        }
      }
      lines.push(
        `    throw new Error('Method ${meth.name} not implemented.');`
      );
      lines.push('  }');
      lines.push('');
    }

    lines.push('}');
    files.push({
      path: `src/services/${cls.name}.ts`,
      content: lines.join('\n'),
      language: 'typescript',
    });
  }

  // 2. Generate UI Components
  for (const ui of project.uiComponents) {
    const boundImports = ui.boundLogicEntities
      .map(b => `// Binds to ${b}`)
      .join('\n');

    const content = `import React from 'react';
${boundImports}

export interface ${ui.name}Props {
  className?: string;
}

export const ${ui.name}: React.FC<${ui.name}Props> = ({ className }) => {
  return (
    <div className={className}>
      <h2>${ui.name} Component</h2>
      {/* Child components and bound logic */}
    </div>
  );
};
`;
    files.push({
      path: `src/components/${ui.name}.tsx`,
      content,
      language: 'typescript',
    });
  }

  // 3. Generate Prisma Schema if tables exist
  if (project.tables && project.tables.length > 0) {
    const prismaLines: string[] = [
      'datasource db {',
      '  provider = "postgresql"',
      '  url      = env("DATABASE_URL")',
      '}',
      '',
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      '',
    ];

    for (const tbl of project.tables) {
      prismaLines.push(`model ${tbl.name} {`);
      for (const col of tbl.columns) {
        let prismaType = 'String';
        if (col.type === 'uuid') prismaType = 'String';
        else if (col.type === 'int' || col.type === 'integer')
          prismaType = 'Int';
        else if (col.type === 'boolean') prismaType = 'Boolean';
        else if (col.type === 'timestamp')
          prismaType = 'DateTime @default(now())';

        let attrs = '';
        if (col.isPrimary) attrs += ' @id';
        if (col.isUnique && !col.isPrimary) attrs += ' @unique';

        prismaLines.push(`  ${col.name.padEnd(14)} ${prismaType}${attrs}`);
      }
      prismaLines.push('}\n');
    }

    files.push({
      path: 'prisma/schema.prisma',
      content: prismaLines.join('\n'),
      language: 'prisma',
    });
  }

  // 4. Generate API Routes if apiRoutes exist
  if (project.apiRoutes && project.apiRoutes.length > 0) {
    const apiLines: string[] = [
      'import { Router } from "express";',
      'export const apiRouter = Router();',
      '',
    ];

    for (const r of project.apiRoutes) {
      apiLines.push(`// Route: ${r.path}`);
      for (const ep of r.endpoints) {
        const method = ep.method.toLowerCase();
        apiLines.push(
          `apiRouter.${method}("${r.path}${ep.name}", async (req, res) => {`
        );
        if (ep.targetHandler) {
          apiLines.push(
            `  // Dispatch to ${ep.targetHandler.targetClass}.${ep.targetHandler.targetMethod}()`
          );
        }
        apiLines.push('  res.status(200).json({ ok: true });');
        apiLines.push('});\n');
      }
    }

    files.push({
      path: 'src/routes/api.ts',
      content: apiLines.join('\n'),
      language: 'typescript',
    });
  }

  return files;
}
