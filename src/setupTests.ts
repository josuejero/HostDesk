import '@testing-library/jest-dom'

class LocalStorageMock implements Storage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key) ?? null : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
  configurable: true,
})
Object.defineProperty(globalThis, 'localStorage', {
  value: window.localStorage,
  configurable: true,
})
