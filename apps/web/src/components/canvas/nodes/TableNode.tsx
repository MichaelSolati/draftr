import {type TableSpec} from '@draftr/core';
import {Handle, type NodeProps, Position} from '@xyflow/react';
import {Database, Key, Link} from 'lucide-react';
import React, {memo} from 'react';

export const TableNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as TableSpec;

  return (
    <div className="relative min-w-[240px] rounded-lg border border-emerald-500/30 bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-visible">
      {/* Node-level Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !bg-emerald-500/50 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-emerald-500/50 !border-2 !border-background"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-2 rounded-t-lg">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
          <Database className="h-3.5 w-3.5" />
          <span>{spec.name}</span>
        </div>
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
          Table
        </span>
      </div>

      {/* Columns List */}
      <div className="p-2 space-y-1 bg-background/50 rounded-b-lg">
        {spec.columns && spec.columns.length > 0 ? (
          spec.columns.map((col, idx) => (
            <div
              key={`col-${idx}`}
              className="flex items-center justify-between py-1 px-1 font-mono text-[11px] rounded hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-1">
                {col.isPrimary && (
                  <Key className="h-3 w-3 text-amber-500 inline shrink-0" />
                )}
                {col.isForeignKey && (
                  <Link className="h-3 w-3 text-sky-500 inline shrink-0" />
                )}
                <span
                  className={
                    col.isPrimary
                      ? 'font-bold text-foreground'
                      : 'text-foreground'
                  }
                >
                  {col.name}
                </span>
                {col.isPrimary && (
                  <span className="rounded bg-amber-500/15 text-[9px] px-1 text-amber-600 dark:text-amber-400 font-bold">
                    PK
                  </span>
                )}
                {col.isForeignKey && (
                  <span className="rounded bg-sky-500/15 text-[9px] px-1 text-sky-600 dark:text-sky-400 font-bold">
                    FK
                  </span>
                )}
                {col.isUnique && !col.isPrimary && (
                  <span className="rounded bg-muted text-[9px] px-1 text-muted-foreground">
                    UQ
                  </span>
                )}
              </div>

              <span className="text-[10px] text-muted-foreground">
                {col.type}
              </span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground italic px-1">
            No columns
          </div>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
