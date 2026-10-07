import {
  type ClassSpec,
  type PropertyDefinition,
  type MethodSignature,
  type MethodParameter,
  type UIComponentSpec,
  type ConnectionEdge,
  type ParserDiagnostic,
  type Visibility,
} from '../../types/spec';

export interface ParseResult {
  classes: ClassSpec[];
  uiComponents: UIComponentSpec[];
  connections: ConnectionEdge[];
  diagnostics: ParserDiagnostic[];
}

function parseVisibility(char: string): Visibility {
  switch (char) {
    case '-':
      return 'private';
    case '#':
      return 'protected';
    case '+':
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

export function parseOutline(text: string): ParseResult {
  const lines = text.split('\n');
  const classes: ClassSpec[] = [];
  const uiComponents: UIComponentSpec[] = [];
  const connections: ConnectionEdge[] = [];
  const diagnostics: ParserDiagnostic[] = [];

  interface StackItem {
    indent: number;
    type: 'class' | 'ui';
    id: string;
    name: string;
  }

  const stack: StackItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];

    // Skip empty lines or full comment lines
    if (!rawLine.trim() || rawLine.trim().startsWith('//')) {
      continue;
    }

    const indent = rawLine.search(/\S/);
    const trimmed = rawLine.trim();

    // Pop stack items that have greater or equal indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack[stack.length - 1] : null;

    // Check entity declaration: class <Name>, type <Name>, interface <Name>
    const classMatch = trimmed.match(
      /^(class|type|interface)\s+([A-Za-z0-9_$]+)/
    );
    if (classMatch) {
      const kind = classMatch[1] as 'class' | 'type' | 'interface';
      const name = classMatch[2];
      const id = `entity-${name}`;

      const existing = classes.find(c => c.name === name);
      if (!existing) {
        classes.push({
          id,
          name,
          kind,
          properties: [],
          methods: [],
        });
        stack.push({indent, type: 'class', id, name});
      } else {
        diagnostics.push({
          line: lineNum,
          message: `Duplicate entity declaration "${name}"`,
          severity: 'warning',
        });
      }
      continue;
    }

    // Check UI component declaration: ui <Name>
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
          const parentComponent = uiComponents.find(u => u.id === parentUIId);
          if (parentComponent && !parentComponent.children.includes(id)) {
            parentComponent.children.push(id);
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

    // Check UI-to-Logic binding: binds <LogicEntity>
    const bindsMatch = trimmed.match(/^binds\s+([A-Za-z0-9_$]+)/);
    if (bindsMatch) {
      if (parent && parent.type === 'ui') {
        const targetEntity = bindsMatch[1];
        const currentUI = uiComponents.find(u => u.id === parent.id);
        if (currentUI && !currentUI.boundLogicEntities.includes(targetEntity)) {
          currentUI.boundLogicEntities.push(targetEntity);
          connections.push({
            id: `edge-${parent.id}-binds-${targetEntity}`,
            sourceId: parent.id,
            targetId: `entity-${targetEntity}`,
            type: 'binds',
          });
        }
      } else {
        diagnostics.push({
          line: lineNum,
          message: '"binds" keyword must be nested under a UI component',
          severity: 'warning',
        });
      }
      continue;
    }

    // Check member declaration (+, -, #) under class/type
    if (parent && parent.type === 'class') {
      const currentClass = classes.find(c => c.id === parent.id);
      if (!currentClass) continue;

      const memberMatch = trimmed.match(/^([+\-#])\s*(.*)$/);
      if (memberMatch) {
        const visibility = parseVisibility(memberMatch[1]);
        const memberContent = memberMatch[2].trim();

        // Check if there is an inline call: -> Target.method
        let inlineCall: {targetClass: string; targetMethod: string} | null =
          null;
        let mainContent = memberContent;

        const arrowIdx = memberContent.indexOf('->');
        if (arrowIdx !== -1) {
          const callTarget = memberContent.slice(arrowIdx + 2).trim();
          mainContent = memberContent.slice(0, arrowIdx).trim();

          const dotIdx = callTarget.indexOf('.');
          if (dotIdx !== -1) {
            inlineCall = {
              targetClass: callTarget.slice(0, dotIdx).trim(),
              targetMethod: callTarget.slice(dotIdx + 1).trim(),
            };
          } else if (callTarget) {
            inlineCall = {
              targetClass: callTarget,
              targetMethod: 'default',
            };
          }
        }

        // Check if method: methodName(args): returnType
        const methodMatch = mainContent.match(
          /^([A-Za-z0-9_$]+)\s*\((.*?)\)(\s*:\s*(.*))?$/
        );
        if (methodMatch) {
          const methodName = methodMatch[1];
          const paramStr = methodMatch[2];
          const returnType = methodMatch[4] ? methodMatch[4].trim() : 'void';
          const params = parseParameters(paramStr);

          const methodSignature: MethodSignature = {
            name: methodName,
            visibility,
            parameters: params,
            returnType,
            calls: inlineCall ? [inlineCall] : [],
          };
          currentClass.methods.push(methodSignature);

          if (inlineCall) {
            connections.push({
              id: `edge-${parent.id}-${methodName}->${inlineCall.targetClass}.${inlineCall.targetMethod}`,
              sourceId: parent.id,
              sourceMember: methodName,
              targetId: `entity-${inlineCall.targetClass}`,
              targetMember: inlineCall.targetMethod,
              type: 'invokes',
            });
          }
          continue;
        }

        // Check if property: propName: type
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

        // Malformed member
        diagnostics.push({
          line: lineNum,
          message: `Malformed member definition "${trimmed}". Expected "prop: type" or "method(params): returnType"`,
          severity: 'warning',
        });
        continue;
      }
    }

    // If not matched
    diagnostics.push({
      line: lineNum,
      message: `Unrecognized statement "${trimmed}"`,
      severity: 'info',
    });
  }

  return {classes, uiComponents, connections, diagnostics};
}
