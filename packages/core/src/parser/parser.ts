import {
  type ClassSpec,
  type PropertyDefinition,
  type MethodSignature,
  type MethodParameter,
  type UIComponentSpec,
  type TableSpec,
  type ColumnDefinition,
  type ApiRouteSpec,
  type ApiEndpoint,
  type HttpMethod,
  type EventSpec,
  type StateSpec,
  type ConnectionEdge,
  type ParserDiagnostic,
  type Visibility,
} from '../types/spec';

export interface ParseResult {
  classes: ClassSpec[];
  uiComponents: UIComponentSpec[];
  tables: TableSpec[];
  apiRoutes: ApiRouteSpec[];
  events: EventSpec[];
  states: StateSpec[];
  connections: ConnectionEdge[];
  diagnostics: ParserDiagnostic[];
}

function parseVisibility(token: string): Visibility {
  switch (token.toLowerCase()) {
    case '-':
    case 'private':
      return 'private';
    case '#':
    case 'protected':
      return 'protected';
    case '+':
    case 'public':
    case 'readonly':
    case 'get':
    case 'set':
    default:
      return 'public';
  }
}

function parseParameters(paramStr: string): MethodParameter[] {
  if (!paramStr.trim()) return [];
  const parts = paramStr.split(',');
  const params: MethodParameter[] = [];

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      params.push({
        name: part.slice(0, colonIdx).trim(),
        type: part.slice(colonIdx + 1).trim() || 'any',
      });
    } else if (part.trim()) {
      params.push({
        name: part.trim(),
        type: 'any',
      });
    }
  }
  return params;
}

/**
 * Calculate line indentation where spaces are converted to tabs (every 2 spaces or 1 tab = 1 tab level).
 */
export function computeLineIndentTabs(line: string): number {
  let indentLevel = 0;
  let spaces = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\t') {
      indentLevel += Math.floor(spaces / 2) + 1;
      spaces = 0;
    } else if (ch === ' ') {
      spaces++;
      if (spaces === 2) {
        indentLevel++;
        spaces = 0;
      }
    } else {
      break;
    }
  }
  if (spaces > 0) {
    indentLevel++;
  }
  return indentLevel;
}

export function resolveTargetEntityId(
  targetName: string,
  classes: ClassSpec[],
  tables: TableSpec[],
  apiRoutes: ApiRouteSpec[],
  events: EventSpec[],
  states: StateSpec[]
): string {
  const matchingClass = classes.find(c => c.name === targetName);
  if (matchingClass) return matchingClass.id;
  const matchingTable = tables.find(t => t.name === targetName);
  if (matchingTable) return matchingTable.id;
  const matchingApi = apiRoutes.find(
    r => r.path === targetName || r.id === targetName
  );
  if (matchingApi) return matchingApi.id;
  const matchingEvent = events.find(e => e.name === targetName);
  if (matchingEvent) return matchingEvent.id;
  const matchingState = states.find(s => s.name === targetName);
  if (matchingState) return matchingState.id;
  return `entity-${targetName}`;
}

export function parseOutline(text: string): ParseResult {
  const lines = text.split('\n');
  const classes: ClassSpec[] = [];
  const uiComponents: UIComponentSpec[] = [];
  const tables: TableSpec[] = [];
  const apiRoutes: ApiRouteSpec[] = [];
  const events: EventSpec[] = [];
  const states: StateSpec[] = [];
  const connections: ConnectionEdge[] = [];
  const diagnostics: ParserDiagnostic[] = [];

  interface StackItem {
    indent: number;
    type: 'class' | 'method' | 'ui' | 'db' | 'api' | 'state';
    id: string;
    name: string;
    parentClassId?: string;
  }

  const stack: StackItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];

    if (!rawLine.trim() || rawLine.trim().startsWith('//')) {
      continue;
    }

    const indent = computeLineIndentTabs(rawLine);
    const trimmed = rawLine.trim();

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack[stack.length - 1] : null;

    // 1. Entity Declaration: class <Name>, type <Name>, interface <Name>, abstract class <Name>
    const classMatch = trimmed.match(
      /^(abstract\s+class|class|type|interface)\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s]+))?/i
    );
    if (classMatch) {
      const declType = classMatch[1].toLowerCase().replace(/\s+/, ' ');
      const kind: 'class' | 'type' | 'interface' | 'abstract' =
        declType === 'abstract class'
          ? 'abstract'
          : (declType as 'class' | 'type' | 'interface');
      const name = classMatch[2];
      const superClass = classMatch[3] ? classMatch[3].trim() : undefined;
      const rawInterfaces = classMatch[4];
      const interfaces = rawInterfaces
        ? rawInterfaces
            .replace(/[:/].*$/, '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : undefined;

      const id = `entity-${name}`;

      const existing = classes.find(c => c.name === name);
      if (!existing) {
        classes.push({
          id,
          name,
          kind,
          superClass,
          interfaces,
          properties: [],
          methods: [],
        });
        stack.push({indent, type: 'class', id, name});

        if (superClass) {
          connections.push({
            id: `edge-${id}-inherits-entity-${superClass}`,
            sourceId: id,
            targetId: `entity-${superClass}`,
            type: 'inherits',
          });
        }

        if (interfaces && interfaces.length > 0) {
          for (const iface of interfaces) {
            connections.push({
              id: `edge-${id}-implements-entity-${iface}`,
              sourceId: id,
              targetId: `entity-${iface}`,
              type: 'implements',
            });
          }
        }
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate entity declaration "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 2. UI Component Declaration: ui <Name>
    const uiMatch = trimmed.match(/^ui\s+([A-Za-z0-9_$]+)/);
    if (uiMatch) {
      const name = uiMatch[1];
      const id = `ui-${name}`;
      const parentUIId = parent && parent.type === 'ui' ? parent.id : undefined;

      const existing = uiComponents.find(u => u.name === name);
      if (!existing) {
        const spec: UIComponentSpec = {
          id,
          name,
          parentId: parentUIId,
          children: [],
          boundLogicEntities: [],
        };
        uiComponents.push(spec);

        if (parentUIId) {
          const parentComp = uiComponents.find(u => u.id === parentUIId);
          if (parentComp && !parentComp.children.includes(id)) {
            parentComp.children.push(id);
          }
        }
        stack.push({indent, type: 'ui', id, name});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate UI component "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 3. Database Table Declaration: db <TableName>
    const dbMatch = trimmed.match(/^db\s+([A-Za-z0-9_$]+)/);
    if (dbMatch) {
      const name = dbMatch[1];
      const id = `table-${name}`;
      const existing = tables.find(t => t.name === name);
      if (!existing) {
        tables.push({
          id,
          name,
          columns: [],
        });
        stack.push({indent, type: 'db', id, name});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate table declaration "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 4. API Route Declaration: api <Path>
    const apiMatch = trimmed.match(/^api\s+(\S+)/);
    if (apiMatch) {
      const path = apiMatch[1];
      const id = `api-${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const existing = apiRoutes.find(r => r.path === path);
      if (!existing) {
        apiRoutes.push({
          id,
          path,
          endpoints: [],
        });
        stack.push({indent, type: 'api', id, name: path});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate API route "${path}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 5. State Slice Declaration: state <SliceName>
    const stateMatch = trimmed.match(/^state\s+([A-Za-z0-9_$]+)/);
    if (stateMatch) {
      const name = stateMatch[1];
      const id = `state-${name}`;
      const existing = states.find(s => s.name === name);
      if (!existing) {
        states.push({
          id,
          name,
          fields: [],
        });
        stack.push({indent, type: 'state', id, name});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate state slice "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 6. Standalone Event Declaration: event <Name>(<payload>) -> Target.method
    const eventMatch = trimmed.match(
      /^event\s+([A-Za-z0-9_$]+)(\((.*?)\))?(\s*->\s*(.+))?/
    );
    if (eventMatch) {
      const name = eventMatch[1];
      const payloadType = eventMatch[3] ? eventMatch[3].trim() : undefined;
      const targetStr = eventMatch[5] ? eventMatch[5].trim() : undefined;
      const id = `event-${name}`;

      const targets: Array<{targetClass: string; targetMethod: string}> = [];
      if (targetStr) {
        const dotIdx = targetStr.indexOf('.');
        const targetClass =
          dotIdx !== -1 ? targetStr.slice(0, dotIdx).trim() : targetStr;
        const targetMethod =
          dotIdx !== -1
            ? targetStr
                .slice(dotIdx + 1)
                .trim()
                .replace(/\(\s*\)$/, '')
            : 'handle';
        targets.push({targetClass, targetMethod});

        connections.push({
          id: `edge-${id}-emits->${targetClass}.${targetMethod}`,
          sourceId: id,
          targetId: `entity-${targetClass}`,
          targetMember: targetMethod,
          type: 'emits',
        });
      }

      events.push({
        id,
        name,
        payloadType,
        targets,
      });
      continue;
    }

    // 7. UI-to-Logic binding: binds <LogicEntity>
    const bindsMatch = trimmed.match(/^binds\s+([A-Za-z0-9_$]+)/);
    if (bindsMatch) {
      if (parent && parent.type === 'ui') {
        const targetEntity = bindsMatch[1];
        const currentUI = uiComponents.find(u => u.id === parent.id);
        if (currentUI && !currentUI.boundLogicEntities.includes(targetEntity)) {
          currentUI.boundLogicEntities.push(targetEntity);
          const targetId = resolveTargetEntityId(
            targetEntity,
            classes,
            tables,
            apiRoutes,
            events,
            states
          );
          connections.push({
            id: `edge-${parent.id}-binds-${targetEntity}`,
            sourceId: parent.id,
            targetId,
            type: 'binds',
          });
        }
      } else if (parent && parent.type === 'class') {
        const targetEntity = bindsMatch[1];
        const currentClass = classes.find(c => c.id === parent.id);
        if (currentClass) {
          const targetId = resolveTargetEntityId(
            targetEntity,
            classes,
            tables,
            apiRoutes,
            events,
            states
          );
          connections.push({
            id: `edge-${currentClass.id}-calls->${targetEntity}`,
            sourceId: currentClass.id,
            targetId,
            type: 'invokes',
          });
        }
      } else {
        diagnostics.push({
          line: lineNum,
          message:
            '"binds" keyword must be nested under a UI component or class',
          severity: 'warning',
        });
      }
      continue;
    }

    // 8. Members under Database Table
    if (parent && parent.type === 'db') {
      const currentTable = tables.find(t => t.id === parent.id);
      if (currentTable) {
        const colMatch = trimmed.match(
          /^[+\-#]?\s*([A-Za-z0-9_$]+)\s*:\s*(.+)$/
        );
        if (colMatch) {
          const colName = colMatch[1];
          const colRest = colMatch[2].trim();

          const isPrimary = /\bpk\b/i.test(colRest);
          const isUnique = /\bunique\b/i.test(colRest) || isPrimary;
          const isForeignKey = /\bfk\b/i.test(colRest);

          let cleanType = colRest.replace(/\b(pk|unique|fk)\b/gi, '').trim();
          let references: {table: string; column: string} | undefined;

          // Check for foreign key arrow: -> OtherTable.col
          const fkArrow = cleanType.indexOf('->');
          if (fkArrow !== -1) {
            const refTarget = cleanType.slice(fkArrow + 2).trim();
            cleanType = cleanType.slice(0, fkArrow).trim();
            const dot = refTarget.indexOf('.');
            if (dot !== -1) {
              const refTable = refTarget.slice(0, dot).trim();
              const refCol = refTarget.slice(dot + 1).trim();
              references = {table: refTable, column: refCol};
              connections.push({
                id: `edge-${parent.id}-${colName}->${refTable}.${refCol}`,
                sourceId: parent.id,
                sourceMember: colName,
                targetId: `table-${refTable}`,
                targetMember: refCol,
                type: 'foreignKey',
              });
            }
          }

          const colDef: ColumnDefinition = {
            name: colName,
            type: cleanType || 'text',
            isPrimary,
            isUnique,
            isForeignKey: isForeignKey || !!references,
            references,
          };
          currentTable.columns.push(colDef);
          continue;
        }
      }
    }

    // 9. Members under API Route: e.g. + GET /login(req: DTO): Resp -> Service.method
    if (parent && parent.type === 'api') {
      const currentRoute = apiRoutes.find(r => r.id === parent.id);
      if (currentRoute) {
        const epMatch = trimmed.match(
          /^[+\-#]?\s*(GET|POST|PUT|PATCH|DELETE)\s+(\S+?)(\((.*?)\))?(\s*:\s*([^->\s]+))?(\s*->\s*(.+))?$/i
        );
        if (epMatch) {
          const method = epMatch[1].toUpperCase() as HttpMethod;
          const epPath = epMatch[2];
          const requestType = epMatch[4] ? epMatch[4].trim() : undefined;
          const responseType = epMatch[6] ? epMatch[6].trim() : undefined;
          const targetStr = epMatch[8] ? epMatch[8].trim() : undefined;

          let targetHandler:
            | {targetClass: string; targetMethod: string}
            | undefined;
          if (targetStr) {
            const dotIdx = targetStr.indexOf('.');
            const targetClass =
              dotIdx !== -1 ? targetStr.slice(0, dotIdx).trim() : targetStr;
            const targetMethod =
              dotIdx !== -1
                ? targetStr
                    .slice(dotIdx + 1)
                    .trim()
                    .replace(/\(\s*\)$/, '')
                : 'handle';
            targetHandler = {targetClass, targetMethod};

            connections.push({
              id: `edge-${parent.id}-${method}-${epPath}->${targetClass}.${targetMethod}`,
              sourceId: parent.id,
              sourceMember: `${method} ${epPath}`,
              targetId: `entity-${targetClass}`,
              targetMember: targetMethod,
              type: 'invokes',
            });
          }

          const endpoint: ApiEndpoint = {
            method,
            name: epPath,
            requestType,
            responseType,
            targetHandler,
          };
          currentRoute.endpoints.push(endpoint);
          continue;
        }
      }
    }

    // 10. Members under State Slice: + field: type
    if (parent && parent.type === 'state') {
      const currentState = states.find(s => s.id === parent.id);
      if (currentState) {
        const fieldMatch = trimmed.match(
          /^[+\-#]?\s*([A-Za-z0-9_$]+)\s*:\s*(.+)$/
        );
        if (fieldMatch) {
          currentState.fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2].trim(),
          });
          continue;
        }
      }
    }

    // 11. Members under Class / Type
    if (parent && parent.type === 'class') {
      const currentClass = classes.find(c => c.id === parent.id);
      if (!currentClass) continue;

      const memberMatch = trimmed.match(
        /^([+\-#]|(?:public|private|protected|readonly|get|set)\b)\s*(.*)$/i
      );
      if (memberMatch) {
        const visibility = parseVisibility(memberMatch[1]);
        const memberContent = memberMatch[2].trim();

        let inlineCall: {targetClass: string; targetMethod: string} | null =
          null;
        let mainContent = memberContent;

        let arrowIdx = memberContent.indexOf('->');
        let arrowLength = 2;
        if (arrowIdx === -1) {
          const callsMatch = memberContent.match(/\b(?:calls|invokes)\b/i);
          if (callsMatch && callsMatch.index !== undefined) {
            arrowIdx = callsMatch.index;
            arrowLength = callsMatch[0].length;
          }
        }
        if (arrowIdx !== -1) {
          const callTarget = memberContent.slice(arrowIdx + arrowLength).trim();
          mainContent = memberContent.slice(0, arrowIdx).trim();

          const dotIdx = callTarget.indexOf('.');
          if (dotIdx !== -1) {
            let tc = callTarget.slice(0, dotIdx).trim();
            const tm = callTarget
              .slice(dotIdx + 1)
              .trim()
              .replace(/\(\s*\)$/, '');
            if (tc.toLowerCase() === 'this' || tc.toLowerCase() === 'self') {
              tc = currentClass.name;
            }
            inlineCall = {
              targetClass: tc,
              targetMethod: tm,
            };
          } else if (callTarget) {
            const cleaned = callTarget.replace(/\(\s*\)$/, '').trim();
            const isLocal =
              currentClass.methods.some(m => m.name === cleaned) ||
              /^[a-z]/.test(cleaned);
            if (isLocal) {
              inlineCall = {
                targetClass: currentClass.name,
                targetMethod: cleaned,
              };
            } else {
              inlineCall = {
                targetClass: cleaned,
                targetMethod: '',
              };
            }
          }
        }

        const methodMatch = mainContent.match(
          /^([A-Za-z0-9_$]+)\s*\((.*?)\)(\s*:\s*(.*))?$/
        );
        if (methodMatch) {
          const methodName = methodMatch[1];
          const paramStr = methodMatch[2];
          const returnType = methodMatch[4] ? methodMatch[4].trim() : 'void';
          const params = parseParameters(paramStr);

          const callList = inlineCall ? [inlineCall] : [];
          const methodSignature: MethodSignature = {
            name: methodName,
            visibility,
            parameters: params,
            returnType,
            calls: callList,
          };
          currentClass.methods.push(methodSignature);
          stack.push({
            indent,
            type: 'method',
            id: `${parent.id}-${methodName}`,
            name: methodName,
            parentClassId: parent.id,
          });

          if (inlineCall) {
            const targetId = resolveTargetEntityId(
              inlineCall.targetClass,
              classes,
              tables,
              apiRoutes,
              events,
              states
            );
            connections.push({
              id: `edge-${parent.id}-${methodName}->${inlineCall.targetClass}${inlineCall.targetMethod ? '.' + inlineCall.targetMethod : ''}`,
              sourceId: parent.id,
              sourceMember: methodName,
              targetId,
              targetMember: inlineCall.targetMethod || undefined,
              type: 'invokes',
            });
          }
          continue;
        }

        const propMatch = mainContent.match(/^([A-Za-z0-9_$]+)\s*:\s*(.+)$/);
        if (propMatch) {
          const propName = propMatch[1];
          const propType = propMatch[2].trim();

          const propertyDef: PropertyDefinition = {
            name: propName,
            visibility,
            type: propType,
          };
          currentClass.properties.push(propertyDef);
          continue;
        }

        diagnostics.push({
          line: lineNum,
          message: `Malformed member definition "${trimmed}". Expected "prop: type" or "method(params): returnType"`,
          severity: 'warning',
        });
        continue;
      }

      // Direct class dependency / call: calls Target, -> Target, or binds Target
      const callMatch = trimmed.match(
        /^(calls|invokes|->|binds)\s+([A-Za-z0-9_$.]+)/i
      );
      if (callMatch) {
        const keyword = callMatch[1].toLowerCase();
        const isBinds = keyword === 'binds';
        const targetStr = callMatch[2].trim();
        const dotIdx = targetStr.indexOf('.');
        let targetClass =
          dotIdx !== -1 ? targetStr.slice(0, dotIdx).trim() : targetStr;
        const targetMethod =
          dotIdx !== -1
            ? targetStr
                .slice(dotIdx + 1)
                .trim()
                .replace(/\(\s*\)$/, '')
            : '';

        if (
          targetClass.toLowerCase() === 'this' ||
          targetClass.toLowerCase() === 'self'
        ) {
          targetClass = currentClass.name;
        }

        const lastMethod =
          !isBinds && currentClass.methods.length > 0
            ? currentClass.methods[currentClass.methods.length - 1]
            : null;

        const targetId = resolveTargetEntityId(
          targetClass,
          classes,
          tables,
          apiRoutes,
          events,
          states
        );

        if (lastMethod) {
          if (!lastMethod.calls) {
            lastMethod.calls = [];
          }
          const alreadyHasCall = lastMethod.calls.some(
            c =>
              c.targetClass === targetClass && c.targetMethod === targetMethod
          );
          if (!alreadyHasCall) {
            lastMethod.calls.push({targetClass, targetMethod});
          }

          const alreadyHasConn = connections.some(
            c =>
              c.sourceId === currentClass.id &&
              c.sourceMember === lastMethod.name &&
              c.targetId === targetId &&
              c.targetMember === (targetMethod || undefined)
          );

          if (!alreadyHasConn) {
            connections.push({
              id: `edge-${currentClass.id}-${lastMethod.name}->${targetClass}${targetMethod ? '.' + targetMethod : ''}`,
              sourceId: currentClass.id,
              sourceMember: lastMethod.name,
              targetId,
              targetMember: targetMethod || undefined,
              type: 'invokes',
            });
          }
        } else {
          connections.push({
            id: `edge-${currentClass.id}-calls->${targetClass}${targetMethod ? '.' + targetMethod : ''}`,
            sourceId: currentClass.id,
            targetId,
            targetMember: targetMethod || undefined,
            type: 'invokes',
          });
        }
        continue;
      }
    }

    // 12. Invocations under Method: -> Target.method, calls Target.method, or - Target.method / + Target.method
    if (parent && parent.type === 'method') {
      const parentClass = classes.find(c => c.id === parent.parentClassId);
      const parentMethod = parentClass?.methods.find(
        m => m.name === parent.name
      );

      if (parentClass && parentMethod) {
        // Strip leading symbols: '->', 'calls', '-', '+', '*'
        let targetStr = trimmed;
        if (targetStr.startsWith('->')) {
          targetStr = targetStr.slice(2).trim();
        } else if (/^(calls|invokes)\b/i.test(targetStr)) {
          targetStr = targetStr.replace(/^(calls|invokes)\b/i, '').trim();
        } else if (/^[+\-*]\s*(->)?\s*/.test(targetStr)) {
          targetStr = targetStr.replace(/^[+\-*]\s*(->)?\s*/, '').trim();
        }

        if (targetStr) {
          const dotIdx = targetStr.indexOf('.');
          let targetClass =
            dotIdx !== -1 ? targetStr.slice(0, dotIdx).trim() : '';
          let targetMethod =
            dotIdx !== -1
              ? targetStr
                  .slice(dotIdx + 1)
                  .trim()
                  .replace(/\(\s*\)$/, '')
              : targetStr.replace(/\(\s*\)$/, '').trim();

          if (dotIdx === -1) {
            const cleaned = targetStr.replace(/\(\s*\)$/, '').trim();
            const isLocal =
              parentClass.methods.some(m => m.name === cleaned) ||
              /^[a-z]/.test(cleaned);
            if (isLocal) {
              targetClass = parentClass.name;
              targetMethod = cleaned;
            } else {
              targetClass = cleaned;
              targetMethod = '';
            }
          } else if (
            targetClass.toLowerCase() === 'this' ||
            targetClass.toLowerCase() === 'self'
          ) {
            targetClass = parentClass.name;
          }

          if (!parentMethod.calls) {
            parentMethod.calls = [];
          }
          const alreadyHasCall = parentMethod.calls.some(
            c =>
              c.targetClass === targetClass && c.targetMethod === targetMethod
          );
          if (!alreadyHasCall) {
            parentMethod.calls.push({targetClass, targetMethod});
          }

          const targetId = resolveTargetEntityId(
            targetClass,
            classes,
            tables,
            apiRoutes,
            events,
            states
          );

          const alreadyHasConn = connections.some(
            c =>
              c.sourceId === parentClass.id &&
              c.sourceMember === parentMethod.name &&
              c.targetId === targetId &&
              c.targetMember === (targetMethod || undefined)
          );

          if (!alreadyHasConn) {
            connections.push({
              id: `edge-${parentClass.id}-${parentMethod.name}->${targetClass}.${targetMethod}`,
              sourceId: parentClass.id,
              sourceMember: parentMethod.name,
              targetId,
              targetMember: targetMethod || undefined,
              type: 'invokes',
            });
          }
          continue;
        }
      }
    }

    diagnostics.push({
      line: lineNum,
      message: `Unrecognized statement "${trimmed}"`,
      severity: 'info',
    });
  }

  // Post-processing pass: Re-resolve connection targetIds now that all entities are declared
  for (const conn of connections) {
    if (conn.targetId.startsWith('entity-')) {
      const targetName = conn.targetId.slice('entity-'.length);
      const matchingTable = tables.find(t => t.name === targetName);
      if (matchingTable) {
        conn.targetId = matchingTable.id;
        continue;
      }
      const matchingApi = apiRoutes.find(
        r => r.path === targetName || r.id === targetName
      );
      if (matchingApi) {
        conn.targetId = matchingApi.id;
        continue;
      }
      const matchingEvent = events.find(e => e.name === targetName);
      if (matchingEvent) {
        conn.targetId = matchingEvent.id;
        continue;
      }
      const matchingState = states.find(s => s.name === targetName);
      if (matchingState) {
        conn.targetId = matchingState.id;
        continue;
      }
    }
  }

  return {
    classes,
    uiComponents,
    tables,
    apiRoutes,
    events,
    states,
    connections,
    diagnostics,
  };
}
