export function cloneObject<T>(obj: T): T {
  const clone: Record<string, unknown> = {};
  for (const key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "object" && value !== null) {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  }
  return clone as T;
}

/**
  - for any `x : T` in some array `xs : T[]`,
  ```
  fn(x, i) : U         => returns 
           | undefined => skips
  ```
 */
export function filterMap<T, U>(
  arr: readonly T[],
  fn: (x: T, i: number) => U | undefined,
): U[] {
  const out: U[] = [];
  for (let i = 0; i < arr.length; ++i) {
    const v = fn(arr[i], i);
    if (v !== undefined) out.push(v);
  }
  return out;
}
