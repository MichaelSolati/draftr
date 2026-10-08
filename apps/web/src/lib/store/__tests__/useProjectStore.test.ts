import {describe, it, expect, beforeEach} from 'vitest';
import {useProjectStore} from '../useProjectStore';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      nodePositions: {},
      selectedEntityId: null,
      isEditorMinimized: false,
    });
  });

  it('initializes with default project and parsed entities', () => {
    const state = useProjectStore.getState();
    expect(state.project).toBeDefined();
    expect(state.project.classes.length).toBeGreaterThan(0);
    expect(state.diagnostics).toBeDefined();
  });

  it('updates text and recomputes parsed classes and connections', () => {
    const store = useProjectStore.getState();
    const newText = 'class CustomService\n  + execute(): void\n';
    store.setText(newText);

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toBe(newText);
    expect(updated.project.classes.length).toBe(1);
    expect(updated.project.classes[0].name).toBe('CustomService');
  });

  it('inserts snippets', () => {
    const store = useProjectStore.getState();
    store.setText('class InitialService\n');
    store.insertSnippet('class InsertedService\n');

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toContain('InsertedService');
    expect(updated.project.classes.length).toBe(2);
  });

  it('updates entity text cleanly', () => {
    const store = useProjectStore.getState();
    store.setText(
      'class TargetService\n  + oldMethod(): void\n\nui OtherView\n'
    );
    store.updateEntityText(
      'TargetService',
      'class TargetService\n  + newMethod(): void\n'
    );

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toContain('newMethod()');
    expect(updated.project.rawOutlineText).not.toContain('oldMethod()');
  });

  it('connects member-level wire calls', () => {
    const store = useProjectStore.getState();
    store.setText(
      'class ServiceA\n  + doWork(): void\n\nclass ServiceB\n  + execute(): void\n'
    );
    store.connectWire('ServiceA', 'doWork', 'ServiceB', 'execute');

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toContain(
      'calls ServiceB.execute()'
    );
  });

  it('connects node-level wire binding from UI to Class', () => {
    const store = useProjectStore.getState();
    store.setText('class ServiceA\n\nui ViewA\n');
    store.connectWire('ViewA', null, 'ServiceA', null);

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toContain('binds ServiceA');
  });

  it('connects node-level wire call between classes', () => {
    const store = useProjectStore.getState();
    store.setText('class ServiceA\n\nclass ServiceB\n');
    store.connectWire('ServiceA', null, 'ServiceB', null);

    const updated = useProjectStore.getState();
    expect(updated.project.rawOutlineText).toContain('calls ServiceB');
  });

  it('imports code with append and replace modes', () => {
    const store = useProjectStore.getState();
    store.importCode('class ReplacedService\n', 'replace');
    expect(useProjectStore.getState().project.rawOutlineText).toBe(
      'class ReplacedService\n'
    );

    store.importCode('class AppendedService\n', 'append');
    expect(useProjectStore.getState().project.rawOutlineText).toContain(
      'AppendedService'
    );
  });

  it('updates node positions and preserves them', () => {
    const store = useProjectStore.getState();
    store.setText('class CustomService\n  + execute(): void\n');
    store.setNodePosition('entity-CustomService', {x: 150, y: 350});

    const updated = useProjectStore.getState();
    expect(updated.nodePositions['entity-CustomService']).toEqual({
      x: 150,
      y: 350,
    });
    expect(
      updated.project.classes.find(c => c.id === 'entity-CustomService')
        ?.position
    ).toEqual({x: 150, y: 350});
  });

  it('auto-layouts nodes into ordered positions', () => {
    const store = useProjectStore.getState();
    const nodes = [
      {id: 'a', position: {x: 0, y: 0}, data: {}},
      {id: 'b', position: {x: 0, y: 0}, data: {}},
    ];
    const edges = [{id: 'e', source: 'a', target: 'b'}];

    const positions = store.autoLayout(nodes, edges, 'TB');
    expect(positions['a']).toBeDefined();
    expect(positions['b']).toBeDefined();
    expect(positions['b'].y).toBeGreaterThan(positions['a'].y);
  });

  it('toggles UI modals and selection correctly', () => {
    const store = useProjectStore.getState();
    store.setSelectedEntityId('entity-1');
    expect(useProjectStore.getState().selectedEntityId).toBe('entity-1');

    store.setIsEditorMinimized(true);
    expect(useProjectStore.getState().isEditorMinimized).toBe(true);

    store.setIsSyntaxDocsOpen(true);
    expect(useProjectStore.getState().isSyntaxDocsOpen).toBe(true);

    store.setIsPaletteOpen(true);
    expect(useProjectStore.getState().isPaletteOpen).toBe(true);

    store.setIsExportOpen(true);
    expect(useProjectStore.getState().isExportOpen).toBe(true);

    store.setIsImportOpen(true);
    expect(useProjectStore.getState().isImportOpen).toBe(true);

    store.setIsScaffoldOpen(true);
    expect(useProjectStore.getState().isScaffoldOpen).toBe(true);

    store.setIsClaudeOpen(true);
    expect(useProjectStore.getState().isClaudeOpen).toBe(true);

    store.setIsProjectOpen(true);
    expect(useProjectStore.getState().isProjectOpen).toBe(true);
  });

  it('loads project and handles fallback', async () => {
    const store = useProjectStore.getState();
    await store.loadProject('non-existent-proj');
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().project).toBeDefined();
  });
});
