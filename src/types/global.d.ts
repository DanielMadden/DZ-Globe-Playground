// src/types/globals.d.ts
export {};

declare global {
  interface Window {
    Globe?: any; // provided by https://cdn.jsdelivr.net/npm/globe.gl
  }
}
