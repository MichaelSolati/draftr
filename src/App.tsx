import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {PanelLeftOpen} from 'lucide-react';
import {ThemeProvider} from './components/theme/ThemeProvider';
import {TopNav} from './components/layout/TopNav';
import {QuickTextEditor} from './components/editor/QuickTextEditor';
import {ArchitectureCanvas} from './components/canvas/ArchitectureCanvas';
import {ExportModal} from './components/export/ExportModal';
import {ImportModal} from './components/import/ImportModal';
import {ScaffoldModal} from './components/scaffold/ScaffoldModal';
import {ClaudeHandoffModal} from './components/agent/ClaudeHandoffModal';
import {ProjectModal} from './components/workspace/ProjectModal';
import {CommandPalette} from './components/palette/CommandPalette';
import {parseOutline} from './lib/parser/parser';
import {lintArchitecture} from './lib/linter/rules';
import {
  getProject,
  saveProject,
  getActiveProjectId,
  setActiveProjectId,
} from './lib/storage/db';
import {type ArchitectureProject} from './types/spec';

const DEFAULT_PROJECT_ID = 'default-project-1';

const DEFAULT_OUTLINE = `// Logic Entities
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
    ui MetricsWidget
`;

export const AppContent: React.FC = () => {
  const [project, setProject] = useState<ArchitectureProject>({
    id: DEFAULT_PROJECT_ID,
    name: 'Full-Stack Architecture Spec',
    rawOutlineText: DEFAULT_OUTLINE,
    classes: [],
    uiComponents: [],
    tables: [],
    apiRoutes: [],
    events: [],
    states: [],
    connections: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isScaffoldOpen, setIsScaffoldOpen] = useState(false);
  const [isClaudeOpen, setIsClaudeOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  const [nodePositions, setNodePositions] = useState<
    Record<string, {x: number; y: number}>
  >({});

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global keydown for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load project on mount
  useEffect(() => {
    async function init() {
      const activeId = await getActiveProjectId();
      const targetId = activeId || DEFAULT_PROJECT_ID;
      const loaded = await getProject(targetId);

      if (loaded) {
        setProject(loaded);
      } else {
        const initialParsed = parseOutline(DEFAULT_OUTLINE);
        const initialProject: ArchitectureProject = {
          id: DEFAULT_PROJECT_ID,
          name: 'Full-Stack Architecture Spec',
          rawOutlineText: DEFAULT_OUTLINE,
          classes: initialParsed.classes,
          uiComponents: initialParsed.uiComponents,
          tables: initialParsed.tables,
          apiRoutes: initialParsed.apiRoutes,
          events: initialParsed.events,
          states: initialParsed.states,
          connections: initialParsed.connections,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        };
        await saveProject(initialProject);
        await setActiveProjectId(DEFAULT_PROJECT_ID);
        setProject(initialProject);
      }
    }
    init();
  }, []);

  // Parse text whenever outline changes
  const parseResult = useMemo(() => {
    return parseOutline(project.rawOutlineText);
  }, [project.rawOutlineText]);

  // Merge parsed AST with existing node positions
  const currentProjectWithPositions = useMemo(() => {
    const updatedClasses = parseResult.classes.map(cls => ({
      ...cls,
      position: nodePositions[cls.id] || cls.position,
    }));
    const updatedUIs = parseResult.uiComponents.map(ui => ({
      ...ui,
      position: nodePositions[ui.id] || ui.position,
    }));
    const updatedTables = parseResult.tables.map(tbl => ({
      ...tbl,
      position: nodePositions[tbl.id] || tbl.position,
    }));
    const updatedApis = parseResult.apiRoutes.map(api => ({
      ...api,
      position: nodePositions[api.id] || api.position,
    }));
    const updatedEvents = parseResult.events.map(ev => ({
      ...ev,
      position: nodePositions[ev.id] || ev.position,
    }));
    const updatedStates = parseResult.states.map(st => ({
      ...st,
      position: nodePositions[st.id] || st.position,
    }));

    return {
      ...project,
      classes: updatedClasses,
      uiComponents: updatedUIs,
      tables: updatedTables,
      apiRoutes: updatedApis,
      events: updatedEvents,
      states: updatedStates,
      connections: parseResult.connections,
      updatedAt: Date.now(),
    };
  }, [project, parseResult, nodePositions]);

  // Lint project architecture
  const architectureIssues = useMemo(() => {
    return lintArchitecture(currentProjectWithPositions);
  }, [currentProjectWithPositions]);

  // Debounced autosave
  const triggerAutosave = useCallback((updatedProject: ArchitectureProject) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveProject(updatedProject);
    }, 400);
  }, []);

  const handleTextChange = (newText: string) => {
    setProject(prev => {
      const next = {...prev, rawOutlineText: newText, updatedAt: Date.now()};
      triggerAutosave(next);
      return next;
    });
  };

  const handleInsertSnippet = (snippet: string) => {
    setProject(prev => {
      const trimmed = prev.rawOutlineText.trimEnd();
      const nextText = `${trimmed}\n${snippet}`;
      const next = {...prev, rawOutlineText: nextText, updatedAt: Date.now()};
      triggerAutosave(next);
      return next;
    });
  };

  const handleImportCode = (dslText: string, mode: 'append' | 'replace') => {
    setProject(prev => {
      const nextText =
        mode === 'replace'
          ? dslText
          : `${prev.rawOutlineText.trimEnd()}\n\n// Ingested Codebase\n${dslText}`;
      const next = {...prev, rawOutlineText: nextText, updatedAt: Date.now()};
      triggerAutosave(next);
      return next;
    });
  };

  const handleNodeDragStop = (id: string, position: {x: number; y: number}) => {
    setNodePositions(prev => ({...prev, [id]: position}));
  };

  const handleUpdateEntityText = (entityName: string, newSnippet: string) => {
    const lines = project.rawOutlineText.split('\n');
    let startIdx = -1;
    let endIdx = -1;
    let baseIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      const declMatch = trimmed.match(
        /^(class|type|interface)\s+([A-Za-z0-9_$]+)/
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
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx);
      const updatedText = [...before, newSnippet, ...after].join('\n');
      handleTextChange(updatedText);
    }
  };

  // Bi-directional sync: dragging wires adds inline calls
  const handleConnectWire = (
    sourceEntity: string,
    sourceMember: string | null,
    targetEntity: string,
    targetMember: string | null
  ) => {
    if (!sourceMember || !targetMember) return;

    const lines = project.rawOutlineText.split('\n');
    let insideTargetClass = false;
    let modified = false;

    const newLines = lines.map(line => {
      const trimmed = line.trim();
      const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_$]+)/);

      if (classMatch) {
        insideTargetClass = classMatch[1] === sourceEntity;
      }

      if (insideTargetClass && !modified) {
        const methodRegex = new RegExp(`^([+\\-#])\\s*${sourceMember}\\s*\\(`);
        if (methodRegex.test(trimmed)) {
          modified = true;
          const arrowIndex = line.indexOf('->');
          const cleanLine =
            arrowIndex !== -1 ? line.slice(0, arrowIndex).trimEnd() : line;
          return `${cleanLine} -> ${targetEntity}.${targetMember}`;
        }
      }
      return line;
    });

    if (modified) {
      handleTextChange(newLines.join('\n'));
    }
  };

  const handleSelectProject = async (id: string) => {
    const loaded = await getProject(id);
    if (loaded) {
      await setActiveProjectId(id);
      setProject(loaded);
      setNodePositions({});
      setSelectedEntityId(null);
    }
  };

  const handleCreateProject = async (name: string) => {
    const id = `project-${Date.now()}`;
    const newProj: ArchitectureProject = {
      id,
      name,
      rawOutlineText:
        'class MainService\n  + start(): void\n\nui App\n  binds MainService\n',
      classes: [],
      uiComponents: [],
      tables: [],
      apiRoutes: [],
      events: [],
      states: [],
      connections: [],
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveProject(newProj);
    await setActiveProjectId(id);
    setProject(newProj);
    setNodePositions({});
    setSelectedEntityId(null);
  };

  // Combine parser diagnostics with architectural lint warnings
  const combinedDiagnostics = useMemo(() => {
    const diags = [...parseResult.diagnostics];
    architectureIssues.forEach(issue => {
      diags.push({
        line: 1,
        message: `[Architecture Rule] ${issue.title}: ${issue.description}`,
        severity: issue.severity,
      });
    });
    return diags;
  }, [parseResult.diagnostics, architectureIssues]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopNav
        projectName={project.name}
        onOpenProjectModal={() => setIsProjectOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenScaffoldModal={() => setIsScaffoldOpen(true)}
        onOpenClaudeModal={() => setIsClaudeOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Quick-Text Editor or Minimized Strip */}
        {isEditorMinimized ? (
          <div className="w-10 h-full border-r border-border bg-card flex flex-col items-center py-3 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setIsEditorMinimized(false)}
              title="Expand Outline Editor"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div className="mt-8 text-[11px] font-medium text-muted-foreground tracking-wider uppercase [writing-mode:vertical-lr] rotate-180">
              Outline Editor
            </div>
          </div>
        ) : (
          <div className="w-[42%] min-w-[320px] max-w-[600px] h-full shrink-0 transition-all duration-300">
            <QuickTextEditor
              value={project.rawOutlineText}
              onChange={handleTextChange}
              diagnostics={combinedDiagnostics}
              onInsertSnippet={handleInsertSnippet}
              highlightedEntity={selectedEntityId}
              isMinimized={isEditorMinimized}
              onToggleMinimize={() => setIsEditorMinimized(true)}
              entityCount={{
                classes: parseResult.classes.length,
                ui: parseResult.uiComponents.length,
                connections: parseResult.connections.length,
              }}
            />
          </div>
        )}

        {/* Right: Architecture Visual Canvas */}
        <div className="flex-1 h-full overflow-hidden">
          <ArchitectureCanvas
            project={currentProjectWithPositions}
            onConnectWire={handleConnectWire}
            onNodeDragStop={handleNodeDragStop}
            onSelectEntity={setSelectedEntityId}
            onUpdateEntityText={handleUpdateEntityText}
            selectedEntityId={selectedEntityId}
          />
        </div>
      </div>

      {/* Modals & Command Palette */}
      <ExportModal
        project={currentProjectWithPositions}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCode}
      />

      <ScaffoldModal
        project={currentProjectWithPositions}
        isOpen={isScaffoldOpen}
        onClose={() => setIsScaffoldOpen(false)}
      />

      <ClaudeHandoffModal
        project={currentProjectWithPositions}
        isOpen={isClaudeOpen}
        onClose={() => setIsClaudeOpen(false)}
      />

      <ProjectModal
        isOpen={isProjectOpen}
        activeProjectId={project.id}
        onClose={() => setIsProjectOpen(false)}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onInsertSnippet={handleInsertSnippet}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenClaude={() => setIsClaudeOpen(true)}
        onOpenProjects={() => setIsProjectOpen(true)}
      />
    </div>
  );
};

export default function App(): React.ReactElement {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContent />
    </ThemeProvider>
  );
}
