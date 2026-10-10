import {type ArchitectureProject, type ClassSpec} from '../types/spec';

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
  const knownEventNames = new Set((project.events || []).map(e => e.name));
  const knownStateNames = new Set((project.states || []).map(s => s.name));
  const knownFunctionNames = new Set(
    (project.functions || []).map(f => f.name)
  );
  const knownApiNames = new Set(
    (project.apiRoutes || []).flatMap(r => [r.path, r.id])
  );
  const knownUIComponentNames = new Set(
    (project.uiComponents || []).map(u => u.name)
  );

  const allEntityNames = new Set([
    ...knownClassNames,
    ...knownTableNames,
    ...knownEventNames,
    ...knownStateNames,
    ...knownFunctionNames,
    ...knownApiNames,
    ...knownUIComponentNames,
  ]);

  // 1. Missing Invocation Target Check
  const checkCalls = (
    calls: Array<{targetClass: string; verb?: string}> | undefined,
    sourceName: string,
    sourceEntityId?: string
  ) => {
    if (!calls) return;
    for (const call of calls) {
      if (!call.targetClass) continue;
      const verb = call.verb;
      let isValid = false;

      if (verb === 'query' || verb === 'mutate') {
        isValid = knownTableNames.has(call.targetClass);
      } else if (verb === 'dispatch') {
        isValid = knownStateNames.has(call.targetClass);
      } else if (verb === 'emit') {
        isValid =
          knownEventNames.has(call.targetClass) ||
          knownUIComponentNames.has(call.targetClass);
      } else if (verb === 'render') {
        isValid =
          knownUIComponentNames.has(call.targetClass) ||
          knownUIComponentNames.has(call.targetClass.replace(/^ui\./, ''));
      } else if (verb === 'call') {
        isValid =
          knownClassNames.has(call.targetClass) ||
          knownFunctionNames.has(call.targetClass) ||
          knownApiNames.has(call.targetClass);
      } else {
        isValid = allEntityNames.has(call.targetClass);
      }

      if (!isValid) {
        issues.push({
          id: `missing-target-${sourceName}-${call.targetClass}`,
          severity: 'error',
          title: 'Unresolved Call Target',
          description: `"${sourceName}" references non-existent target "${call.targetClass}"`,
          affectedEntityId: sourceEntityId,
        });
      }
    }
  };

  for (const cls of project.classes) {
    for (const meth of cls.methods) {
      checkCalls(meth.calls, `${cls.name}.${meth.name}()`, cls.id);
    }
  }

  if (project.functions) {
    for (const fn of project.functions) {
      checkCalls(fn.calls, `function ${fn.name}()`, fn.id);
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

  // 5. Unresolved Inheritance & Interface Target Check
  for (const cls of project.classes) {
    if (cls.superClass && !knownClassNames.has(cls.superClass)) {
      issues.push({
        id: `missing-superclass-${cls.name}-${cls.superClass}`,
        severity: 'error',
        title: 'Unresolved Inheritance Target',
        description: `Class "${cls.name}" extends non-existent class "${cls.superClass}"`,
        affectedEntityId: cls.id,
      });
    }

    if (cls.interfaces) {
      for (const iface of cls.interfaces) {
        if (!knownClassNames.has(iface)) {
          issues.push({
            id: `missing-interface-${cls.name}-${iface}`,
            severity: 'error',
            title: 'Unresolved Interface Target',
            description: `Class "${cls.name}" implements non-existent interface "${iface}"`,
            affectedEntityId: cls.id,
          });
        }
      }
    }
  }

  // 6. Circular Inheritance Detector
  const inheritanceGraph = new Map<string, string | undefined>();
  for (const cls of project.classes) {
    if (cls.superClass) {
      inheritanceGraph.set(cls.name, cls.superClass);
    }
  }

  const reportedCycles = new Set<string>();
  for (const cls of project.classes) {
    const chain: string[] = [];
    let curr: string | undefined = cls.name;
    const seen = new Set<string>();

    while (curr && inheritanceGraph.has(curr)) {
      if (seen.has(curr)) {
        const cycleKey = [...chain, curr].sort().join('-');
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          issues.push({
            id: `circular-inheritance-${cls.name}`,
            severity: 'error',
            title: 'Circular Inheritance Chain',
            description: `Circular inheritance hierarchy detected: ${[...chain, curr].join(' ➔ ')}`,
            affectedEntityId: cls.id,
          });
        }
        break;
      }
      seen.add(curr);
      chain.push(curr);
      curr = inheritanceGraph.get(curr);
    }
  }

  // 7. Interface Contract Compliance Check
  const interfaceMap = new Map<string, ClassSpec>();
  for (const cls of project.classes) {
    if (cls.kind === 'interface') {
      interfaceMap.set(cls.name, cls);
    }
  }

  for (const cls of project.classes) {
    if (cls.interfaces && cls.kind !== 'interface') {
      const implementedMethods = new Set(cls.methods.map(m => m.name));
      for (const ifaceName of cls.interfaces) {
        const ifaceSpec = interfaceMap.get(ifaceName);
        if (ifaceSpec) {
          for (const requiredMethod of ifaceSpec.methods) {
            if (!implementedMethods.has(requiredMethod.name)) {
              issues.push({
                id: `missing-contract-method-${cls.name}-${ifaceName}-${requiredMethod.name}`,
                severity: 'warning',
                title: 'Interface Contract Violation',
                description: `Class "${cls.name}" is missing required method "${requiredMethod.name}()" declared by interface "${ifaceName}"`,
                affectedEntityId: cls.id,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}
