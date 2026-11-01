'use client';

import type { OcrDocument } from './types';

/**
 * Where a converted document is kept: this browser's IndexedDB, and nowhere
 * else. Not the server, not sessionStorage (page images outgrow its few
 * megabytes), and not the URL — the canvas is opened with an id, and the id
 * means nothing to anyone without this browser.
 *
 * The most recent conversions only: `KEEP` of them, oldest dropped first, so a
 * shared office machine does not quietly accumulate every scan anyone read.
 */
const DB = 'syn-ocr';
const STORE = 'documents';
const KEEP = 5;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = body(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function saveOcrDocument(document: OcrDocument): Promise<void> {
  await run('readwrite', (store) => store.put(document));
  const all = await run<OcrDocument[]>('readonly', (store) => store.getAll());
  const stale = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(KEEP);
  for (const doc of stale) await run('readwrite', (store) => store.delete(doc.id));
}

export function loadOcrDocument(id: string): Promise<OcrDocument | undefined> {
  return run<OcrDocument | undefined>('readonly', (store) => store.get(id));
}

export function deleteOcrDocument(id: string): Promise<undefined> {
  return run('readwrite', (store) => store.delete(id));
}
