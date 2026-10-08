import React, {useState} from 'react';
import {X, FileInput, Plus, RefreshCw, FileText} from 'lucide-react';
import {importTypeScriptToDSL} from '@arch-spec/core';
import {importSqlOrPrismaToDSL} from '@arch-spec/core';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dslText: string, mode: 'append' | 'replace') => void;
}

type ImportTab = 'typescript' | 'sql' | 'prisma';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('typescript');
  const [inputCode, setInputCode] = useState('');
  const [previewDSL, setPreviewDSL] = useState('');

  if (!isOpen) return null;

  const handleCodeChange = (text: string) => {
    setInputCode(text);
    if (!text.trim()) {
      setPreviewDSL('');
      return;
    }

    try {
      if (activeTab === 'typescript') {
        setPreviewDSL(importTypeScriptToDSL(text));
      } else {
        setPreviewDSL(importSqlOrPrismaToDSL(text));
      }
    } catch {
      setPreviewDSL('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      handleCodeChange(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (mode: 'append' | 'replace') => {
    if (!previewDSL.trim()) return;
    onImport(previewDSL, mode);
    onClose();
    setInputCode('');
    setPreviewDSL('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-foreground"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <FileInput className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              Reverse-Engineer / Ingest Codebase
            </h3>
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
            onClick={() => {
              setActiveTab('typescript');
              setPreviewDSL('');
              setInputCode('');
            }}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'typescript'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            TypeScript (.ts/.tsx)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('sql');
              setPreviewDSL('');
              setInputCode('');
            }}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            SQL DDL (CREATE TABLE)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('prisma');
              setPreviewDSL('');
              setInputCode('');
            }}
            className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'prisma'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Prisma Schema
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Paste code or select a local file to extract:</span>
            <label className="cursor-pointer text-primary hover:underline flex items-center gap-1 font-medium">
              <FileText className="h-3.5 w-3.5" />
              <span>Choose File</span>
              <input
                type="file"
                className="hidden"
                accept=".ts,.tsx,.js,.jsx,.sql,.prisma"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <textarea
            value={inputCode}
            onChange={e => handleCodeChange(e.target.value)}
            placeholder={
              activeTab === 'typescript'
                ? 'export class UserService {\n  public login(creds: Credentials): Session {}\n}'
                : activeTab === 'sql'
                  ? 'CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE\n);'
                  : 'model User {\n  id String @id\n  email String @unique\n}'
            }
            className="w-full h-40 p-3 rounded-lg border border-border bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />

          {previewDSL && (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Generated Indentation DSL Outline:
              </div>
              <pre className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs max-h-36 overflow-y-auto whitespace-pre">
                {previewDSL}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {previewDSL
              ? 'Valid syntax ready to import'
              : 'Waiting for code input'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!previewDSL.trim()}
              onClick={() => handleSubmit('append')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Append to Outline</span>
            </button>
            <button
              type="button"
              disabled={!previewDSL.trim()}
              onClick={() => handleSubmit('replace')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Replace Outline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
