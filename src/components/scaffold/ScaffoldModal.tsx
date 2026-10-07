import React, {useState, useMemo} from 'react';
import {X, FileCode, Copy, Check, Download, Layers} from 'lucide-react';
import {type ArchitectureProject} from '../../types/spec';
import {
  generateProjectFiles,
  type GeneratedFile,
} from '../../lib/generator/scaffolder';

interface ScaffoldModalProps {
  project: ArchitectureProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ScaffoldModal: React.FC<ScaffoldModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const files = useMemo(() => {
    return generateProjectFiles(project);
  }, [project]);

  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeFile: GeneratedFile | undefined =
    files[activeFileIndex] || files[0];

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadActive = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.path.split('/').pop() || 'code.ts';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl flex flex-col h-[85vh] overflow-hidden text-foreground"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              One-Click Codebase Scaffolder
            </h3>
            <span className="text-xs text-muted-foreground ml-2">
              ({files.length} production files generated)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Content Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Navigator */}
          <div className="w-64 border-r border-border bg-muted/10 overflow-y-auto p-2 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
              Generated Files
            </div>
            {files.map((f, idx) => (
              <button
                key={f.path}
                type="button"
                onClick={() => setActiveFileIndex(idx)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition-colors truncate ${
                  activeFileIndex === idx
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <FileCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>

          {/* Code Preview Surface */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
            {activeFile && (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/20 text-xs font-mono">
                  <span className="text-foreground">{activeFile.path}</span>
                  <span className="text-muted-foreground text-[10px] uppercase">
                    {activeFile.language}
                  </span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
                  <pre className="text-foreground leading-relaxed select-all">
                    {activeFile.content}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Production stubs matching signatures and call dependencies
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-accent text-foreground transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadActive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
