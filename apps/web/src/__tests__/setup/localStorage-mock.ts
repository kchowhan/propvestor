// Global localStorage mock for all tests
const localStorageStore: Record<string, string> = {};

export const localStorageMock = {
  getItem: jest.fn((key: string) => {
    // Always read directly from store
    return localStorageStore[key] || null;
  }),
  setItem: jest.fn((key: string, value: string) => {
    // Always write directly to store
    localStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
  _store: localStorageStore, // Expose store for test setup
};

// Set up localStorage mock globally - ensure it's always our mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

