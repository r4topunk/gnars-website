if (typeof window === "undefined") {
  const storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() {
      return 0;
    },
  } as Storage;

  try {
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
  } catch {
    // Ignore if localStorage is non-configurable
  }
}
