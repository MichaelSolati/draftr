import {
  type ArchitectureLintIssue,
  type ArchitectureProject,
  lintArchitecture,
  parseOutline,
  type ParserDiagnostic,
} from '@draftr/core';
import {type Edge, type Node} from '@xyflow/react';
import {create} from 'zustand';

import {
  computeAutoLayout,
  type LayoutDirection,
} from '../../components/canvas/layout';
import {
  getActiveProjectId,
  getProject,
  saveProject,
  setActiveProjectId,
} from '../storage/db';

export const DEFAULT_PROJECT_ID = 'default-project-1';

export const DEFAULT_OUTLINE = `// Logic Entities
class AuthService
  + token: string
  + login(creds: Credentials): Session -> Database.query
  - hashPassword(password: string): string

class UserService
  + getProfile(id: string): UserProfile
  + sendWelcome(email: string): boolean

class Database
  + query(sql: string): QueryResult

// Database Schema
db Users
  + id: uuid pk
  + email: string unique
  + teamId: uuid fk -> Teams.id
  + createdAt: timestamp

db Teams
  + id: uuid pk
  + name: string

// API Endpoints
api /api/v1/auth
  + POST /login(LoginDTO): Session -> AuthService.login

// Event Streaming
event UserRegistered(UserEvent) -> UserService.sendWelcome

// UI Hierarchy
ui App
  ui Header
    binds AuthService
  ui Dashboard
    binds UserService
`;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAutosave(project: ArchitectureProject) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await saveProject(project);
    } catch (e) {
      console.error('Failed to autosave project to IndexedDB:', e);
    }
  }, 400);
}

function assembleProject(
  base: ArchitectureProject,
  text: string,
  nodePositions: Record<string, {x: number; y: number}>
): {
  project: ArchitectureProject;
  diagnostics: ParserDiagnostic[];
  issues: ArchitectureLintIssue[];
} {
  const parsed = parseOutline(text);
  const updatedClasses = parsed.classes.map(cls => ({
    ...cls,
    position: nodePositions[cls.id] || cls.position,
  }));
  const updatedUIs = parsed.uiComponents.map(ui => ({
    ...ui,
    position: nodePositions[ui.id] || ui.position,
  }));
  const updatedTables = parsed.tables?.map(tbl => ({
    ...tbl,
    position: nodePositions[tbl.id] || tbl.position,
  }));
  const updatedApis = parsed.apiRoutes?.map(api => ({
    ...api,
    position: nodePositions[api.id] || api.position,
  }));
  const updatedEvents = parsed.events?.map(ev => ({
    ...ev,
    position: nodePositions[ev.id] || ev.position,
  }));
  const updatedStates = parsed.states?.map(st => ({
    ...st,
    position: nodePositions[st.id] || st.position,
  }));

  const project: ArchitectureProject = {
    ...base,
    rawOutlineText: text,
    classes: updatedClasses,
    uiComponents: updatedUIs,
    tables: updatedTables,
    apiRoutes: updatedApis,
    events: updatedEvents,
    states: updatedStates,
    connections: parsed.connections,
    nodePositions,
    updatedAt: Date.now(),
  };

  const issues = lintArchitecture(project);
  return {project, diagnostics: parsed.diagnostics, issues};
}

export interface ProjectStoreState {
  project: ArchitectureProject;
  nodePositions: Record<string, {x: number; y: number}>;
  diagnostics: ParserDiagnostic[];
  architectureIssues: ArchitectureLintIssue[];
  selectedEntityId: string | null;
  isLoading: boolean;

  // Modals & Panel UI visibility
  isEditorMinimized: boolean;
  isSyntaxDocsOpen: boolean;
  isPaletteOpen: boolean;
  isExportOpen: boolean;
  isImportOpen: boolean;
  isScaffoldOpen: boolean;
  isClaudeOpen: boolean;
  isProjectOpen: boolean;

  // Actions
  loadProject: (targetId?: string) => Promise<void>;
  setText: (newText: string) => void;
  insertSnippet: (snippet: string) => void;
  updateEntityText: (entityName: string, newSnippet: string) => void;
  connectWire: (
    sourceEntity: string,
    sourceMember: string | null,
    targetEntity: string,
    targetMember: string | null
  ) => void;
  importCode: (dslText: string, mode: 'append' | 'replace') => void;
  setNodePosition: (id: string, position: {x: number; y: number}) => void;
  setNodePositions: (positions: Record<string, {x: number; y: number}>) => void;
  autoLayout: (
    nodes: Node[],
    edges: Edge[],
    direction?: LayoutDirection
  ) => Record<string, {x: number; y: number}>;
  setSelectedEntityId: (id: string | null) => void;

  setIsEditorMinimized: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsSyntaxDocsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsPaletteOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsExportOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsImportOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsScaffoldOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsClaudeOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsProjectOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
}

const initialParsed = parseOutline(DEFAULT_OUTLINE);
const initialProject: ArchitectureProject = {
  id: DEFAULT_PROJECT_ID,
  name: 'draftr specification',
  rawOutlineText: DEFAULT_OUTLINE,
  classes: initialParsed.classes,
  uiComponents: initialParsed.uiComponents,
  tables: initialParsed.tables,
  apiRoutes: initialParsed.apiRoutes,
  events: initialParsed.events,
  states: initialParsed.states,
  connections: initialParsed.connections,
  nodePositions: {},
  updatedAt: Date.now(),
  createdAt: Date.now(),
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: initialProject,
  nodePositions: {},
  diagnostics: initialParsed.diagnostics,
  architectureIssues: lintArchitecture(initialProject),
  selectedEntityId: null,
  isLoading: true,

  isEditorMinimized: false,
  isSyntaxDocsOpen: false,
  isPaletteOpen: false,
  isExportOpen: false,
  isImportOpen: false,
  isScaffoldOpen: false,
  isClaudeOpen: false,
  isProjectOpen: false,

  loadProject: async (targetId?: string) => {
    set({isLoading: true});
    try {
      const hash =
        typeof window !== 'undefined'
          ? window.location.hash.replace(/^#\/?/, '').trim()
          : '';
      const activeId = await getActiveProjectId();
      const resolvedId = targetId || hash || activeId || DEFAULT_PROJECT_ID;

      const loaded = await getProject(resolvedId);
      if (loaded) {
        await setActiveProjectId(loaded.id);
        if (
          typeof window !== 'undefined' &&
          window.location.hash !== `#/${loaded.id}`
        ) {
          window.history.pushState(null, '', `#/${loaded.id}`);
        }
        const savedPositions = loaded.nodePositions || {};
        const {project, diagnostics, issues} = assembleProject(
          loaded,
          loaded.rawOutlineText,
          savedPositions
        );
        set({
          project,
          nodePositions: savedPositions,
          diagnostics,
          architectureIssues: issues,
          isLoading: false,
        });
      } else {
        const projectId =
          resolvedId ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : DEFAULT_PROJECT_ID);
        const {project, diagnostics, issues} = assembleProject(
          {
            ...initialProject,
            id: projectId,
          },
          DEFAULT_OUTLINE,
          {}
        );
        await saveProject(project);
        await setActiveProjectId(projectId);
        if (
          typeof window !== 'undefined' &&
          window.location.hash !== `#/${projectId}`
        ) {
          window.history.pushState(null, '', `#/${projectId}`);
        }
        set({
          project,
          nodePositions: {},
          diagnostics,
          architectureIssues: issues,
          isLoading: false,
        });
      }
    } catch (e) {
      console.error('Failed to load project:', e);
      set({isLoading: false});
    }
  },

  setText: (newText: string) => {
    const {project: currentProject, nodePositions} = get();
    const {project, diagnostics, issues} = assembleProject(
      currentProject,
      newText,
      nodePositions
    );
    set({project, diagnostics, architectureIssues: issues});
    scheduleAutosave(project);
  },

  insertSnippet: (snippet: string) => {
    const {project: currentProject} = get();
    const trimmed = currentProject.rawOutlineText.trimEnd();
    const nextText = `${trimmed}\n${snippet}`;
    get().setText(nextText);
  },

  updateEntityText: (entityName: string, newSnippet: string) => {
    const {project: currentProject} = get();
    const lines = currentProject.rawOutlineText.split('\n');
    let startIdx = -1;
    let endIdx = -1;
    let baseIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      const declMatch = trimmed.match(
        /^(class|type|interface|abstract\s+class|ui|db|api|event|state)\s+([A-Za-z0-9_$/]+)/
      );
      if (declMatch && declMatch[2] === entityName) {
        startIdx = i;
        baseIndent = indent === -1 ? 0 : indent;
        continue;
      }

      if (startIdx !== -1 && endIdx === -1) {
        if (trimmed === '') continue;
        if (indent <= baseIndent) {
          endIdx = i;
          break;
        }
      }
    }

    if (startIdx !== -1) {
      if (endIdx === -1) endIdx = lines.length;
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx);
      const updatedText = [...before, newSnippet, ...after].join('\n');
      get().setText(updatedText);
    }
  },

  connectWire: (
    sourceEntity: string,
    sourceMember: string | null,
    targetEntity: string,
    targetMember: string | null
  ) => {
    const {project: currentProject} = get();
    const lines = currentProject.rawOutlineText.split('\n');

    // Case 1: Member-level wire
    if (sourceMember) {
      let insideSourceClass = false;
      let methodIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_$]+)/);

        if (classMatch) {
          insideSourceClass = classMatch[1] === sourceEntity;
          continue;
        }

        if (
          insideSourceClass &&
          /^(class|ui|db|api|event|state|interface|type)\s+/.test(trimmed) &&
          !line.startsWith(' ') &&
          !line.startsWith('\t')
        ) {
          insideSourceClass = false;
        }

        if (insideSourceClass) {
          const methodRegex = new RegExp(
            `^(?:[+\\-#]|(?:public|private|protected|readonly|get|set)\\b)?\\s*${sourceMember}\\s*\\(`,
            'i'
          );
          if (methodRegex.test(trimmed)) {
            methodIdx = i;
            break;
          }
        }
      }

      if (methodIdx !== -1) {
        const methodLine = lines[methodIdx];
        const matchIndent = methodLine.match(/^(\s*)/);
        const methodIndent = matchIndent ? matchIndent[1] : '  ';
        const callIndent = methodIndent.includes('\t')
          ? methodIndent + '\t'
          : methodIndent + (methodIndent || '  ');

        let cleanMethodLine = methodLine;
        const arrowIndex = methodLine.indexOf('->');
        const callsIndex = methodLine.search(/\b(?:calls|invokes)\b/i);
        if (arrowIndex !== -1) {
          cleanMethodLine = methodLine.slice(0, arrowIndex).trimEnd();
        } else if (callsIndex !== -1) {
          cleanMethodLine = methodLine.slice(0, callsIndex).trimEnd();
        }

        const targetClassSpec = currentProject.classes.find(
          c => c.name === targetEntity
        );
        const isMethod =
          targetMember &&
          targetClassSpec?.methods?.some(m => m.name === targetMember);
        const targetMemberSuffix = targetMember
          ? `.${targetMember}${isMethod ? '()' : ''}`
          : '';
        const callTarget = `${targetEntity}${targetMemberSuffix}`;
        const callLine = `${callIndent}calls ${callTarget}`;

        let insertAt = methodIdx + 1;
        let alreadyExists = false;
        while (insertAt < lines.length) {
          const nextTrimmed = lines[insertAt].trim();
          if (
            nextTrimmed.startsWith('calls ') ||
            nextTrimmed.startsWith('invokes ') ||
            nextTrimmed.startsWith('->') ||
            nextTrimmed.startsWith('- ') ||
            nextTrimmed.startsWith('+ ')
          ) {
            if (
              nextTrimmed.includes(targetEntity) &&
              (!targetMember || nextTrimmed.includes(targetMember))
            ) {
              alreadyExists = true;
              break;
            }
            insertAt++;
          } else {
            break;
          }
        }

        if (!alreadyExists) {
          lines[methodIdx] = cleanMethodLine;
          lines.splice(insertAt, 0, callLine);
          get().setText(lines.join('\n'));
        }
        return;
      }
    }

    // Case 2: Node-level wire
    let insideSource = false;
    let insertIndex = -1;
    let isUI = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const entityMatch = trimmed.match(
        /^(class|ui|interface|type)\s+([A-Za-z0-9_$]+)/
      );
      if (entityMatch) {
        if (insideSource && insertIndex === -1) {
          insertIndex = i;
        }
        if (entityMatch[2] === sourceEntity) {
          insideSource = true;
          isUI = entityMatch[1] === 'ui';
        } else {
          insideSource = false;
        }
      }
    }

    if (insideSource && insertIndex === -1) {
      insertIndex = lines.length;
    }

    if (insertIndex !== -1) {
      const prevLine = lines[insertIndex - 1] || '';
      const prevIndentMatch = prevLine.match(/^(\s+)/);
      const level2Indent = prevIndentMatch ? prevIndentMatch[1] : '  ';

      const directive = isUI
        ? `${level2Indent}binds ${targetEntity}`
        : `${level2Indent}calls ${targetEntity}${targetMember ? '.' + targetMember : ''}`;
      const alreadyExists = lines
        .slice(0, insertIndex)
        .some(l => l.trim() === directive.trim());

      if (!alreadyExists) {
        lines.splice(insertIndex, 0, directive);
        get().setText(lines.join('\n'));
      }
    }
  },

  importCode: (dslText: string, mode: 'append' | 'replace') => {
    const {project: currentProject} = get();
    const nextText =
      mode === 'replace'
        ? dslText
        : `${currentProject.rawOutlineText.trimEnd()}\n\n// Ingested Codebase\n${dslText}`;
    get().setText(nextText);
  },

  setNodePosition: (id: string, position: {x: number; y: number}) => {
    const {project: currentProject, nodePositions} = get();
    const nextPositions = {...nodePositions, [id]: position};
    const {project, diagnostics, issues} = assembleProject(
      currentProject,
      currentProject.rawOutlineText,
      nextPositions
    );
    set({
      nodePositions: nextPositions,
      project,
      diagnostics,
      architectureIssues: issues,
    });
    scheduleAutosave(project);
  },

  setNodePositions: (positions: Record<string, {x: number; y: number}>) => {
    const {project: currentProject, nodePositions} = get();
    const nextPositions = {...nodePositions, ...positions};
    const {project, diagnostics, issues} = assembleProject(
      currentProject,
      currentProject.rawOutlineText,
      nextPositions
    );
    set({
      nodePositions: nextPositions,
      project,
      diagnostics,
      architectureIssues: issues,
    });
    scheduleAutosave(project);
  },

  autoLayout: (
    nodes: Node[],
    edges: Edge[],
    direction: LayoutDirection = 'TB'
  ) => {
    const newPositions = computeAutoLayout(nodes, edges, {direction});
    get().setNodePositions(newPositions);
    return newPositions;
  },

  setSelectedEntityId: (id: string | null) => set({selectedEntityId: id}),

  setIsEditorMinimized: val =>
    set(state => ({
      isEditorMinimized:
        typeof val === 'function' ? val(state.isEditorMinimized) : val,
    })),
  setIsSyntaxDocsOpen: val =>
    set(state => ({
      isSyntaxDocsOpen:
        typeof val === 'function' ? val(state.isSyntaxDocsOpen) : val,
    })),
  setIsPaletteOpen: val =>
    set(state => ({
      isPaletteOpen: typeof val === 'function' ? val(state.isPaletteOpen) : val,
    })),
  setIsExportOpen: val =>
    set(state => ({
      isExportOpen: typeof val === 'function' ? val(state.isExportOpen) : val,
    })),
  setIsImportOpen: val =>
    set(state => ({
      isImportOpen: typeof val === 'function' ? val(state.isImportOpen) : val,
    })),
  setIsScaffoldOpen: val =>
    set(state => ({
      isScaffoldOpen:
        typeof val === 'function' ? val(state.isScaffoldOpen) : val,
    })),
  setIsClaudeOpen: val =>
    set(state => ({
      isClaudeOpen: typeof val === 'function' ? val(state.isClaudeOpen) : val,
    })),
  setIsProjectOpen: val =>
    set(state => ({
      isProjectOpen: typeof val === 'function' ? val(state.isProjectOpen) : val,
    })),
}));
