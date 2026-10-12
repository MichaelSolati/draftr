import {parser} from '@draftr/grammar';

import {
  type ApiEndpoint,
  type ApiRouteSpec,
  type ClassSpec,
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
} from '../types/spec.js';

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

// (Rest of code continues)

export function parseOutline(text: string): ParseResult {
  const result: ParseResult = {
    classes: [],
    uiComponents: [],
    tables: [],
    apiRoutes: [],
    events: [],
    states: [],
    functions: [],
    connections: [],
    diagnostics: [],
  };

  const tree = parser.parse(text);

  const lineOffsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineOffsets.push(i + 1);
  }
  const getLine = (pos: number) => {
    let line = 1;
    for (let i = 0; i < lineOffsets.length; i++) {
      if (pos >= lineOffsets[i]) {
        line = i + 1;
      } else {
        break;
      }
    }
    return line;
  };

  tree.cursor().iterate(node => {
    if (node.name === '⚠') {
      result.diagnostics.push({
        line: getLine(node.from),
        message: 'Syntax error',
        severity: 'error',
      });
    }
  });

  function getText(node: any): string {
    if (!node) return '';
    return text.slice(node.from, node.to).trim();
  }

  function getChildren(node: any, name: string): any[] {
    const children = [];
    let child = node.firstChild;
    while (child) {
      if (child.name === name) children.push(child);
      child = child.nextSibling;
    }
    return children;
  }

  function parseModifiers(node: any) {
    const mods = getChildren(node, 'Modifier').map(getText);
    return {
      isStatic: mods.includes('static') ? true : undefined,
      isAsync: mods.includes('async') ? true : undefined,
      accessor: mods.includes('get')
        ? 'get'
        : mods.includes('set')
          ? 'set'
          : undefined,
    };
  }

  function parseParamList(paramList: any): MethodParameter[] {
    if (!paramList) return [];
    return getChildren(paramList, 'Param').map(param => {
      const name = getText(param.getChild('Identifier'));
      const isOptional = !!getText(param.getChild('?'));
      const typeNode = param.getChild('Type');
      return {
        name,
        type: typeNode ? getText(typeNode) : 'any',
        isOptional: isOptional || undefined,
      };
    });
  }

  function parseAction(
    actionNode: any,
    parentId: string,
    parentMember: string,
    verbOverride?: any
  ): MethodCall | undefined {
    const verbNode = actionNode.getChild('ActionVerb');
    const rawVerb = verbNode
      ? getText(verbNode).toLowerCase()
      : verbOverride || 'call';
    let verb: any = 'call';
    if (rawVerb.startsWith('emit')) verb = 'emit';
    else if (rawVerb.startsWith('dispatch')) verb = 'dispatch';
    else if (rawVerb.startsWith('query')) verb = 'query';
    else if (rawVerb.startsWith('mutate')) verb = 'mutate';
    else if (rawVerb.startsWith('render')) verb = 'render';

    const targetNode = actionNode.getChild('InvocationTarget');
    if (!targetNode || getText(targetNode) === '') {
      result.diagnostics.push({
        line: getLine(actionNode.from),
        message: `Incomplete invocation statement: expected target entity or method after "${rawVerb}"`,
        severity: 'info',
      });
      return undefined;
    }

    const targetStr = getText(targetNode);
    let targetClass = '';
    let targetMethod = '';
    if (targetStr.includes('.')) {
      const parts = targetStr.split('.');
      targetClass = parts[0].trim();
      targetMethod = parts.slice(1).join('.').trim();
    } else {
      const singleId = targetStr.trim();
      const currentEntity = result.classes.find(c => c.id === parentId);
      if (
        currentEntity &&
        (currentEntity.methods.some(m => m.name === singleId) ||
          /^[a-z]/.test(singleId))
      ) {
        targetClass = currentEntity.name;
        targetMethod = singleId;
      } else {
        targetClass = singleId;
        targetMethod = '';
      }
    }

    // Normalize this/self
    if (
      targetClass.toLowerCase() === 'this' ||
      targetClass.toLowerCase() === 'self'
    ) {
      const currentEntity = result.classes.find(c => c.id === parentId);
      if (currentEntity) targetClass = currentEntity.name;
    }

    let payload: string | undefined;
    const typeNode = actionNode.getChild('Type');
    if (typeNode) {
      payload = getText(typeNode);
    } else {
      const paramList = actionNode.getChild('ParamList');
      if (paramList) {
        payload = text.slice(paramList.from + 1, paramList.to - 1).trim();
      }
    }

    result.connections.push({
      id: `edge-${parentId}-${parentMember}->${targetClass}${targetMethod ? '.' + targetMethod : ''}`,
      sourceId: parentId,
      sourceMember: parentMember || undefined,
      targetId: `unresolved-${targetClass}`, // Will resolve later
      targetMember: targetMethod || undefined,
      type: verb === 'call' ? 'invokes' : verb,
    });

    const callObj: any = {targetClass, targetMethod, verb};
    if (payload) callObj.payload = payload;
    return callObj;
  }

  const program = tree.topNode;

  const currentUI: string[] = [];

  function walk(node: any, parentNode?: any) {
    if (!node) return;

    if (node.name === 'ClassDeclaration') {
      const classKw = node.getChild('ClassKeyword');
      const kindStr = getText(classKw).replace(/\s+/g, ' ');
      const kind =
        kindStr === 'abstract class'
          ? 'abstract'
          : (kindStr as 'class' | 'type' | 'interface');

      const identifiers = getChildren(node, 'Identifier');
      const name = getText(identifiers[0]);
      const id = `entity-${name}`;

      let superClass;
      const interfaces = [];
      let i = 1;
      const firstLine = text.slice(
        node.from,
        text.indexOf('\n', node.from) !== -1
          ? text.indexOf('\n', node.from)
          : node.to
      );
      if (firstLine.includes(' extends ')) {
        superClass = getText(identifiers[i++]);
        result.connections.push({
          id: `edge-${id}-inherits-entity-${superClass}`,
          sourceId: id,
          targetId: `unresolved-${superClass}`,
          type: 'inherits',
        });
      }
      if (firstLine.includes(' implements ')) {
        while (i < identifiers.length) {
          const iface = getText(identifiers[i++]);
          interfaces.push(iface);
          result.connections.push({
            id: `edge-${id}-implements-entity-${iface}`,
            sourceId: id,
            targetId: `unresolved-${iface}`,
            type: 'implements',
          });
        }
      }

      result.classes.push({
        id,
        name,
        kind,
        superClass,
        interfaces: interfaces.length ? interfaces : undefined,
        properties: [],
        methods: [],
      });

      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
    } else if (node.name === 'MethodDeclaration') {
      const visNode = node.getChild('Visibility');
      const visibility = parseVisibility(getText(visNode));
      const mods = parseModifiers(node);
      const name = getText(node.getChild('Identifier'));
      const typeNode = node.getChild('Type');
      const params = parseParamList(node.getChild('ParamList'));

      const methodSig: MethodSignature = {
        name,
        visibility,
        parameters: params,
        returnType: typeNode ? getText(typeNode) : 'void',
        isStatic: mods.isStatic,
        isAsync: mods.isAsync,
        accessor: mods.accessor as 'get' | 'set',
        calls: [],
      };

      const c = result.classes.find(c => c.id === parentNode);
      if (c) c.methods.push(methodSig);

      const inlineTarget = node.getChild('InvocationTarget');
      if (inlineTarget) {
        const inlineCall = parseAction(node, parentNode, name);
        if (inlineCall && c) {
          methodSig.calls = methodSig.calls || [];
          methodSig.calls.push(inlineCall);
        }
      }

      getChildren(node, 'ActionDeclaration').forEach(a => {
        const call = parseAction(a, parentNode, name);
        if (call && c) {
          methodSig.calls = methodSig.calls || [];
          methodSig.calls.push(call);
        }
      });
    } else if (node.name === 'PropertyDeclaration') {
      const visNode = node.getChild('Visibility');
      const visibility = parseVisibility(getText(visNode));
      const mods = parseModifiers(node);
      const name = getText(node.getChild('Identifier'));
      const isOptional = !!node.getChild('?');
      const typeNode = node.getChild('Type');

      const prop: PropertyDefinition = {
        name,
        visibility,
        type: typeNode ? getText(typeNode) : 'any',
        isOptional: isOptional || undefined,
        isStatic: mods.isStatic,
        accessor: mods.accessor as 'get' | 'set',
      };

      const c = result.classes.find(c => c.id === parentNode);
      if (c) c.properties.push(prop);

      const st = result.states.find(s => s.id === parentNode);
      if (st) {
        st.fields.push({
          name: prop.name,
          type: prop.type,
          modifier: mods.accessor as 'get' | 'set' | 'action' as
            | 'get'
            | 'set'
            | 'action',
        });
      }
    } else if (node.name === 'UiDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const id = `ui-${name}`;
      const parentUIId =
        currentUI.length > 0 ? currentUI[currentUI.length - 1] : undefined;

      const uiSpec: UIComponentSpec = {
        id,
        name,
        parentId: parentUIId,
        children: [],
        boundLogicEntities: [],
      };
      result.uiComponents.push(uiSpec);

      if (parentUIId) {
        const p = result.uiComponents.find(u => u.id === parentUIId);
        if (p) p.children.push(id);
      }

      currentUI.push(id);
      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
      currentUI.pop();
    } else if (node.name === 'PropDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const isOpt = !!node.getChild('?');
      const typeNode = node.getChild('Type');
      const u = result.uiComponents.find(u => u.id === parentNode);
      if (u) {
        u.props = u.props || [];
        u.props.push({
          name,
          isOptional: isOpt || undefined,
          type: typeNode ? getText(typeNode) : 'any',
        });
      }
    } else if (node.name === 'EmitDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const typeNode = node.getChild('Type');
      const u = result.uiComponents.find(u => u.id === parentNode);
      if (u) {
        u.emits = u.emits || [];
        u.emits.push({name, payloadType: typeNode ? getText(typeNode) : 'any'});
      }
    } else if (node.name === 'RenderDeclaration') {
      const target = node.getChild('InvocationTarget');
      const u = result.uiComponents.find(u => u.id === parentNode);
      if (u && target) {
        const targetStr = getText(target);
        const renderedName = targetStr.includes('.')
          ? targetStr.split('.')[1].trim()
          : targetStr.trim();
        u.renderedComponents = u.renderedComponents || [];
        u.renderedComponents.push(renderedName);
        result.connections.push({
          id: `edge-${u.id}-renders-ui-${renderedName}`,
          sourceId: u.id,
          targetId: `ui-${renderedName}`,
          type: 'render',
        });
      }
    } else if (node.name === 'BindsDeclaration') {
      const boundName = getText(node.getChild('Identifier'));
      const u = result.uiComponents.find(u => u.id === parentNode);
      if (u) {
        u.boundLogicEntities = u.boundLogicEntities || [];
        u.boundLogicEntities.push(boundName);
        result.connections.push({
          id: `edge-${u.id}-binds-entity-${boundName}`,
          sourceId: u.id,
          targetId: `unresolved-${boundName}`,
          type: 'binds',
        });
      }
      const c = result.classes.find(cl => cl.id === parentNode);
      if (c) {
        result.connections.push({
          id: `edge-${c.id}-binds-entity-${boundName}`,
          sourceId: c.id,
          targetId: `unresolved-${boundName}`,
          type: 'invokes',
        });
      }
    } else if (node.name === 'TableDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const id = `table-${name}`;
      result.tables.push({id, name, columns: []});
      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
    } else if (node.name === 'ColumnDeclaration') {
      const mods = getChildren(node, 'ColumnModifier')
        .map(getText)
        .map(s => s.toLowerCase());
      const name = getText(node.getChild('Identifier'));
      const isOpt = !!node.getChild('?');
      const typeStr = getText(node.getChild('Type'));

      const isPrimary = mods.includes('pk');
      const isUnique = mods.includes('unique') || isPrimary;
      let isForeignKey = mods.includes('fk');
      const isNullable = mods.includes('nullable') || isOpt;
      const isIndexed = mods.includes('index');
      const isDefault = mods.includes('default');

      let references;
      const dotIdx = typeStr.indexOf('.');
      if (dotIdx !== -1) {
        const refTable = typeStr.slice(0, dotIdx).trim();
        const refCol = typeStr.slice(dotIdx + 1).trim();
        references = {table: refTable, column: refCol};
        isForeignKey = true;
        result.connections.push({
          id: `edge-${parentNode}-${name}->${refTable}.${refCol}`,
          sourceId: parentNode,
          sourceMember: name,
          targetId: `table-${refTable}`,
          targetMember: refCol,
          type: 'foreignKey',
        });
      }

      const fkTarget = node.getChild('InvocationTarget');
      if (fkTarget) {
        const fkStr = getText(fkTarget);
        if (fkStr.includes('.')) {
          const parts = fkStr.split('.');
          const refTable = parts[0].trim();
          const refCol = parts[1].trim();
          references = {table: refTable, column: refCol};
          isForeignKey = true;
          result.connections.push({
            id: `edge-${parentNode}-${name}->${refTable}.${refCol}`,
            sourceId: parentNode,
            sourceMember: name,
            targetId: `table-${refTable}`,
            targetMember: refCol,
            type: 'foreignKey',
          });
        }
      }

      const t = result.tables.find(t => t.id === parentNode);
      if (t) {
        t.columns.push({
          name,
          type: typeStr,
          isPrimary,
          isUnique,
          isForeignKey,
          isNullable: isNullable || undefined,
          isIndexed: isIndexed || undefined,
          defaultValue: isDefault ? 'default' : undefined,
          references,
        });
      }
    } else if (node.name === 'ApiRouteDeclaration') {
      const pathNode =
        node.getChild('RoutePath') || node.getChild('Identifier');
      const path = getText(pathNode);
      const id = `api-${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      result.apiRoutes.push({id, path, endpoints: []});
      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
    } else if (node.name === 'ApiEndpointDeclaration') {
      const methodNode = node.getChild('HttpMethod');
      const method = methodNode
        ? (getText(methodNode).toUpperCase() as HttpMethod)
        : 'GET';
      const pathNode = node.getChild('RoutePath');
      const name = pathNode ? getText(pathNode) : '';

      const types = getChildren(node, 'Type');
      let requestType, responseType;
      if (types.length === 2) {
        requestType = getText(types[0]);
        responseType = getText(types[1]);
      } else if (types.length === 1) {
        // Simple heuristic based on text location if there's only one. But let's assume if it has `(` it's req type.
        // Or we can just use the type node index. The grammar distinguishes them by the "(" ")" wrapper but Lezer tree just gives 'Type'.
        const typeStr = getText(types[0]);
        // To precisely know, we check if there's a '(' before the type.
        // A hacky check is looking at the type text in the full text and see if it's inside parens.
        // Actually, we can get previous sibling.
        const prev = types[0].prevSibling;
        if (prev && getText(prev) === '(') requestType = typeStr;
        else responseType = typeStr;
      }

      const r = result.apiRoutes.find(r => r.id === parentNode);
      if (r) {
        const ep: ApiEndpoint = {method, name, requestType, responseType};
        r.endpoints.push(ep);
      }

      const callNode = node.getChild('InvocationTarget');
      if (callNode) {
        // Need to parse inline call!
        const verbNode = node.getChild('ActionVerb');
        const verb = verbNode ? getText(verbNode).toLowerCase() : 'call';
        const callStr = getText(callNode);
        const parts = callStr.split('.');
        const targetClass = parts[0].trim();
        const targetMethod =
          parts.length > 1 ? parts.slice(1).join('.').trim() : '';
        const epId = `${parentNode}-${method}-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        result.connections.push({
          id: `edge-${epId}->${targetClass}${targetMethod ? '.' + targetMethod : ''}`,
          sourceId: parentNode,
          sourceMember: name,
          targetId: `unresolved-${targetClass}`,
          targetMember: targetMethod || undefined,
          type: verb as any,
        });

        // Also update the targetHandler of the endpoint
        const r = result.apiRoutes.find(r => r.id === parentNode);
        if (r && r.endpoints.length > 0) {
          r.endpoints[r.endpoints.length - 1].targetHandler = {
            targetClass,
            targetMethod,
          };
        }
      }
    } else if (node.name === 'EventDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const id = `event-${name}`;
      const typeNode = node.getChild('Type');
      let payloadType = typeNode ? getText(typeNode) : undefined;
      if (!payloadType) {
        const paramList = node.getChild('ParamList');
        if (paramList) {
          const param = paramList.getChild('Param');
          if (param) {
            const pType = param.getChild('Type');
            payloadType = pType
              ? getText(pType)
              : getText(param.getChild('Identifier'));
          }
        }
      }

      const eventSpec: EventSpec = {id, name, payloadType, targets: []};
      result.events.push(eventSpec);

      const targetNode = node.getChild('InvocationTarget');
      if (targetNode) {
        const targetStr = getText(targetNode);
        const parts = targetStr.split('.');
        const targetClass = parts[0].trim();
        const targetMethod =
          parts.length > 1 ? parts.slice(1).join('.').trim() : 'handle';
        eventSpec.targets.push({targetClass, targetMethod});
        result.connections.push({
          id: `edge-${id}-emits->${targetClass}.${targetMethod}`,
          sourceId: id,
          targetId: `unresolved-${targetClass}`,
          targetMember: targetMethod,
          type: 'emits',
        });
      }

      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
    } else if (node.name === 'FunctionDeclaration') {
      const visNode = node.getChild('Visibility');
      const visibility = parseVisibility(getText(visNode));
      const name = getText(node.getChild('Identifier'));
      const id = `func-${name}`;
      const typeNode = node.getChild('Type');
      const params = parseParamList(node.getChild('ParamList'));

      const funcSpec: FunctionSpec = {
        id,
        name,
        visibility,
        parameters: params,
        returnType: typeNode ? getText(typeNode) : 'void',
        calls: [],
      };
      if (!result.functions) result.functions = [];
      result.functions.push(funcSpec);

      getChildren(node, 'ActionDeclaration').forEach(a => {
        const call = parseAction(a, id, name);
        if (call) {
          funcSpec.calls = funcSpec.calls || [];
          funcSpec.calls.push(call);
        }
      });
    } else if (node.name === 'StateDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const id = `state-${name}`;
      result.states.push({id, name, fields: []});
      let child = node.firstChild;
      while (child) {
        walk(child, id);
        child = child.nextSibling;
      }
    } else if (node.name === 'StateActionDeclaration') {
      const name = getText(node.getChild('Identifier'));
      const typeNode = node.getChild('Type');
      const st = result.states.find(s => s.id === parentNode);
      if (st) {
        st.fields.push({
          name,
          type: typeNode ? getText(typeNode) : 'void',
          modifier: 'action',
        });
      }
    } else if (node.name === 'ActionDeclaration') {
      const u = result.uiComponents.find(ui => ui.id === parentNode);
      if (u) {
        const verbNode = node.getChild('ActionVerb');
        const rawVerb = verbNode ? getText(verbNode).toLowerCase() : 'call';
        const targetNode = node.getChild('InvocationTarget');
        const targetStr = targetNode ? getText(targetNode) : '';
        const typeNode = node.getChild('Type');
        const payloadType = typeNode ? getText(typeNode) : 'any';

        if (rawVerb.startsWith('emit')) {
          u.emits = u.emits || [];
          u.emits.push({name: targetStr, payloadType});
          return;
        } else if (rawVerb.startsWith('render')) {
          const renderedName = targetStr.includes('.')
            ? targetStr.split('.')[1]
            : targetStr;
          u.renderedComponents = u.renderedComponents || [];
          u.renderedComponents.push(renderedName);
          result.connections.push({
            id: `edge-${u.id}-renders-ui-${renderedName}`,
            sourceId: u.id,
            targetId: `ui-${renderedName}`,
            type: 'render',
          });
          return;
        }
      }

      const c = result.classes.find(cl => cl.id === parentNode);
      const lastMethod =
        c && c.methods.length > 0 ? c.methods[c.methods.length - 1] : undefined;
      const call = parseAction(
        node,
        parentNode,
        lastMethod ? lastMethod.name : ''
      );
      if (call && lastMethod) {
        lastMethod.calls = lastMethod.calls || [];
        lastMethod.calls.push(call);
      }
    } else {
      // Traverse children if unhandled explicitly
      let child = node.firstChild;
      while (child) {
        walk(child, parentNode);
        child = child.nextSibling;
      }
    }
  }

  walk(program);

  // Resolution pass
  for (const conn of result.connections) {
    if (conn.targetId.startsWith('unresolved-')) {
      const targetName = conn.targetId.slice('unresolved-'.length);
      conn.targetId = resolveTargetEntityId(
        targetName,
        result.classes,
        result.tables,
        result.apiRoutes,
        result.events,
        result.states,
        result.functions
      );
    }
  }

  // Filter out generic syntax errors on lines that already have specific diagnostics
  result.diagnostics = result.diagnostics.filter(d => {
    if (d.message === 'Syntax error') {
      return !result.diagnostics.some(
        other => other.line === d.line && other.message !== 'Syntax error'
      );
    }
    return true;
  });

  return result;
}
