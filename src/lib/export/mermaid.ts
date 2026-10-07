import {type ArchitectureProject} from '../../types/spec';

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

  // Add relations
  for (const conn of project.connections) {
    if (conn.type === 'invokes' && conn.sourceMember && conn.targetMember) {
      const sourceName = conn.sourceId.replace(/^entity-/, '');
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

export function exportToMermaidFlowchart(project: ArchitectureProject): string {
  const lines: string[] = ['flowchart TD'];

  // Add UI tree
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

  // Add Classes
  if (project.classes.length > 0) {
    lines.push('    subgraph Services ["Logic Entities"]');
    for (const cls of project.classes) {
      lines.push(`        ${cls.id}["${cls.name} (${cls.kind})"]`);
    }
    lines.push('    end');
  }

  // Connections
  for (const conn of project.connections) {
    if (conn.type === 'binds') {
      lines.push(`    ${conn.sourceId} -.->|binds| ${conn.targetId}`);
    } else if (conn.type === 'invokes') {
      const label = `${conn.sourceMember || ''} -> ${conn.targetMember || ''}`;
      lines.push(`    ${conn.sourceId} -->|"${label}"| ${conn.targetId}`);
    }
  }

  return lines.join('\n');
}
