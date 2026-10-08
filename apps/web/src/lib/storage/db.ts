import {openDB, type IDBPDatabase} from 'idb';
import {type ArchitectureProject} from '@draftr/core';

const DB_NAME = 'draftr_db';
const DB_VERSION = 1;

interface SpecDB {
  projects: {
    key: string;
    value: ArchitectureProject;
    indexes: {'by-updated': number};
  };
  metadata: {
    key: string;
    value: {key: string; value: string};
  };
}

let dbPromise: Promise<IDBPDatabase<SpecDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SpecDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SpecDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', {
            keyPath: 'id',
          });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', {keyPath: 'key'});
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: ArchitectureProject): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function getProject(
  id: string
): Promise<ArchitectureProject | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function listProjects(): Promise<
  Array<{id: string; name: string; updatedAt: number}>
> {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all
    .map(p => ({id: p.id, name: p.name, updatedAt: p.updatedAt}))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function getActiveProjectId(): Promise<string | null> {
  const local = localStorage.getItem('draftr-active-project-id');
  if (local) return local;

  const db = await getDB();
  const meta = await db.get('metadata', 'activeProjectId');
  return meta ? meta.value : null;
}

export async function setActiveProjectId(id: string): Promise<void> {
  localStorage.setItem('draftr-active-project-id', id);
  const db = await getDB();
  await db.put('metadata', {key: 'activeProjectId', value: id});
}
