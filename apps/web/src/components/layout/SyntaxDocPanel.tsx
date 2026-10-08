import React, {useState} from 'react';
import {
  X,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

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
      title: 'Class & Method Invocations (Calling Other Code)',
      desc: 'Define classes and methods. To declare that a method calls another function, use a nested sub-bullet with "-> Target.method" or "calls Target.method".',
      code: 'class OrderService\n\t+ checkout(cart: Cart): Order\n\t\t-> PaymentService.charge\n\t\t-> InventoryService.reserve\n\nclass PaymentService\n\t+ charge(amount: number): Receipt',
    },
    {
      title: 'Return Types Referencing Other Entities',
      desc: 'Specify direct or dot-notated entity return types. Referenced entities appear as clickable chips and keep relationships intact.',
      code: 'class MainService\n\t+ start(): Pi.help\n\t+ hi(a: string): string\n\nclass Pi\n\t+ help: string',
    },
    {
      title: 'Database Tables & Foreign Keys',
      desc: 'Use "db <TableName>" with "+ <col>: <type>". Support "pk", "fk", and "unique". Point foreign keys to target tables with "-> OtherTable.col".',
      code: 'db Users\n\t+ id: uuid pk\n\t+ email: string unique\n\ndb Orders\n\t+ id: uuid pk\n\t+ user_id: uuid fk -> Users.id\n\t+ total: number',
    },
    {
      title: 'REST API Routes',
      desc: 'Define API endpoints with HTTP verbs (GET, POST, PUT, DELETE, PATCH). Link endpoints directly to backend service handlers with "->".',
      code: 'api /api/v1/orders\n\t+ POST /checkout(OrderPayload): OrderResponse -> OrderService.checkout\n\t+ GET /list(): Order[]',
    },
    {
      title: 'UI Components & Bound Services',
      desc: 'Declare UI trees. Indent child UI components with tabs. Connect UI components to logic services with "binds ServiceName".',
      code: 'ui CheckoutPage\n\tbinds OrderService\n\tui OrderSummary\n\tui PaymentForm\n\t\tbinds PaymentService',
    },
    {
      title: 'Event Pub/Sub & Messaging',
      desc: 'Declare standalone events or emit events from inside service methods using "emits EventName".',
      code: 'event OrderCreated(OrderEventPayload) -> NotificationService.send\n\nclass OrderService\n\t+ checkout(): void\n\t\temits OrderCreated',
    },
    {
      title: 'Client State Slices',
      desc: 'Declare client state stores and frontend models using "state <SliceName>".',
      code: 'state CartState\n\t+ items: CartItem[]\n\t+ total: number\n\t+ isCheckingOut: boolean',
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

      {/* Rules Notice */}
      <div className="p-3 bg-primary/5 border-b border-primary/20 text-xs text-muted-foreground">
        <div className="font-semibold text-primary mb-1 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" />
          <span>Indentation Rule: Tabs Only</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Indent blocks and invocations using <strong>tabs</strong>. Every
          indent level defines parent-child relationships and method call
          chains.
        </p>
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
              <pre className="p-2.5 rounded-md bg-background/80 border border-border font-mono text-[11px] text-foreground overflow-x-auto leading-4 whitespace-pre">
                {sec.code}
              </pre>

              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleCopy(sec.code, idx)}
                  title="Copy snippet"
                  className="p-1 rounded bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
                    className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-0.5"
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
