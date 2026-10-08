import React, {useState, useEffect} from 'react';
import {X, Plus, Trash2, FolderGit2, Check} from 'lucide-react';
import {listProjects, deleteProject} from '../../lib/storage/db';

interface ProjectModalProps {
  isOpen: boolean;
  activeProjectId: string;
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  activeProjectId,
  onClose,
  onSelectProject,
  onCreateProject,
}) => {
  const [projects, setProjects] = useState<
    Array<{id: string; name: string; updatedAt: number}>
  >([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadList = async () => {
    const list = await listProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      await loadList();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-foreground"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Switch Project</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Create new project button / form */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2 px-3 border border-dashed border-border hover:border-primary/50 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Project</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2">
              <input
                type="text"
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project Name (e.g. Payment Gateway)"
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Project List */}
          <div className="space-y-1.5">
            {projects.map(p => {
              const isActive = p.id === activeProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/5 font-semibold text-primary'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5" />
                    )}
                    <div className="truncate">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Updated {new Date(p.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={e => handleDelete(p.id, e)}
                      title="Delete project"
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
