import {type ArchitectureProject} from '../types/spec';

export function exportToMermaidClassDiagram(
  project: ArchitectureProject
): string {
  const lines: string[] = ['classDiagram'];

  for (const cls of project.classes) {
    lines.push(`    class ${cls.name} {`);
    for (const prop of cls.properties) {
      const vis =
        prop.visibility === 'private'
          ? '-'
          : prop.visibility === 'protected'
            ? '#'
            : '+';
      lines.push(`        ${vis}${prop.type} ${prop.name}`);
    }
    for (const meth of cls.methods) {
      const vis =
        meth.visibility === 'private'
          ? '-'
          : meth.visibility === 'protected'
            ? '#'
            : '+';
      const paramStr = meth.parameters
        .map(p => `${p.type} ${p.name}`)
        .join(', ');
      lines.push(`        ${vis}${meth.name}(${paramStr}) ${meth.returnType}`);
    }
    lines.push('    }');
  }

  // Relations
  for (const conn of project.connections) {
    if (conn.type === 'invokes' && conn.sourceMember && conn.targetMember) {
      const sourceName = conn.sourceId.replace(/^(entity-|api-)/, '');
      const targetName = conn.targetId.replace(/^entity-/, '');
      lines.push(
        `    ${sourceName} ..> ${targetName} : "${conn.sourceMember}() -> ${conn.targetMember}()"`
      );
    } else if (conn.type === 'binds') {
      const sourceName = conn.sourceId.replace(/^ui-/, 'UI_');
      const targetName = conn.targetId.replace(/^entity-/, '');
      lines.push(`    ${sourceName} ..> ${targetName} : "binds"`);
    }
  }

  return lines.join('\n');
}

export function exportToMermaidERDiagram(project: ArchitectureProject): string {
  const lines: string[] = ['erDiagram'];

  if (project.tables && project.tables.length > 0) {
    for (const tbl of project.tables) {
      lines.push(`    ${tbl.name} {`);
      for (const col of tbl.columns) {
        const keyTag = col.isPrimary ? 'PK' : col.isForeignKey ? 'FK' : '';
        lines.push(`        ${col.type} ${col.name} ${keyTag}`.trimEnd());
      }
      lines.push('    }');
    }

    // Foreign key relations
    for (const conn of project.connections) {
      if (conn.type === 'foreignKey') {
        const sourceTbl = conn.sourceId.replace(/^table-/, '');
        const targetTbl = conn.targetId.replace(/^table-/, '');
        lines.push(`    ${targetTbl} ||--o{ ${sourceTbl} : "references"`);
      }
    }
  }

  return lines.join('\n');
}

export function exportToMermaidFlowchart(project: ArchitectureProject): string {
  const lines: string[] = ['flowchart TD'];

  // UI tree
  if (project.uiComponents.length > 0) {
    lines.push('    subgraph UI_Hierarchy ["UI Component Tree"]');
    for (const ui of project.uiComponents) {
      lines.push(`        ${ui.id}["${ui.name}"]`);
      if (ui.parentId) {
        lines.push(`        ${ui.parentId} --> ${ui.id}`);
      }
    }
    lines.push('    end');
  }

  // API Routes
  if (project.apiRoutes && project.apiRoutes.length > 0) {
    lines.push('    subgraph API_Routes ["API Routes"]');
    for (const r of project.apiRoutes) {
      lines.push(`        ${r.id}["${r.path}"]`);
    }
    lines.push('    end');
  }

  // Classes / Services
  if (project.classes.length > 0) {
    lines.push('    subgraph Services ["Logic Entities"]');
    for (const cls of project.classes) {
      lines.push(`        ${cls.id}["${cls.name} (${cls.kind})"]`);
    }
    lines.push('    end');
  }

  // Database Tables
  if (project.tables && project.tables.length > 0) {
    lines.push('    subgraph Database ["Database Tables"]');
    for (const tbl of project.tables) {
      lines.push(`        ${tbl.id}[("Table: ${tbl.name}")]`);
    }
    lines.push('    end');
  }

  // Events
  if (project.events && project.events.length > 0) {
    lines.push('    subgraph Events ["Event Stream"]');
    for (const ev of project.events) {
      lines.push(`        ${ev.id}{{"Event: ${ev.name}"}}`);
    }
    lines.push('    end');
  }

  // Connections
  for (const conn of project.connections) {
    if (conn.type === 'binds') {
      lines.push(`    ${conn.sourceId} -.->|binds| ${conn.targetId}`);
    } else if (conn.type === 'foreignKey') {
      lines.push(`    ${conn.sourceId} ==>|FK| ${conn.targetId}`);
    } else if (conn.type === 'emits') {
      lines.push(`    ${conn.sourceId} -.->|emits| ${conn.targetId}`);
    } else if (conn.type === 'invokes') {
      const label = `${conn.sourceMember || ''} -> ${conn.targetMember || ''}`;
      lines.push(`    ${conn.sourceId} -->|"${label}"| ${conn.targetId}`);
    }
  }

  return lines.join('\n');
}
