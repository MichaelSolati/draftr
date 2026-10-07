import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {ThemeProvider} from './components/theme/ThemeProvider';
import {TopNav} from './components/layout/TopNav';
import {QuickTextEditor} from './components/editor/QuickTextEditor';
import {ArchitectureCanvas} from './components/canvas/ArchitectureCanvas';
import {ExportModal} from './components/export/ExportModal';
import {ClaudeHandoffModal} from './components/agent/ClaudeHandoffModal';
import {ProjectModal} from './components/workspace/ProjectModal';
import {parseOutline} from './lib/parser/parser';
import {
  getProject,
  saveProject,
  getActiveProjectId,
  setActiveProjectId,
} from './lib/storage/db';
import {type ArchitectureProject} from './types/spec';

const DEFAULT_PROJECT_ID = 'default-project-1';

const DEFAULT_OUTLINE = `class AuthService
  + token: string
  + login(creds: Credentials): Session -> Database.query
  - hashPassword(password: string): string

class Database
  + query(sql: string): QueryResult

ui App
  ui Header
    binds AuthService
  ui Dashboard
    ui MetricsWidget
`;

export const AppContent: React.FC = () => {
  const [project, setProject] = useState<ArchitectureProject>({
    id: DEFAULT_PROJECT_ID,
    name: 'Sample Architecture',
    rawOutlineText: DEFAULT_OUTLINE,
    classes: [],
    uiComponents: [],
    connections: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isClaudeOpen, setIsClaudeOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [nodePositions, setNodePositions] = useState<
    Record<string, {x: number; y: number}>
  >({});

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          name: 'Sample Architecture',
          rawOutlineText: DEFAULT_OUTLINE,
          classes: initialParsed.classes,
          uiComponents: initialParsed.uiComponents,
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

    return {
      ...project,
      classes: updatedClasses,
      uiComponents: updatedUIs,
      connections: parseResult.connections,
      updatedAt: Date.now(),
    };
  }, [project, parseResult, nodePositions]);

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

  const handleNodeDragStop = (id: string, position: {x: number; y: number}) => {
    setNodePositions(prev => ({...prev, [id]: position}));
  };

  // Bi-directional sync: dragging connection wires appends `-> Target.method`
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
        // Look for method declaration matching sourceMember
        const methodRegex = new RegExp(`^([+\\-#])\\s*${sourceMember}\\s*\\(`);
        if (methodRegex.test(trimmed)) {
          modified = true;
          // Check if arrow already exists
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
    }
  };

  const handleCreateProject = async (name: string) => {
    const id = `project-${Date.now()}`;
    const newProj: ArchitectureProject = {
      id,
      name,
      rawOutlineText:
        'class NewService\n  + doWork(): boolean\n\nui App\n  binds NewService\n',
      classes: [],
      uiComponents: [],
      connections: [],
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveProject(newProj);
    await setActiveProjectId(id);
    setProject(newProj);
    setNodePositions({});
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopNav
        projectName={project.name}
        onOpenProjectModal={() => setIsProjectOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenClaudeModal={() => setIsClaudeOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Quick-Text Editor (40% width) */}
        <div className="w-[42%] min-w-[320px] max-w-[600px] h-full shrink-0">
          <QuickTextEditor
            value={project.rawOutlineText}
            onChange={handleTextChange}
            diagnostics={parseResult.diagnostics}
            entityCount={{
              classes: parseResult.classes.length,
              ui: parseResult.uiComponents.length,
              connections: parseResult.connections.length,
            }}
          />
        </div>

        {/* Right: Architecture Visual Canvas */}
        <div className="flex-1 h-full overflow-hidden">
          <ArchitectureCanvas
            project={currentProjectWithPositions}
            onConnectWire={handleConnectWire}
            onNodeDragStop={handleNodeDragStop}
          />
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        project={currentProjectWithPositions}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
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
