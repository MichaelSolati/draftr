import {describe, it, expect, beforeEach} from 'vitest';
import {
  saveProject,
  getProject,
  listProjects,
  deleteProject,
  getActiveProjectId,
  setActiveProjectId,
} from '../db';
import type {ArchitectureProject} from '@arch-spec/core';

describe('IndexedDB storage', () => {
  const sampleProject: ArchitectureProject = {
    id: 'test-proj-1',
    name: 'Sample System',
    rawOutlineText: 'class Alpha\n  public run(): void',
    classes: [],
    uiComponents: [],
    connections: [],
    createdAt: 100,
    updatedAt: 200,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves a project', async () => {
    await saveProject(sampleProject);
    const retrieved = await getProject('test-proj-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Sample System');
  });

  it('lists saved projects sorted by updatedAt descending', async () => {
    const proj2: ArchitectureProject = {
      ...sampleProject,
      id: 'test-proj-2',
      name: 'Beta System',
      updatedAt: 300,
    };
    await saveProject(sampleProject);
    await saveProject(proj2);

    const list = await listProjects();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].id).toBe('test-proj-2');
  });

  it('deletes a project', async () => {
    await saveProject(sampleProject);
    await deleteProject('test-proj-1');
    const retrieved = await getProject('test-proj-1');
    expect(retrieved).toBeUndefined();
  });

  it('sets and gets active project ID in localStorage and metadata store', async () => {
    await setActiveProjectId('test-proj-1');
    const active = await getActiveProjectId();
    expect(active).toBe('test-proj-1');

    // Test fallback when localStorage is cleared but indexedDB has it
    localStorage.clear();
    const activeFromDB = await getActiveProjectId();
    expect(activeFromDB).toBe('test-proj-1');
  });
});
