const DB_NAME = 'ZNotifyScoringDB';
const DB_VERSION = 1;
const STORE_NAME = 'scoring_runs';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveScoringRun = async (run: any): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(run);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    // Sync metadata + top 10 items to localStorage for instant/sync checks and fallback
    try {
      const existingRunsStr = localStorage.getItem('saved_scoring_runs');
      const existingRuns = existingRunsStr ? JSON.parse(existingRunsStr) : [];
      const runCopy = {
        ...run,
        data: run.data.slice(0, 10) // Small slice to avoid QuotaExceededError
      };
      // Remove any existing copy with the same id
      const filtered = existingRuns.filter((r: any) => r.id !== run.id);
      filtered.unshift(runCopy);
      localStorage.setItem('saved_scoring_runs', JSON.stringify(filtered.slice(0, 5)));
    } catch (e) {
      console.warn("Could not save fallback copy to localStorage:", e);
    }
  } catch (err) {
    console.error("IndexedDB save failed, falling back to localStorage only:", err);
    try {
      // Fallback: save only top 50 records to localStorage to avoid QuotaExceededError
      const existingRunsStr = localStorage.getItem('saved_scoring_runs');
      const existingRuns = existingRunsStr ? JSON.parse(existingRunsStr) : [];
      const runCopy = {
        ...run,
        data: run.data.slice(0, 50)
      };
      const filtered = existingRuns.filter((r: any) => r.id !== run.id);
      filtered.unshift(runCopy);
      localStorage.setItem('saved_scoring_runs', JSON.stringify(filtered.slice(0, 5)));
    } catch (e) {
      console.warn("localStorage fallback save also failed:", e);
      try {
        // If 50 records still exceed quota, retry saving with only top 5 records
        const existingRunsStr = localStorage.getItem('saved_scoring_runs');
        const existingRuns = existingRunsStr ? JSON.parse(existingRunsStr) : [];
        const runCopy = {
          ...run,
          data: run.data.slice(0, 5)
        };
        const filtered = existingRuns.filter((r: any) => r.id !== run.id);
        filtered.unshift(runCopy);
        localStorage.setItem('saved_scoring_runs', JSON.stringify(filtered.slice(0, 3)));
      } catch (innerErr) {
        console.error("Final fallback save failed completely:", innerErr);
      }
    }
  }
};

export const getScoringRuns = async (): Promise<any[]> => {
  try {
    const db = await openDB();
    const runs = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    runs.sort((a, b) => b.id.localeCompare(a.id));
    return runs;
  } catch (err) {
    console.error("IndexedDB read failed, falling back to localStorage:", err);
    const runsStr = localStorage.getItem('saved_scoring_runs');
    return runsStr ? JSON.parse(runsStr) : [];
  }
};

export const deleteScoringRun = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB delete failed:", err);
  }
  
  // Delete from localStorage as well
  try {
    const runsStr = localStorage.getItem('saved_scoring_runs');
    if (runsStr) {
      const runs = JSON.parse(runsStr);
      const updated = runs.filter((r: any) => r.id !== id);
      localStorage.setItem('saved_scoring_runs', JSON.stringify(updated));
    }
  } catch (e) {
    console.error(e);
  }
};
