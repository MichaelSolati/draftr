import React, {useState, useMemo} from 'react';
import {
  X,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Terminal,
  Copy,
  Check,
  Palette,
} from 'lucide-react';
import {StringStream} from '@codemirror/language';
import {archSpecStreamParser} from '../editor/archSpecCodeMirror';

interface SyntaxDocPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet?: (snippet: string) => void;
}

interface SectionItem {
  title: string;
  desc: string;
  code: string;
}

const tokenColorMap: Record<string, string> = {
  keyword: 'text-amber-600 dark:text-amber-400 font-bold',
  action: 'text-purple-600 dark:text-purple-400 font-bold',
  modifier: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  type: 'text-violet-600 dark:text-violet-300 font-semibold',
  primitive: 'text-sky-600 dark:text-sky-400 font-medium',
  function: 'text-sky-600 dark:text-sky-400 font-semibold',
  property: 'text-slate-900 dark:text-slate-100 font-medium',
  comment: 'text-slate-500 dark:text-slate-400 italic',
  string: 'text-rose-600 dark:text-rose-400',
};

export const HighlightedCodeSnippet: React.FC<{code: string}> = ({code}) => {
  const parsedLines = useMemo(() => {
    return code.split('\n').map(line => {
      const stream = new StringStream(line, 2, 2);
      const tokens: Array<{token: string | null; text: string}> = [];
      while (!stream.eol()) {
        const start = stream.pos;
        const token = archSpecStreamParser.token(stream);
        tokens.push({
          token,
          text: stream.string.slice(start, stream.pos),
        });
      }
      return tokens;
    });
  }, [code]);

  return (
    <pre className="p-2.5 rounded-md bg-background/90 dark:bg-slate-950/80 border border-border font-mono text-[11px] overflow-x-auto leading-5 whitespace-pre select-text">
      {parsedLines.map((tokens, lineIdx) => (
        <div key={`line-${lineIdx}`} className="min-h-[1.25rem]">
          {tokens.length === 0 ? (
            <span>&nbsp;</span>
          ) : (
            tokens.map((t, tokIdx) => (
              <span
                key={`tok-${lineIdx}-${tokIdx}`}
                className={
                  t.token
                    ? tokenColorMap[t.token] || 'text-foreground'
                    : 'text-slate-600 dark:text-slate-400'
                }
              >
                {t.text}
              </span>
            ))
          )}
        </div>
      ))}
    </pre>
  );
};

export const SyntaxDocPanel: React.FC<SyntaxDocPanelProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const sections: SectionItem[] = [
    {
      title: 'Class & Method Invocations (Level 1, 2, and 3)',
      desc: 'Declare classes at the root (0 spaces), methods at level 2 (2 spaces), and invocations at level 3 (4 spaces) using "calls Target.method" or "-> Target.method".',
      code: 'class OrderService\n  public checkout(cart: Cart): Order\n    calls PaymentService.charge\n    calls InventoryService.reserve\n\nclass PaymentService\n  public charge(amount: number): Receipt',
    },
    {
      title: 'Shortcuts & Visibility Modifiers',
      desc: 'Type "+" at line start to expand to "public ", or "-" to expand to "private ". You can also use "#" or "protected".',
      code: 'class UserService\n  public login(email: string): Session\n  private hashPassword(raw: string): string\n  public profile: UserProfile',
    },
    {
      title: 'Return Types Referencing Other Entities',
      desc: 'Specify direct or dot-notated entity return types. Referenced entities appear as clickable chips and maintain architectural graph connections.',
      code: 'class MainService\n  public start(): Pi.help\n  public hi(a: string): string\n\nclass Pi\n  public help: string',
    },
    {
      title: 'Database Tables & Foreign Keys',
      desc: 'Use "db <TableName>" with "+ <col>: <type>". Support "pk", "fk", and "unique". Point foreign keys to target tables with "-> OtherTable.col".',
      code: 'db Users\n  + id: uuid pk\n  + email: string unique\n\ndb Orders\n  + id: uuid pk\n  + user_id: uuid fk -> Users.id\n  + total: number',
    },
    {
      title: 'REST API Routes',
      desc: 'Define API endpoints with HTTP verbs (GET, POST, PUT, DELETE, PATCH). Link endpoints directly to backend service handlers with "->".',
      code: 'api /api/v1/orders\n  + POST /checkout(OrderPayload): OrderResponse -> OrderService.checkout\n  + GET /list(): Order[]',
    },
    {
      title: 'UI Components & Bound Services',
      desc: 'Declare UI trees with nested components. Connect UI components to logic services with "binds ServiceName".',
      code: 'ui CheckoutPage\n  binds OrderService\n  ui OrderSummary\n  ui PaymentForm\n    binds PaymentService',
    },
    {
      title: 'Event Pub/Sub & Messaging',
      desc: 'Declare standalone events or emit events from inside service methods using "emits EventName".',
      code: 'event OrderCreated(OrderEventPayload) -> NotificationService.send\n\nclass OrderService\n  public checkout(): void\n    emits OrderCreated',
    },
    {
      title: 'Client State Slices',
      desc: 'Declare client state stores and frontend models using "state <SliceName>".',
      code: 'state CartState\n  + items: CartItem[]\n  + total: number\n  + isCheckingOut: boolean',
    },
  ];

  return (
    <div className="w-80 md:w-96 h-full border-l border-border bg-card flex flex-col z-30 shadow-xl transition-all duration-300 shrink-0 select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            DSL Syntax & Calling Guide
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Close syntax guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Rules Notice & Color Legend */}
      <div className="p-3 bg-primary/5 border-b border-primary/20 text-xs space-y-2.5">
        <div className="font-semibold text-primary flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" />
          <span>3-Level Hierarchy (2-Space Indents)</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The ArchSpec DSL uses a strict 3-tier hierarchy:
          <br />
          <strong>Level 1 (0 sp):</strong> Entities (<code>class</code>,{' '}
          <code>ui</code>, <code>db</code>, <code>api</code>, <code>event</code>
          , <code>state</code>)
          <br />
          <strong>Level 2 (2 sp):</strong> Methods & Properties (
          <code>public</code>, <code>+</code>, <code>-</code>)
          <br />
          <strong>Level 3 (4 sp):</strong> Invocations & Calls (
          <code>calls</code>, <code>binds</code>, <code>-&gt;</code>)
        </p>

        {/* Color Legend */}
        <div className="pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground mb-1.5">
            <Palette className="h-3 w-3" />
            <span>Syntax Color Coding</span>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              Amber: Keyword
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20">
              Purple: Action/Call
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              Emerald: Modifier
            </span>
            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-300 font-semibold border border-violet-500/20">
              Violet: Entity Type
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
              Sky: Method/Primitive
            </span>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {sections.map((sec, idx) => (
          <div
            key={`sec-${idx}`}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 hover:border-primary/40 transition-colors"
          >
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{sec.title}</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {sec.desc}
            </p>

            <div className="relative group">
              <HighlightedCodeSnippet code={sec.code} />

              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleCopy(sec.code, idx)}
                  title="Copy snippet"
                  className="p-1 rounded bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                >
                  {copiedIdx === idx ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                {onInsertSnippet && (
                  <button
                    type="button"
                    onClick={() => onInsertSnippet('\n' + sec.code + '\n')}
                    title="Insert into outline"
                    className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-0.5 shadow-sm"
                  >
                    <span>Insert</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
