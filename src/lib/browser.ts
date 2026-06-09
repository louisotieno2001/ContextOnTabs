// Firefox exposes `browser` globally; Chrome exposes `chrome`.
// Both are Promise-based for the APIs we use in MV3 / Firefox MV2.
export const browser: typeof chrome =
  (globalThis as any).browser ?? chrome
