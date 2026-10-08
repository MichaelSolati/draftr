import type {ArchitectureProject} from '@draftr/core';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  buildClaudeHandoffPayload,
  formatClipboardPrompt,
  sendHandoffToLocalBridge,
} from '../handoff';

describe('handoff agent utilities', () => {
  const mockProject: ArchitectureProject = {
    id: 'proj-123',
    name: 'OrderProcessing',
    rawOutlineText: 'class OrderService\n  public process(): void',
    classes: [
      {
        id: 'cls-1',
        name: 'OrderService',
        kind: 'class',
        methods: [
          {
            name: 'process',
            returnType: 'void',
            visibility: 'public',
            parameters: [],
            calls: [],
          },
        ],
        properties: [],
      },
    ],
    uiComponents: [],
    connections: [],
    createdAt: 1000,
    updatedAt: 2000,
  };

  it('builds a valid Claude handoff payload', () => {
    const payload = buildClaudeHandoffPayload(mockProject);
    expect(payload.projectId).toBe('proj-123');
    expect(payload.projectName).toBe('OrderProcessing');
    expect(payload.rawOutlineText).toContain('OrderService');
    expect(payload.mermaidClassDiagram).toContain('classDiagram');
    expect(payload.mermaidFlowchart).toContain('flowchart');
  });

  it('formats clipboard prompt correctly with XML tags', () => {
    const prompt = formatClipboardPrompt(mockProject);
    expect(prompt).toContain(
      '<draftr_specification project="OrderProcessing">'
    );
    expect(prompt).toContain('<raw_outline>');
    expect(prompt).toContain('<mermaid_class_diagram>');
    expect(prompt).toContain('<mermaid_flowchart>');
    expect(prompt).toContain('<data_contract_json>');
    expect(prompt).toContain('</draftr_specification>');
  });

  describe('sendHandoffToLocalBridge', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns success when endpoint responds ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as unknown as Response);

      const result = await sendHandoffToLocalBridge(mockProject);
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4318/api/claude/handoff',
        expect.objectContaining({method: 'POST'})
      );
    });

    it('returns error when endpoint responds non-ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as unknown as Response);

      const result = await sendHandoffToLocalBridge(mockProject);
      expect(result.success).toBe(false);
      expect(result.message).toContain('500');
    });

    it('returns error on fetch exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await sendHandoffToLocalBridge(mockProject);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection refused');
    });
  });
});
