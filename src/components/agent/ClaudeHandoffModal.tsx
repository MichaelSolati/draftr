import React, {useState} from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {type ArchitectureProject} from '../../types/spec';
import {
  formatClipboardPrompt,
  sendHandoffToLocalBridge,
} from '../../lib/agent/handoff';

interface ClaudeHandoffModalProps {
  project: ArchitectureProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ClaudeHandoffModal: React.FC<ClaudeHandoffModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const promptContent = formatClipboardPrompt(project);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToBridge = async () => {
    setSending(true);
    setBridgeResult(null);
    try {
      const res = await sendHandoffToLocalBridge(project);
      setBridgeResult(res);
    } catch (e) {
      setBridgeResult({
        success: false,
        message: e instanceof Error ? e.message : 'Unknown bridge error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              Send Specification to Claude
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

        {/* Info Banner */}
        <div className="px-5 py-2.5 bg-primary/10 border-b border-primary/20 text-xs text-primary flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>
            Transfers complete class definitions, method call routing, and UI
            hierarchies directly to Claude.
          </span>
        </div>

        {/* Bridge Status Notice (if any) */}
        {bridgeResult && (
          <div
            className={`px-5 py-2 border-b text-xs flex items-center gap-2 ${
              bridgeResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {bridgeResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{bridgeResult.message}</span>
          </div>
        )}

        {/* Prompt Preview */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">
            Formatted Agent Prompt Payload
          </div>
          <pre className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed select-all max-h-80">
            {promptContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Local endpoint: <code>:4318/api/claude/handoff</code>
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
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSendToBridge}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? 'Sending...' : 'Send to Claude Bridge'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
