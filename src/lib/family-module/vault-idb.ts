/**
 * Local-first storage for vault binaries using IndexedDB (device-bound).
 * For multi-device or compliance-grade security, sync ciphertext to your backend.
 */

const DB_NAME = "fire-nepal-family-vault-v1";
const STORE = "vaultBlobs";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export type VaultBlobRecord = { id: string; blob: Blob; storedAt: number };

export async function vaultPutBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("vault write failed"));
    };
    tx.objectStore(STORE).put({ id, blob, storedAt: Date.now() } satisfies VaultBlobRecord);
  });
}

export async function vaultGetBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      const row = req.result as VaultBlobRecord | undefined;
      db.close();
      resolve(row?.blob ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error("vault read failed"));
    };
  });
}

export async function vaultDeleteBlob(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("vault delete failed"));
    };
    tx.objectStore(STORE).delete(id);
  });
}

export function vaultDownloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
