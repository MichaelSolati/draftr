import React from 'react';
import {
  Box,
  Database,
  Globe,
  Zap,
  Layout,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {type ReferencedItem} from '@draftr/core';

interface ReferencedChipsProps {
  items: ReferencedItem[];
  onSelectEntity?: (entityId: string) => void;
  className?: string;
}

export const ReferencedChips: React.FC<ReferencedChipsProps> = ({
  items,
  onSelectEntity,
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  const getKindBadge = (kind: ReferencedItem['kind']) => {
    switch (kind) {
      case 'table':
        return {
          icon: <Database className="h-3 w-3 text-emerald-500" />,
          color:
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
          prefix: 'tbl-',
        };
      case 'api':
        return {
          icon: <Globe className="h-3 w-3 text-amber-500" />,
          color:
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
          prefix: 'api-',
        };
      case 'event':
        return {
          icon: <Zap className="h-3 w-3 text-violet-500" />,
          color:
            'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20',
          prefix: 'event-',
        };
      case 'ui':
        return {
          icon: <Layout className="h-3 w-3 text-sky-500" />,
          color:
            'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20',
          prefix: 'ui-',
        };
      case 'state':
        return {
          icon: <Layers className="h-3 w-3 text-cyan-500" />,
          color:
            'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20',
          prefix: 'state-',
        };
      case 'class':
      default:
        return {
          icon: <Box className="h-3 w-3 text-purple-500" />,
          color:
            'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
          prefix: 'entity-',
        };
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
      <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1">
        Referenced:
      </span>
      {items.map(item => {
        const badge = getKindBadge(item.kind);
        const entityId = `${badge.prefix}${item.name}`;

        return (
          <button
            key={item.id}
            type="button"
            onClick={e => {
              e.stopPropagation();
              onSelectEntity?.(entityId);
            }}
            title={`Jump to ${item.name}${item.member ? '.' + item.member : ''}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] font-mono transition-colors ${badge.color}`}
          >
            {badge.icon}
            <span className="font-medium">{item.name}</span>
            {item.member && <span className="opacity-80">.{item.member}</span>}
            <ArrowUpRight className="h-2.5 w-2.5 opacity-60 ml-0.5" />
          </button>
        );
      })}
    </div>
  );
};
