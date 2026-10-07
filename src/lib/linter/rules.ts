import {type ArchitectureProject} from '../../types/spec';

export interface ArchitectureLintIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  affectedEntityId?: string;
}

export function lintArchitecture(
  project: ArchitectureProject
): ArchitectureLintIssue[] {
  const issues: ArchitectureLintIssue[] = [];

  const knownClassNames = new Set(project.classes.map(c => c.name));
  const knownTableNames = new Set((project.tables || []).map(t => t.name));

  // 1. Missing Invocation Target Check
  for (const cls of project.classes) {
    for (const meth of cls.methods) {
      if (meth.calls) {
        for (const call of meth.calls) {
          if (!knownClassNames.has(call.targetClass)) {
            issues.push({
              id: `missing-target-${cls.name}-${call.targetClass}`,
              severity: 'error',
              title: 'Unresolved Call Target',
              description: `Method "${cls.name}.${meth.name}()" calls non-existent entity "${call.targetClass}"`,
              affectedEntityId: cls.id,
            });
          }
        }
      }
    }
  }

  // 2. Missing Table Foreign Key Target Check
  if (project.tables) {
    for (const tbl of project.tables) {
      for (const col of tbl.columns) {
        if (col.references && !knownTableNames.has(col.references.table)) {
          issues.push({
            id: `missing-fk-table-${tbl.name}-${col.references.table}`,
            severity: 'error',
            title: 'Unresolved Foreign Key Table',
            description: `Column "${tbl.name}.${col.name}" references non-existent table "${col.references.table}"`,
            affectedEntityId: tbl.id,
          });
        }
      }
    }
  }

  // 3. Circular Dependency Detector (DFS Cycle Detection)
  const adjacencyList = new Map<string, string[]>();
  for (const cls of project.classes) {
    const targets: string[] = [];
    for (const meth of cls.methods) {
      if (meth.calls) {
        for (const call of meth.calls) {
          if (
            knownClassNames.has(call.targetClass) &&
            call.targetClass !== cls.name
          ) {
            targets.push(call.targetClass);
          }
        }
      }
    }
    adjacencyList.set(cls.name, targets);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function detectCycle(current: string, path: string[]) {
    visited.add(current);
    recursionStack.add(current);

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCycle(neighbor, [...path, neighbor]);
      } else if (recursionStack.has(neighbor)) {
        issues.push({
          id: `cycle-${current}-${neighbor}`,
          severity: 'warning',
          title: 'Circular Dependency Detected',
          description: `Circular call chain detected: ${[...path, neighbor].join(' ➔ ')}`,
        });
      }
    }
    recursionStack.delete(current);
  }

  for (const cls of project.classes) {
    if (!visited.has(cls.name)) {
      detectCycle(cls.name, [cls.name]);
    }
  }

  // 4. UI Layer Boundary Violation Check
  for (const ui of project.uiComponents) {
    for (const bound of ui.boundLogicEntities) {
      if (knownTableNames.has(bound) && !knownClassNames.has(bound)) {
        issues.push({
          id: `ui-db-leak-${ui.name}-${bound}`,
          severity: 'warning',
          title: 'Architectural Layer Boundary Violation',
          description: `UI Component "${ui.name}" binds directly to database table "${bound}". Consider wrapping in a Service.`,
          affectedEntityId: ui.id,
        });
      }
    }
  }

  // 5. Unreferenced / Dead Service Check
  const targetedClasses = new Set<string>();
  for (const cls of project.classes) {
    for (const m of cls.methods) {
      m.calls?.forEach(c => targetedClasses.add(c.targetClass));
    }
  }
  for (const ui of project.uiComponents) {
    ui.boundLogicEntities.forEach(b => targetedClasses.add(b));
  }
  (project.apiRoutes || []).forEach(r =>
    r.endpoints.forEach(e => {
      if (e.targetHandler) targetedClasses.add(e.targetHandler.targetClass);
    })
  );
  (project.events || []).forEach(e =>
    e.targets.forEach(t => targetedClasses.add(t.targetClass))
  );

  for (const cls of project.classes) {
    if (project.classes.length > 1 && !targetedClasses.has(cls.name)) {
      issues.push({
        id: `unreferenced-service-${cls.name}`,
        severity: 'info',
        title: 'Unreferenced Entity',
        description: `Entity "${cls.name}" is not invoked by any UI component, API route, or service.`,
        affectedEntityId: cls.id,
      });
    }
  }

  return issues;
}
