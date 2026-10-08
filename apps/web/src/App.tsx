import {type ArchitectureProject} from '@draftr/core';
import {PanelLeftOpen} from 'lucide-react';
import React, {useEffect, useMemo} from 'react';

import {ClaudeHandoffModal} from './components/agent/ClaudeHandoffModal';
import {ArchitectureCanvas} from './components/canvas/ArchitectureCanvas';
import {QuickTextEditor} from './components/editor/QuickTextEditor';
import {ExportModal} from './components/export/ExportModal';
import {ImportModal} from './components/import/ImportModal';
import {SyntaxDocPanel} from './components/layout/SyntaxDocPanel';
import {TopNav} from './components/layout/TopNav';
import {CommandPalette} from './components/palette/CommandPalette';
import {ScaffoldModal} from './components/scaffold/ScaffoldModal';
import {ThemeProvider} from './components/theme/ThemeProvider';
import {ProjectModal} from './components/workspace/ProjectModal';
import {saveProject} from './lib/storage/db';
import {useProjectStore} from './lib/store/useProjectStore';

export const AppContent: React.FC = () => {
  const {
    project,
    diagnostics,
    architectureIssues,
    selectedEntityId,
    loadProject,
    setText,
    insertSnippet,
    updateEntityText,
    connectWire,
    importCode,
    setNodePosition,
    setNodePositions,
    setSelectedEntityId,
    isEditorMinimized,
    setIsEditorMinimized,
    isSyntaxDocsOpen,
    setIsSyntaxDocsOpen,
    isPaletteOpen,
    setIsPaletteOpen,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    isScaffoldOpen,
    setIsScaffoldOpen,
    isClaudeOpen,
    setIsClaudeOpen,
    isProjectOpen,
    setIsProjectOpen,
  } = useProjectStore();

  // Load project on mount and on hashchange
  useEffect(() => {
    loadProject();

    const handleHashChange = () => {
      loadProject();
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [loadProject]);

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
  }, [setIsPaletteOpen]);

  const handleSelectProject = async (id: string) => {
    await loadProject(id);
    setSelectedEntityId(null);
  };

  const handleCreateProject = async (name: string) => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `proj-${Date.now()}`;
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
      nodePositions: {},
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveProject(newProj);
    await loadProject(id);
    setSelectedEntityId(null);
  };

  // Combine parser diagnostics with architectural lint warnings
  const combinedDiagnostics = useMemo(() => {
    const diags = [...diagnostics];
    architectureIssues.forEach(issue => {
      diags.push({
        line: 1,
        message: `[Architecture Rule] ${issue.title}: ${issue.description}`,
        severity: issue.severity,
      });
    });
    return diags;
  }, [diagnostics, architectureIssues]);

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
        isSyntaxDocsOpen={isSyntaxDocsOpen}
        onToggleSyntaxDocs={() => setIsSyntaxDocsOpen(prev => !prev)}
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
              onChange={setText}
              project={project}
              diagnostics={combinedDiagnostics}
              onInsertSnippet={insertSnippet}
              highlightedEntity={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
              isMinimized={isEditorMinimized}
              onToggleMinimize={() => setIsEditorMinimized(true)}
              entityCount={{
                classes: project.classes.length,
                ui: project.uiComponents.length,
                connections: project.connections.length,
              }}
            />
          </div>
        )}

        {/* Center / Right: Architecture Visual Canvas */}
        <div className="flex-1 h-full overflow-hidden">
          <ArchitectureCanvas
            project={project}
            onConnectWire={connectWire}
            onNodeDragStop={setNodePosition}
            onAutoLayout={setNodePositions}
            onSelectEntity={setSelectedEntityId}
            onUpdateEntityText={updateEntityText}
            onInsertSnippet={insertSnippet}
            selectedEntityId={selectedEntityId}
          />
        </div>

        {/* Right: Syntax Documentation Panel (Starts closed always) */}
        <SyntaxDocPanel
          isOpen={isSyntaxDocsOpen}
          onClose={() => setIsSyntaxDocsOpen(false)}
          onInsertSnippet={insertSnippet}
        />
      </div>

      {/* Modals & Command Palette */}
      <ExportModal
        project={project}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={importCode}
      />

      <ScaffoldModal
        project={project}
        isOpen={isScaffoldOpen}
        onClose={() => setIsScaffoldOpen(false)}
      />

      <ClaudeHandoffModal
        project={project}
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
        onInsertSnippet={insertSnippet}
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
