import {
  type ApiEndpoint,
  type ApiRouteSpec,
  type ClassSpec,
  type ColumnDefinition,
  type ConnectionEdge,
  type EventSpec,
  type FunctionSpec,
  type HttpMethod,
  type MethodCall,
  type MethodParameter,
  type MethodSignature,
  type ParserDiagnostic,
  type PropertyDefinition,
  type StateSpec,
  type TableSpec,
  type UIComponentSpec,
  type Visibility,
} from '../types/spec';

export interface ParseResult {
  classes: ClassSpec[];
  uiComponents: UIComponentSpec[];
  tables: TableSpec[];
  apiRoutes: ApiRouteSpec[];
  events: EventSpec[];
  states: StateSpec[];
  functions?: FunctionSpec[];
  connections: ConnectionEdge[];
  diagnostics: ParserDiagnostic[];
}

function parseVisibility(token?: string): Visibility {
  if (!token) return 'public';
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
      let paramName = part.slice(0, colonIdx).trim();
      const isOptional = paramName.endsWith('?');
      if (isOptional) paramName = paramName.slice(0, -1).trim();
      params.push({
        name: paramName,
        type: part.slice(colonIdx + 1).trim() || 'any',
        isOptional: isOptional || undefined,
      });
    } else if (part.trim()) {
      let paramName = part.trim();
      const isOptional = paramName.endsWith('?');
      if (isOptional) paramName = paramName.slice(0, -1).trim();
      params.push({
        name: paramName,
        type: 'any',
        isOptional: isOptional || undefined,
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
  states: StateSpec[],
  functions?: FunctionSpec[]
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
  const matchingFunc = functions?.find(f => f.name === targetName);
  if (matchingFunc) return matchingFunc.id;
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
  const functions: FunctionSpec[] = [];
  const connections: ConnectionEdge[] = [];
  const diagnostics: ParserDiagnostic[] = [];

  interface StackItem {
    indent: number;
    type: 'class' | 'method' | 'ui' | 'db' | 'api' | 'state' | 'function';
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

    // 6b. Standalone Function Declaration: [public|private|protected] function <Name>(<params>)[: <ReturnType>]
    const funcMatch = trimmed.match(
      /^(?:(public|private|protected)\s+)?function\s+([A-Za-z0-9_$]+)(?:\((.*?)\))?(?:\s*:\s*(.+))?/i
    );
    if (funcMatch) {
      const visibility = parseVisibility(funcMatch[1]);
      const name = funcMatch[2];
      const paramStr = funcMatch[3] || '';
      const returnType = funcMatch[4] ? funcMatch[4].trim() : 'void';
      const params = parseParameters(paramStr);
      const id = `func-${name}`;

      const existing = functions.find(f => f.name === name);
      if (!existing) {
        functions.push({
          id,
          name,
          visibility,
          parameters: params,
          returnType,
          calls: [],
        });
        stack.push({indent, type: 'function', id, name});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate function declaration "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // 7. Members under UI Component (props, emits, render, child ui, binds)
    if (parent && parent.type === 'ui') {
      const currentUI = uiComponents.find(u => u.id === parent.id);
      if (currentUI) {
        // Child UI: ui <ChildName>
        const childUiMatch = trimmed.match(/^ui\s+([A-Za-z0-9_$]+)/i);
        if (childUiMatch) {
          const childName = childUiMatch[1];
          const childId = `ui-${childName}`;
          currentUI.children.push(childName);
          uiComponents.push({
            id: childId,
            name: childName,
            parentId: currentUI.id,
            children: [],
            boundLogicEntities: [],
            props: [],
            emits: [],
            renderedComponents: [],
          });
          stack.push({indent, type: 'ui', id: childId, name: childName});
          continue;
        }

        // Prop: prop <name>[?]: <type>
        const propMatch = trimmed.match(
          /^prop\s+([A-Za-z0-9_$]+)(\?)?\s*:\s*(.+)$/i
        );
        if (propMatch) {
          if (!currentUI.props) currentUI.props = [];
          currentUI.props.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            isOptional: !!propMatch[2] || undefined,
          });
          continue;
        }

        // Emit: emit <name>: <payloadType>
        const emitMatch = trimmed.match(
          /^emit\s+([A-Za-z0-9_$]+)\s*:\s*(.+)$/i
        );
        if (emitMatch) {
          if (!currentUI.emits) currentUI.emits = [];
          currentUI.emits.push({
            name: emitMatch[1],
            payloadType: emitMatch[2].trim(),
          });
          continue;
        }

        // Render: render [ui.]<ComponentName>
        const renderMatch = trimmed.match(
          /^render\s+(?:ui\.)?([A-Za-z0-9_$]+)/i
        );
        if (renderMatch) {
          const renderedName = renderMatch[1];
          if (!currentUI.renderedComponents) currentUI.renderedComponents = [];
          currentUI.renderedComponents.push(renderedName);
          connections.push({
            id: `edge-${currentUI.id}-renders-ui-${renderedName}`,
            sourceId: currentUI.id,
            targetId: `ui-${renderedName}`,
            type: 'render',
          });
          continue;
        }

        // UI-to-Logic binding: binds <LogicEntity>
        const bindsMatch = trimmed.match(/^binds?\s+([A-Za-z0-9_$]+)/i);
        if (bindsMatch) {
          const targetEntity = bindsMatch[1];
          if (!currentUI.boundLogicEntities.includes(targetEntity)) {
            currentUI.boundLogicEntities.push(targetEntity);
            const targetId = resolveTargetEntityId(
              targetEntity,
              classes,
              tables,
              apiRoutes,
              events,
              states,
              functions
            );
            connections.push({
              id: `edge-${parent.id}-binds-${targetEntity}`,
              sourceId: parent.id,
              targetId,
              type: 'binds',
            });
          }
          continue;
        }
      }
    }

    // 8. Members under Database Table
    if (parent && parent.type === 'db') {
      const currentTable = tables.find(t => t.id === parent.id);
      if (currentTable) {
        const colMatch = trimmed.match(
          /^((?:(?:pk|fk|unique|nullable|index|default)\s+)*)([A-Za-z0-9_$]+)(\?)?\s*:\s*(.+)$/i
        );
        if (colMatch) {
          const modifiers = colMatch[1].toLowerCase();
          const colName = colMatch[2];
          const isOptional = !!colMatch[3];
          const cleanType = colMatch[4].trim();

          const isPrimary = /\bpk\b/.test(modifiers);
          const isUnique = /\bunique\b/.test(modifiers) || isPrimary;
          let isForeignKey = /\bfk\b/.test(modifiers);
          const isNullable = /\bnullable\b/.test(modifiers) || isOptional;
          const isIndexed = /\bindex\b/.test(modifiers);
          const isDefault = /\bdefault\b/.test(modifiers);

          let references: {table: string; column: string} | undefined;

          // Check for foreign key via dot notation in type: TargetTable.targetColumn
          const dotIdx = cleanType.indexOf('.');
          if (dotIdx !== -1) {
            const refTable = cleanType.slice(0, dotIdx).trim();
            const refCol = cleanType.slice(dotIdx + 1).trim();
            references = {table: refTable, column: refCol};
            isForeignKey = true;
            connections.push({
              id: `edge-${parent.id}-${colName}->${refTable}.${refCol}`,
              sourceId: parent.id,
              sourceMember: colName,
              targetId: `table-${refTable}`,
              targetMember: refCol,
              type: 'foreignKey',
            });
          }

          const colDef: ColumnDefinition = {
            name: colName,
            type: cleanType,
            isPrimary,
            isUnique,
            isForeignKey,
            isNullable: isNullable || undefined,
            isIndexed: isIndexed || undefined,
            defaultValue: isDefault ? 'default' : undefined,
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

    // 10. Members under State Slice
    if (parent && parent.type === 'state') {
      const currentState = states.find(s => s.id === parent.id);
      if (currentState) {
        // action <name>(<params>)[: <returnType>]
        const actionMatch = trimmed.match(
          /^action\s+([A-Za-z0-9_$]+)(?:\((.*?)\))?(?:\s*:\s*(.+))?/i
        );
        if (actionMatch) {
          currentState.fields.push({
            name: actionMatch[1],
            type: actionMatch[3] ? actionMatch[3].trim() : 'void',
            modifier: 'action',
          });
          continue;
        }

        // [get|set] <name>: <type> or [+\-#]? <name>: <type>
        const fieldMatch = trimmed.match(
          /^(?:([+\-#]|get|set)\s+)?([A-Za-z0-9_$]+)\s*:\s*(.+)$/i
        );
        if (fieldMatch) {
          const mod = fieldMatch[1]?.toLowerCase();
          const modifier = mod === 'get' || mod === 'set' ? mod : undefined;
          currentState.fields.push({
            name: fieldMatch[2],
            type: fieldMatch[3].trim(),
            modifier,
          });
          continue;
        }
      }
    }

    // 11. Members under Class / Type
    if (parent && parent.type === 'class') {
      const currentClass = classes.find(c => c.id === parent.id);
      if (!currentClass) continue;

      // Parse modifiers / visibility: [visibility]? [modifier]? ...
      const classMemberRegex =
        /^(?:([+\-#]|public|private|protected|readonly)\s+)?(?:(static|async|get|set)\s+)?(.*)$/i;
      const memberMatch = trimmed.match(classMemberRegex);

      if (
        memberMatch &&
        (memberMatch[1] ||
          memberMatch[2] ||
          /^[A-Za-z0-9_$]+(\?|\s*\(|\s*:)/.test(trimmed)) &&
        !/^(call|calls|emit|emits|dispatch|dispatches|query|queries|mutate|mutates|render|renders|invokes|binds?|->)\b/i.test(
          trimmed
        )
      ) {
        const visibility = parseVisibility(memberMatch[1]);
        const modifierStr = memberMatch[2]?.toLowerCase();
        const isStatic = modifierStr === 'static' ? true : undefined;
        const isAsync = modifierStr === 'async' ? true : undefined;
        const accessor =
          modifierStr === 'get' || modifierStr === 'set'
            ? (modifierStr as 'get' | 'set')
            : undefined;
        const memberContent = (memberMatch[3] || '').trim();

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
            isStatic,
            isAsync,
            accessor,
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
              states,
              functions
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

        const propMatch = mainContent.match(
          /^([A-Za-z0-9_$]+)(\?)?\s*:\s*(.+)$/
        );
        if (propMatch) {
          const propName = propMatch[1];
          const isOptional = !!propMatch[2] || undefined;
          const propType = propMatch[3].trim();

          const propertyDef: PropertyDefinition = {
            name: propName,
            visibility,
            type: propType,
            isOptional,
            isStatic,
            accessor,
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

      // Direct class dependency / call: calls Target, -> Target, or binds Target, or call/emit/dispatch/query/mutate/render
      const callMatch = trimmed.match(
        /^(calls?|invokes?|->|binds?|emit|emits?|dispatch|dispatches?|query|queries?|mutate|mutates?|render|renders?)(?:\s+(.+))?$/i
      );
      if (callMatch) {
        const keyword = callMatch[1].toLowerCase();
        let verb:
          | 'call'
          | 'emit'
          | 'dispatch'
          | 'query'
          | 'mutate'
          | 'render'
          | 'binds'
          | 'invokes' = 'call';
        if (keyword.startsWith('emit')) verb = 'emit';
        else if (keyword.startsWith('dispatch')) verb = 'dispatch';
        else if (keyword.startsWith('query')) verb = 'query';
        else if (keyword.startsWith('mutate')) verb = 'mutate';
        else if (keyword.startsWith('render')) verb = 'render';
        else if (keyword.startsWith('bind')) verb = 'binds';
        else if (
          keyword === '->' ||
          keyword.startsWith('invoke') ||
          keyword.startsWith('call')
        )
          verb = 'invokes';

        const isBinds = verb === 'binds';
        const rawTargetStr = (callMatch[2] || '').trim();
        if (!rawTargetStr) {
          diagnostics.push({
            line: lineNum,
            message: `Incomplete invocation statement: expected target entity after "${callMatch[1]}"`,
            severity: 'info',
          });
          continue;
        }

        // Parse target.member(payload)
        let targetStr = rawTargetStr;
        let payload: string | undefined;
        const parenIdx = targetStr.indexOf('(');
        if (parenIdx !== -1 && targetStr.endsWith(')')) {
          payload = targetStr.slice(parenIdx + 1, -1).trim();
          targetStr = targetStr.slice(0, parenIdx).trim();
        }

        // Support prefixes like ui.Component
        let targetClass = targetStr;
        let targetMethod = '';
        const dotIdx = targetStr.indexOf('.');
        if (dotIdx !== -1) {
          targetClass = targetStr.slice(0, dotIdx).trim();
          targetMethod = targetStr.slice(dotIdx + 1).trim();
        }

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
          states,
          functions
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
            const callObj: MethodCall = {
              targetClass,
              targetMethod,
            };
            if (verb !== 'call' && verb !== 'invokes' && verb !== 'binds') {
              callObj.verb = verb;
            }
            if (payload) {
              callObj.payload = payload;
            }
            lastMethod.calls.push(callObj);
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
              type:
                verb === 'call' || verb === 'invokes' || verb === 'binds'
                  ? 'invokes'
                  : verb,
            });
          }
        } else {
          connections.push({
            id: `edge-${currentClass.id}-calls->${targetClass}${targetMethod ? '.' + targetMethod : ''}`,
            sourceId: currentClass.id,
            targetId,
            targetMember: targetMethod || undefined,
            type:
              verb === 'call' || verb === 'invokes' || verb === 'binds'
                ? 'invokes'
                : verb,
          });
        }
        continue;
      }
    }

    // 12. Invocations under Method or Function: call Target.method(args), etc.
    if (parent && (parent.type === 'method' || parent.type === 'function')) {
      const parentClass =
        parent.type === 'method'
          ? classes.find(c => c.id === parent.parentClassId)
          : null;
      const parentMethod = parentClass?.methods.find(
        m => m.name === parent.name
      );
      const parentFunction =
        parent.type === 'function'
          ? functions.find(f => f.id === parent.id)
          : null;

      if ((parentClass && parentMethod) || parentFunction) {
        let verb:
          | 'call'
          | 'emit'
          | 'dispatch'
          | 'query'
          | 'mutate'
          | 'render'
          | undefined;
        let targetStr = trimmed;

        // Strip leading symbols: '->', 'calls', '-', '+', '*', or verbs
        if (targetStr.startsWith('->')) {
          targetStr = targetStr.slice(2).trim();
        } else if (/^[+\-*]\s*(->)?\s*/.test(targetStr)) {
          targetStr = targetStr.replace(/^[+\-*]\s*(->)?\s*/, '').trim();
        } else {
          const verbMatch = targetStr.match(
            /^(call|calls|emit|emits|dispatch|dispatches|query|queries|mutate|mutates|render|renders|invokes)\b/i
          );
          if (verbMatch) {
            const v = verbMatch[1].toLowerCase();
            if (v.startsWith('emit')) verb = 'emit';
            else if (v.startsWith('dispatch')) verb = 'dispatch';
            else if (v.startsWith('query')) verb = 'query';
            else if (v.startsWith('mutate')) verb = 'mutate';
            else if (v.startsWith('render')) verb = 'render';
            else if (v === 'call') verb = 'call';
            targetStr = targetStr.slice(verbMatch[0].length).trim();
          }
        }

        let payload: string | undefined;
        const parenIdx = targetStr.indexOf('(');
        if (parenIdx !== -1 && targetStr.endsWith(')')) {
          payload = targetStr.slice(parenIdx + 1, -1).trim();
          targetStr = targetStr.slice(0, parenIdx).trim();
        } else if (targetStr.endsWith('()')) {
          targetStr = targetStr.slice(0, -2).trim();
        }

        if (targetStr) {
          const dotIdx = targetStr.indexOf('.');
          let targetClass =
            dotIdx !== -1 ? targetStr.slice(0, dotIdx).trim() : '';
          let targetMethod =
            dotIdx !== -1
              ? targetStr.slice(dotIdx + 1).trim()
              : targetStr.trim();

          if (dotIdx === -1) {
            const cleaned = targetStr.trim();
            const isLocal =
              parentClass &&
              (parentClass.methods.some(m => m.name === cleaned) ||
                /^[a-z]/.test(cleaned));
            if (isLocal && parentClass) {
              targetClass = parentClass.name;
              targetMethod = cleaned;
            } else {
              targetClass = cleaned;
              targetMethod = '';
            }
          } else if (
            parentClass &&
            (targetClass.toLowerCase() === 'this' ||
              targetClass.toLowerCase() === 'self')
          ) {
            targetClass = parentClass.name;
          }

          const callList = parentMethod
            ? parentMethod.calls
            : parentFunction?.calls;
          if (callList) {
            const alreadyHasCall = callList.some(
              c =>
                c.targetClass === targetClass && c.targetMethod === targetMethod
            );
            if (!alreadyHasCall) {
              const callObj: MethodCall = {
                targetClass,
                targetMethod,
              };
              if (verb) {
                callObj.verb = verb;
              }
              if (payload) {
                callObj.payload = payload;
              }
              callList.push(callObj);
            }
          }

          const targetId = resolveTargetEntityId(
            targetClass,
            classes,
            tables,
            apiRoutes,
            events,
            states,
            functions
          );

          const sourceId = parentClass ? parentClass.id : parentFunction!.id;
          const sourceMember = parentMethod ? parentMethod.name : undefined;

          const alreadyHasConn = connections.some(
            c =>
              c.sourceId === sourceId &&
              c.sourceMember === sourceMember &&
              c.targetId === targetId &&
              c.targetMember === (targetMethod || undefined)
          );

          if (!alreadyHasConn) {
            const connType = !verb || verb === 'call' ? 'invokes' : verb;
            connections.push({
              id: `edge-${sourceId}-${sourceMember || 'call'}->${targetClass}.${targetMethod}`,
              sourceId,
              sourceMember,
              targetId,
              targetMember: targetMethod || undefined,
              type: connType,
            });
          }
          continue;
        }

        if (
          /^(call|calls|emit|emits|dispatch|dispatches|query|queries|mutate|mutates|render|renders|invokes|->)$/i.test(
            trimmed
          )
        ) {
          diagnostics.push({
            line: lineNum,
            message: `Incomplete invocation statement: expected target entity or method after "${trimmed}"`,
            severity: 'info',
          });
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
      const matchingFunction = functions.find(f => f.name === targetName);
      if (matchingFunction) {
        conn.targetId = matchingFunction.id;
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
    functions,
    connections,
    diagnostics,
  };
}
