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
