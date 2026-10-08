import {type ArchitectureProject} from '../../types/spec';

export interface AutocompleteItem {
  label: string;
  kind:
    | 'keyword'
    | 'class'
    | 'method'
    | 'type'
    | 'table'
    | 'api'
    | 'event'
    | 'state';
  insertText: string;
  detail?: string;
}

export interface ReferencedItem {
  id: string;
  name: string;
  member?: string;
  kind: 'class' | 'table' | 'api' | 'event' | 'ui' | 'state' | 'type';
}

/**
 * Common primitive and utility types for code autocomplete
 */
export const COMMON_TYPES = [
  'string',
  'number',
  'boolean',
  'void',
  'any',
  'unknown',
  'null',
  'undefined',
  'Date',
  'Record<string, any>',
  'Promise<void>',
  'uuid',
];

/**
 * Top-level DSL keywords
 */
export const DSL_KEYWORDS = [
  {label: 'class', detail: 'Class or service definition'},
  {label: 'interface', detail: 'Interface definition'},
  {label: 'type', detail: 'Type alias'},
  {label: 'ui', detail: 'UI Component declaration'},
  {label: 'db', detail: 'Database table declaration'},
  {label: 'api', detail: 'REST API route declaration'},
  {label: 'event', detail: 'Event emission declaration'},
  {label: 'state', detail: 'State store slice declaration'},
  {label: 'binds', detail: 'Bind service to UI component'},
  {label: 'calls', detail: 'Invoke method on service'},
  {label: 'emits', detail: 'Emit event message'},
  {label: 'pk', detail: 'Primary key modifier'},
  {label: 'fk', detail: 'Foreign key modifier'},
  {label: 'unique', detail: 'Unique column constraint'},
  {label: 'nullable', detail: 'Nullable column constraint'},
  {label: 'GET', detail: 'HTTP GET endpoint'},
  {label: 'POST', detail: 'HTTP POST endpoint'},
  {label: 'PUT', detail: 'HTTP PUT endpoint'},
  {label: 'DELETE', detail: 'HTTP DELETE endpoint'},
  {label: 'PATCH', detail: 'HTTP PATCH endpoint'},
];

/**
 * Compute indentation for new line on Enter press.
 * Automatically indents when completing a block header or nesting invocations.
 */
export function computeEnterIndent(currentLine: string): string {
  const match = currentLine.match(/^(\s*)/);
  const currentIndent = match ? match[1] : '';
  const trimmed = currentLine.trim();

  // If blank line, preserve current indent
  if (!trimmed) {
    return currentIndent;
  }

  // Declaration blocks (class, ui, db, api, event, state, interface, type)
  if (
    /^(class|interface|type|ui|db|api|event|state)\s+/.test(trimmed) ||
    trimmed.endsWith(':') ||
    trimmed.endsWith('{')
  ) {
    return currentIndent + '  ';
  }

  // Method declaration: + methodName(...): ReturnType
  // If user hits Enter on a method, check if they intend to write sub-bullets or next member
  // If it's a method header without sub-bullets yet, we can keep indent (or if it ends with '->', add 2 spaces)
  if (/^[+#\\-]\s*[A-Za-z0-9_$]+\s*\(.*?\)/.test(trimmed)) {
    // If it ends with -> or calls, indent sub-bullet
    if (trimmed.endsWith('->') || trimmed.endsWith('calls')) {
      return currentIndent + '  ';
    }
  }

  // Sub-bullet invocation: - Target.method or -> Target.method or calls Target.method
  if (/^(-\s*|->\s*|calls\s+)/.test(trimmed)) {
    return currentIndent;
  }

  return currentIndent;
}

/**
 * Handle Tab and Shift-Tab block indentation across single or multiple lines.
 */
export function handleTabIndent(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  isShift: boolean
): {newValue: string; newStart: number; newEnd: number} {
  const isMultiLine = value.slice(selectionStart, selectionEnd).includes('\n');

  if (!isMultiLine && !isShift) {
    // Single cursor / single-line tab insertion: insert 2 spaces
    const newValue =
      value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
    return {
      newValue,
      newStart: selectionStart + 2,
      newEnd: selectionStart + 2,
    };
  }

  // Find line boundaries enclosing the selection
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  let lineEnd = value.indexOf('\n', selectionEnd);
  if (lineEnd === -1) lineEnd = value.length;

  const lines = value.slice(lineStart, lineEnd).split('\n');

  if (isShift) {
    // Outdent: remove up to 2 leading spaces from each line
    let removedChars = 0;
    let firstLineRemoved = 0;
    const modifiedLines = lines.map((line, idx) => {
      let spacesToRemove = 0;
      if (line.startsWith('  ')) {
        spacesToRemove = 2;
      } else if (line.startsWith(' ')) {
        spacesToRemove = 1;
      }
      removedChars += spacesToRemove;
      if (idx === 0) firstLineRemoved = spacesToRemove;
      return line.slice(spacesToRemove);
    });

    const newValue =
      value.substring(0, lineStart) +
      modifiedLines.join('\n') +
      value.substring(lineEnd);

    const newStart = Math.max(lineStart, selectionStart - firstLineRemoved);
    const newEnd = Math.max(newStart, selectionEnd - removedChars);

    return {newValue, newStart, newEnd};
  } else {
    // Indent: add 2 leading spaces to each line
    const addedChars = lines.length * 2;
    const modifiedLines = lines.map(line => '  ' + line);

    const newValue =
      value.substring(0, lineStart) +
      modifiedLines.join('\n') +
      value.substring(lineEnd);

    return {
      newValue,
      newStart: selectionStart + 2,
      newEnd: selectionEnd + addedChars,
    };
  }
}

/**
 * Handle auto-closing bracket or quote pairs.
 */
export const BRACKET_PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

export const CLOSING_BRACKETS = new Set([')', ']', '}', '"', "'", '`']);

export function handleBracketPair(
  char: string,
  value: string,
  selectionStart: number,
  selectionEnd: number
): {newValue: string; newStart: number; newEnd: number} | null {
  const closingPair = BRACKET_PAIRS[char];

  // Selection wrapping: if user selected text and typed (, [, {, ", ', wrap it!
  if (selectionStart !== selectionEnd && closingPair) {
    const selectedText = value.slice(selectionStart, selectionEnd);
    const newValue =
      value.substring(0, selectionStart) +
      char +
      selectedText +
      closingPair +
      value.substring(selectionEnd);
    return {
      newValue,
      newStart: selectionStart + 1,
      newEnd: selectionEnd + 1,
    };
  }

  // If user typed a closing bracket directly in front of the exact closing bracket, just step over it
  if (
    selectionStart === selectionEnd &&
    CLOSING_BRACKETS.has(char) &&
    value[selectionStart] === char
  ) {
    return {
      newValue: value,
      newStart: selectionStart + 1,
      newEnd: selectionStart + 1,
    };
  }

  // Insert pair at cursor
  if (selectionStart === selectionEnd && closingPair) {
    const newValue =
      value.substring(0, selectionStart) +
      char +
      closingPair +
      value.substring(selectionEnd);
    return {
      newValue,
      newStart: selectionStart + 1,
      newEnd: selectionStart + 1,
    };
  }

  return null;
}

/**
 * Handle Backspace key to delete matching empty bracket pair.
 */
export function handleBackspaceBracket(
  value: string,
  selectionStart: number,
  selectionEnd: number
): {newValue: string; newCursor: number} | null {
  if (selectionStart !== selectionEnd || selectionStart === 0) return null;

  const prevChar = value[selectionStart - 1];
  const nextChar = value[selectionStart];

  if (BRACKET_PAIRS[prevChar] === nextChar) {
    const newValue =
      value.substring(0, selectionStart - 1) +
      value.substring(selectionStart + 1);
    return {
      newValue,
      newCursor: selectionStart - 1,
    };
  }

  return null;
}

/**
 * Toggle line comments with Ctrl+/ or Cmd+/
 */
export function toggleLineComment(
  value: string,
  selectionStart: number,
  selectionEnd: number
): {newValue: string; newStart: number; newEnd: number} {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  let lineEnd = value.indexOf('\n', selectionEnd);
  if (lineEnd === -1) lineEnd = value.length;

  const lines = value.slice(lineStart, lineEnd).split('\n');
  const allCommented = lines.every(
    line => line.trim().length === 0 || line.trim().startsWith('//')
  );

  let deltaStart = 0;
  let totalDelta = 0;

  const modifiedLines = lines.map((line, idx) => {
    let modified = line;
    let delta = 0;
    if (allCommented) {
      // Uncomment
      const commentIdx = line.indexOf('//');
      if (commentIdx !== -1) {
        const afterComment = line.slice(commentIdx + 2);
        const spacesToRemove = afterComment.startsWith(' ') ? 3 : 2;
        modified =
          line.slice(0, commentIdx) + line.slice(commentIdx + spacesToRemove);
        delta = -spacesToRemove;
      }
    } else {
      // Comment out
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const rest = line.slice(indent.length);
      modified = `${indent}// ${rest}`;
      delta = 3;
    }

    if (idx === 0) deltaStart = delta;
    totalDelta += delta;
    return modified;
  });

  const newValue =
    value.substring(0, lineStart) +
    modifiedLines.join('\n') +
    value.substring(lineEnd);

  const newStart = Math.max(lineStart, selectionStart + deltaStart);
  const newEnd = Math.max(newStart, selectionEnd + totalDelta);

  return {newValue, newStart, newEnd};
}

/**
 * Extract active word prefix and context before cursor
 */
export function getActiveTokenInfo(
  value: string,
  cursor: number
): {
  prefix: string;
  line: string;
  col: number;
  isAfterArrowOrCall: boolean;
  isAfterColon: boolean;
  isSubBullet: boolean;
} {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const line = value.slice(lineStart, cursor);
  const col = cursor - lineStart;

  const match = line.match(/([A-Za-z0-9_$.]+)$/);
  const prefix = match ? match[1] : '';

  const isAfterArrowOrCall = /(->|calls|-)\s*[A-Za-z0-9_$.]*$/.test(line);
  const isAfterColon = /:\s*[A-Za-z0-9_$.]*$/.test(line);
  const isSubBullet = /^\s*(-|->|calls)\s+/.test(line);

  return {
    prefix,
    line,
    col,
    isAfterArrowOrCall,
    isAfterColon,
    isSubBullet,
  };
}

/**
 * Compute autocomplete suggestions based on current token and project context
 */
export function getAutocompleteSuggestions(
  tokenInfo: ReturnType<typeof getActiveTokenInfo>,
  project?: ArchitectureProject
): AutocompleteItem[] {
  const {prefix, isAfterArrowOrCall, isAfterColon} = tokenInfo;
  const query = prefix.toLowerCase();
  const suggestions: AutocompleteItem[] = [];

  // If user is after a dot (e.g. TargetClass. or Pi.)
  if (prefix.includes('.')) {
    const [targetName, memberPrefix] = prefix.split('.');
    const memberQuery = (memberPrefix || '').toLowerCase();

    // Look for target in classes
    const targetClass = project?.classes.find(
      c => c.name.toLowerCase() === targetName.toLowerCase()
    );
    if (targetClass) {
      targetClass.methods.forEach(m => {
        if (!memberQuery || m.name.toLowerCase().startsWith(memberQuery)) {
          suggestions.push({
            label: `${m.name}()`,
            kind: 'method',
            insertText: `${targetName}.${m.name}()`,
            detail: `${targetClass.name}.${m.name}(): ${m.returnType}`,
          });
        }
      });
      targetClass.properties?.forEach(p => {
        if (!memberQuery || p.name.toLowerCase().startsWith(memberQuery)) {
          suggestions.push({
            label: p.name,
            kind: 'method',
            insertText: `${targetName}.${p.name}`,
            detail: `${targetClass.name}.${p.name}: ${p.type}`,
          });
        }
      });
    }

    // Look for target in tables
    const targetTable = project?.tables?.find(
      t => t.name.toLowerCase() === targetName.toLowerCase()
    );
    if (targetTable) {
      targetTable.columns.forEach(col => {
        if (!memberQuery || col.name.toLowerCase().startsWith(memberQuery)) {
          suggestions.push({
            label: col.name,
            kind: 'type',
            insertText: `${targetName}.${col.name}`,
            detail: `${targetTable.name}.${col.name}: ${col.type}`,
          });
        }
      });
    }

    return suggestions;
  }

  // 1. Invocation context (after ->, calls, or -)
  if (isAfterArrowOrCall) {
    project?.classes.forEach(cls => {
      if (!query || cls.name.toLowerCase().includes(query)) {
        suggestions.push({
          label: cls.name,
          kind: 'class',
          insertText: cls.name,
          detail: `Class ${cls.name}`,
        });
      }
      cls.methods.forEach(m => {
        const fullCall = `${cls.name}.${m.name}`;
        if (!query || fullCall.toLowerCase().includes(query)) {
          suggestions.push({
            label: fullCall,
            kind: 'method',
            insertText: `${fullCall}()`,
            detail: `Invoke ${cls.name}.${m.name}(): ${m.returnType}`,
          });
        }
      });
    });

    project?.tables?.forEach(tbl => {
      if (!query || tbl.name.toLowerCase().includes(query)) {
        suggestions.push({
          label: tbl.name,
          kind: 'table',
          insertText: tbl.name,
          detail: `Table ${tbl.name}`,
        });
      }
    });

    return suggestions.slice(0, 8);
  }

  // 2. Type definition context (after :)
  if (isAfterColon) {
    // Add primitive types
    COMMON_TYPES.forEach(t => {
      if (!query || t.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: t,
          kind: 'type',
          insertText: t,
          detail: 'Primitive type',
        });
      }
    });

    // Add classes/entities as return/field types
    project?.classes.forEach(c => {
      if (!query || c.name.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: c.name,
          kind: 'class',
          insertText: c.name,
          detail: `Entity type ${c.name}`,
        });
      }
    });

    project?.tables?.forEach(t => {
      if (!query || t.name.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: t.name,
          kind: 'table',
          insertText: t.name,
          detail: `Table record ${t.name}`,
        });
      }
    });

    return suggestions.slice(0, 8);
  }

  // 3. General Token Context
  if (query.length > 0) {
    // Top-level keywords
    DSL_KEYWORDS.forEach(kw => {
      if (kw.label.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: kw.label,
          kind: 'keyword',
          insertText: kw.label,
          detail: kw.detail,
        });
      }
    });

    // Known classes
    project?.classes.forEach(cls => {
      if (cls.name.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: cls.name,
          kind: 'class',
          insertText: cls.name,
          detail: `Class ${cls.name}`,
        });
      }
    });

    // Known tables
    project?.tables?.forEach(tbl => {
      if (tbl.name.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: tbl.name,
          kind: 'table',
          insertText: tbl.name,
          detail: `Table ${tbl.name}`,
        });
      }
    });

    // UI components
    project?.uiComponents.forEach(ui => {
      if (ui.name.toLowerCase().startsWith(query)) {
        suggestions.push({
          label: ui.name,
          kind: 'keyword',
          insertText: ui.name,
          detail: `UI Component ${ui.name}`,
        });
      }
    });
  }

  return suggestions.slice(0, 8);
}

/**
 * Extract referenced entities and methods in a snippet for chip rendering.
 */
export function extractReferencedItems(
  snippet: string,
  project?: ArchitectureProject
): ReferencedItem[] {
  const lines = snippet.split('\n');
  const itemsMap = new Map<string, ReferencedItem>();

  const knownClassNames = new Set(project?.classes.map(c => c.name) || []);
  const knownTableNames = new Set(project?.tables?.map(t => t.name) || []);
  const knownEventNames = new Set(project?.events?.map(e => e.name) || []);

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Invocations: -> Target.method, calls Target.method, - Target.method
    const invMatch = trimmed.match(
      /(?:->|calls|-)\s*([A-Za-z0-9_$]+)(?:\.([A-Za-z0-9_$]+))?/
    );
    if (invMatch) {
      const targetName = invMatch[1];
      const member = invMatch[2];
      const kind = knownTableNames.has(targetName) ? 'table' : 'class';
      const key = `${targetName}${member ? '.' + member : ''}`;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          id: `ref-${key}`,
          name: targetName,
          member,
          kind,
        });
      }
    }

    // 2. Bound services: binds ServiceName
    const bindsMatch = trimmed.match(/^binds\s+([A-Za-z0-9_$,\s]+)/);
    if (bindsMatch) {
      const services = bindsMatch[1].split(/[\s,]+/).filter(Boolean);
      services.forEach(s => {
        if (!itemsMap.has(s)) {
          itemsMap.set(s, {
            id: `ref-${s}`,
            name: s,
            kind: 'class',
          });
        }
      });
    }

    // 3. Return types: + start(): Pi.help or + method(): Target
    const retMatch = trimmed.match(
      /:\s*([A-Za-z0-9_$]+)(?:\.([A-Za-z0-9_$]+))?/
    );
    if (retMatch) {
      const typeName = retMatch[1];
      const member = retMatch[2];
      if (
        knownClassNames.has(typeName) ||
        knownTableNames.has(typeName) ||
        knownEventNames.has(typeName)
      ) {
        const kind = knownTableNames.has(typeName)
          ? 'table'
          : knownEventNames.has(typeName)
            ? 'event'
            : 'class';
        const key = `${typeName}${member ? '.' + member : ''}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: `ref-${key}`,
            name: typeName,
            member,
            kind,
          });
        }
      }
    }

    // 4. Emitted events: emits EventName
    const emitsMatch = trimmed.match(/^emits\s+([A-Za-z0-9_$]+)/);
    if (emitsMatch) {
      const eventName = emitsMatch[1];
      if (!itemsMap.has(eventName)) {
        itemsMap.set(eventName, {
          id: `ref-${eventName}`,
          name: eventName,
          kind: 'event',
        });
      }
    }
  }

  return Array.from(itemsMap.values());
}

/**
 * Extract exact verbatim raw slice for an entity from raw outline text.
 */
export function extractEntityRawSnippet(
  fullText: string,
  entityName: string
): string | null {
  const lines = fullText.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.search(/\S/);

    const declMatch = trimmed.match(
      /^(class|type|interface|ui|db|api|event|state)\s+([A-Za-z0-9_$/]+)/
    );
    if (declMatch && declMatch[2] === entityName) {
      startIdx = i;
      baseIndent = indent;
      continue;
    }

    if (startIdx !== -1 && endIdx === -1) {
      if (trimmed === '') {
        continue;
      }
      if (indent <= baseIndent) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx !== -1) {
    if (endIdx === -1) endIdx = lines.length;
    // Trim empty lines at end of entity snippet
    let last = endIdx;
    while (last > startIdx && lines[last - 1].trim() === '') {
      last--;
    }
    return lines.slice(startIdx, last).join('\n');
  }

  return null;
}
