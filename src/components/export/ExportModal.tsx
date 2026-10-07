import React, {useState} from 'react';
import {X, Copy, Check, Download, FileCode} from 'lucide-react';
import {type ArchitectureProject} from '../../types/spec';
import {
  exportToMermaidClassDiagram,
  exportToMermaidFlowchart,
} from '../../lib/export/mermaid';

interface ExportModalProps {
  project: ArchitectureProject;
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = 'classDiagram' | 'flowchart' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('classDiagram');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let content = '';
  let filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}`;

  if (activeTab === 'classDiagram') {
    content = exportToMermaidClassDiagram(project);
    filename += '-class-diagram.mmd';
  } else if (activeTab === 'flowchart') {
    content = exportToMermaidFlowchart(project);
    filename += '-flowchart.mmd';
  } else {
    content = JSON.stringify(
      {
        name: project.name,
        classes: project.classes,
        uiComponents: project.uiComponents,
        connections: project.connections,
      },
      null,
      2
    );
    filename += '-schema.json';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Export Architecture</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border bg-muted/20 px-5 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('classDiagram')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'classDiagram'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mermaid Class Diagram
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flowchart')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'flowchart'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mermaid UI Flowchart
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Normalized JSON AST
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          <pre className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed select-all">
            {content}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Export ready for documentation & AI prompts
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
                  <span>Copy Code</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
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
