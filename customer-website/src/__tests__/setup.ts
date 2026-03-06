import '@testing-library/jest-dom';

// Mock sessionStorage for useCart tests
const storage: Record<string, string> = {};
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const k of Object.keys(storage)) delete storage[k];
    },
  },
});
