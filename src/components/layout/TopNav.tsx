import React from 'react';
import {Layers, FileCode, Send, FolderGit2, ChevronDown} from 'lucide-react';
import {ThemeToggle} from '../theme/ThemeToggle';

interface TopNavProps {
  projectName: string;
  onOpenProjectModal: () => void;
  onOpenExportModal: () => void;
  onOpenClaudeModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  projectName,
  onOpenProjectModal,
  onOpenExportModal,
  onOpenClaudeModal,
}) => {
  return (
    <header className="h-12 border-b border-border bg-card text-card-foreground px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Brand & Project Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <span>SpecBuilder</span>
        </div>

        <div className="h-4 w-[1px] bg-border" />

        {/* Project Selector Trigger */}
        <button
          type="button"
          onClick={onOpenProjectModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
        >
          <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{projectName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenExportModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
        >
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={onOpenClaudeModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send to Claude</span>
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <ThemeToggle />
      </div>
    </header>
  );
};
