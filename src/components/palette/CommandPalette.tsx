import React, {useState, useEffect} from 'react';
import {
  Search,
  Box,
  Database,
  Globe,
  Zap,
  Layout,
  FileCode,
  Send,
  Sun,
  Moon,
  FolderGit2,
  Maximize2,
} from 'lucide-react';
import {useTheme} from '../theme/ThemeProvider';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Insert' | 'Actions' | 'View';
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet: (snippet: string) => void;
  onOpenExport: () => void;
  onOpenClaude: () => void;
  onOpenProjects: () => void;
  onFitView?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
  onOpenExport,
  onOpenClaude,
  onOpenProjects,
  onFitView,
}) => {
  const [query, setQuery] = useState('');
  const {theme, setTheme} = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open in parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'insert-class',
      title: 'Insert Class Spec',
      category: 'Insert',
      icon: <Box className="h-4 w-4 text-purple-500" />,
      action: () => {
        onInsertSnippet(
          '\nclass NewService\n  + execute(req: RequestDTO): Result\n  - validate(): boolean\n'
        );
        onClose();
      },
    },
    {
      id: 'insert-table',
      title: 'Insert Database Table',
      category: 'Insert',
      icon: <Database className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onInsertSnippet(
          '\ndb NewTable\n  + id: uuid pk\n  + name: string unique\n  + createdAt: timestamp\n'
        );
        onClose();
      },
    },
    {
      id: 'insert-api',
      title: 'Insert API Route',
      category: 'Insert',
      icon: <Globe className="h-4 w-4 text-amber-500" />,
      action: () => {
        onInsertSnippet(
          '\napi /api/v1/resource\n  + GET /list(): Item[]\n  + POST /create(CreateDTO): Item\n'
        );
        onClose();
      },
    },
    {
      id: 'insert-event',
      title: 'Insert Event Stream',
      category: 'Insert',
      icon: <Zap className="h-4 w-4 text-violet-500" />,
      action: () => {
        onInsertSnippet('\nevent ResourceCreated(EventPayload)\n');
        onClose();
      },
    },
    {
      id: 'insert-ui',
      title: 'Insert UI Component',
      category: 'Insert',
      icon: <Layout className="h-4 w-4 text-sky-500" />,
      action: () => {
        onInsertSnippet('\nui NewView\n  ui SubComponent\n');
        onClose();
      },
    },
    {
      id: 'action-export',
      title: 'Export Architecture (Mermaid / JSON)',
      category: 'Actions',
      icon: <FileCode className="h-4 w-4 text-primary" />,
      action: () => {
        onOpenExport();
        onClose();
      },
      shortcut: '⌘E',
    },
    {
      id: 'action-claude',
      title: 'Send Spec to Claude Agent',
      category: 'Actions',
      icon: <Send className="h-4 w-4 text-primary" />,
      action: () => {
        onOpenClaude();
        onClose();
      },
    },
    {
      id: 'action-projects',
      title: 'Switch Workspace Project',
      category: 'Actions',
      icon: <FolderGit2 className="h-4 w-4 text-muted-foreground" />,
      action: () => {
        onOpenProjects();
        onClose();
      },
      shortcut: '⌘P',
    },
    {
      id: 'view-fit',
      title: 'Fit View / Center Canvas',
      category: 'View',
      icon: <Maximize2 className="h-4 w-4 text-muted-foreground" />,
      action: () => {
        if (onFitView) onFitView();
        onClose();
      },
    },
    {
      id: 'view-theme',
      title: `Toggle Theme (current: ${theme})`,
      category: 'View',
      icon:
        theme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-500" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-400" />
        ),
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        onClose();
      },
    },
  ];

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden text-foreground flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search actions..."
            className="w-full py-3.5 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map(cmd => (
              <button
                key={cmd.id}
                type="button"
                onClick={cmd.action}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-accent hover:text-accent-foreground text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded bg-muted/40 group-hover:bg-background">
                    {cmd.icon}
                  </div>
                  <div>
                    <span className="font-medium">{cmd.title}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground capitalize">
                      {cmd.category}
                    </span>
                  </div>
                </div>
                {cmd.shortcut && (
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/10 text-[11px] text-muted-foreground">
          <span>Navigate with mouse or keyboard</span>
          <span>
            Press{' '}
            <kbd className="px-1 bg-muted rounded border border-border">
              ESC
            </kbd>{' '}
            to exit
          </span>
        </div>
      </div>
    </div>
  );
};
