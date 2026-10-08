import React from 'react';

interface SyntaxHighlightOverlayProps {
  text: string;
}

/**
 * Tokenize and render syntax-colored tokens for our DSL.
 * Colors keywords, types, functions, properties, invocations, comments, and strings.
 */
export const SyntaxHighlightOverlay: React.FC<SyntaxHighlightOverlayProps> = ({
  text,
}) => {
  const lines = text.split('\n');

  const renderHighlightedLine = (line: string, lineIndex: number) => {
    if (!line) {
      return '\n';
    }

    // Full line comment
    const trimmed = line.trimStart();
    const leadingWhitespace = line.slice(0, line.length - trimmed.length);

    if (trimmed.startsWith('//')) {
      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-muted-foreground/60 italic">{trimmed}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Sub-bullet method invocations: -> Target.method or calls Target.method or - Target.method
    const invMatch = trimmed.match(
      /^((?:->|calls|-)[ \t]+)([A-Za-z0-9_$]+)(?:\.([A-Za-z0-9_$]+))?(.*)$/
    );
    if (invMatch) {
      const [, arrow, targetClass, targetMethod, rest] = invMatch;
      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-violet-500 font-semibold">{arrow}</span>
          <span className="text-purple-400 font-medium">{targetClass}</span>
          {targetMethod && (
            <>
              <span className="text-muted-foreground">.</span>
              <span className="text-amber-400 font-medium">{targetMethod}</span>
            </>
          )}
          <span className="text-foreground">{rest}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Top-level declarations: class, ui, db, api, event, state, interface, type
    const declMatch = trimmed.match(
      /^(class|interface|type|ui|db|api|event|state)([ \t]+)([A-Za-z0-9_$/]+)(.*)$/i
    );
    if (declMatch) {
      const [, kw, space, name, rest] = declMatch;
      let nameColor = 'text-purple-400';
      if (kw.toLowerCase() === 'ui') nameColor = 'text-sky-400';
      if (kw.toLowerCase() === 'db') nameColor = 'text-emerald-400';
      if (kw.toLowerCase() === 'api') nameColor = 'text-amber-400';
      if (kw.toLowerCase() === 'event') nameColor = 'text-violet-400';
      if (kw.toLowerCase() === 'state') nameColor = 'text-cyan-400';

      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-pink-500 dark:text-pink-400 font-semibold">
            {kw}
          </span>
          <span>{space}</span>
          <span className={`${nameColor} font-bold`}>{name}</span>
          <span className="text-foreground">{rest}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Bound services: binds ServiceName
    const bindsMatch = trimmed.match(/^(binds)([ \t]+)(.*)$/);
    if (bindsMatch) {
      const [, kw, space, target] = bindsMatch;
      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-sky-500 font-semibold">{kw}</span>
          <span>{space}</span>
          <span className="text-purple-400 font-medium">{target}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Method signature: (+|-|#|public|private|protected|readonly|get|set) funcName(...): ReturnType -> Target.method
    const methodMatch = trimmed.match(
      /^([+\-#]|(?:public|private|protected|readonly|get|set)\b)([ \t]*)([A-Za-z0-9_$]+)(\(.*?\))(?:([ \t]*:[ \t]*)([A-Za-z0-9_$.]+))?(.*)$/i
    );
    if (methodMatch) {
      const [, vis, space, methName, params, colonAndType, retType, rest] =
        methodMatch;
      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-emerald-500 dark:text-emerald-400 font-bold">
            {vis}
          </span>
          <span>{space}</span>
          <span className="text-amber-500 dark:text-amber-400 font-semibold">
            {methName}
          </span>
          <span className="text-sky-400 dark:text-sky-300">{params}</span>
          {colonAndType && (
            <>
              <span className="text-muted-foreground">: </span>
              <span className="text-cyan-400 font-medium">{retType}</span>
            </>
          )}
          <span className="text-foreground">{rest}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Property declaration: (+|-|#|public|private|protected|readonly) propName: Type
    const propMatch = trimmed.match(
      /^([+\-#]|(?:public|private|protected|readonly|get|set)\b)([ \t]*)([A-Za-z0-9_$]+)([ \t]*:[ \t]*)([A-Za-z0-9_$.]+)(.*)$/i
    );
    if (propMatch) {
      const [, vis, space, propName, colonSpace, propType, rest] = propMatch;
      return (
        <React.Fragment key={lineIndex}>
          <span>{leadingWhitespace}</span>
          <span className="text-emerald-500 dark:text-emerald-400 font-bold">
            {vis}
          </span>
          <span>{space}</span>
          <span className="text-foreground font-semibold">{propName}</span>
          <span className="text-muted-foreground">{colonSpace}</span>
          <span className="text-cyan-400 font-medium">{propType}</span>
          <span className="text-foreground">{rest}</span>
          {'\n'}
        </React.Fragment>
      );
    }

    // Default line
    return (
      <React.Fragment key={lineIndex}>
        <span>{line}</span>
        {'\n'}
      </React.Fragment>
    );
  };

  return (
    <pre
      aria-hidden="true"
      className="absolute inset-0 p-3 pointer-events-none select-none font-mono text-xs leading-5 whitespace-pre overflow-hidden"
    >
      {lines.map((line, idx) => renderHighlightedLine(line, idx))}
    </pre>
  );
};
