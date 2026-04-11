const PREFIX = 'chemReactions';

function prefixedKey(key: string): string {
  return `${PREFIX}:${key}`;
}

export function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(prefixedKey(key), JSON.stringify(data));
}

export function loadFromStorage<T>(key: string): T | null {
  const raw = localStorage.getItem(prefixedKey(key));
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(prefixedKey(key));
}

const LAST_OPENED_KEY = 'lastOpenedScreen';
const COMPLETED_KEY = 'completedScreens';

export function setLastOpenedScreen(screen: string): void {
  saveToStorage(LAST_OPENED_KEY, screen);
}

export function getLastOpenedScreen(): string | null {
  return loadFromStorage<string>(LAST_OPENED_KEY);
}

export function setScreenCompleted(screen: string): void {
  const completed = loadFromStorage<string[]>(COMPLETED_KEY) ?? [];
  if (!completed.includes(screen)) {
    completed.push(screen);
    saveToStorage(COMPLETED_KEY, completed);
  }
}

export function hasCompletedScreen(screen: string): boolean {
  const completed = loadFromStorage<string[]>(COMPLETED_KEY) ?? [];
  return completed.includes(screen);
}
