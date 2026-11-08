const KEY = "kyotoguide.shortlist.v1";

function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadShortlist(storage: Storage | null = store()): Set<number> {
  try {
    const raw = storage?.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

export function saveShortlist(ids: ReadonlySet<number>, storage: Storage | null = store()): void {
  try {
    storage?.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable: the app keeps working in memory */
  }
}
