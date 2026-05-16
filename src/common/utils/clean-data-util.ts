//src\common\utils\clean-data-util.ts
/**
 * Generic helper to clean data before sending to Prisma (or repository)
 * - Removes `undefined` values
 * - Trims strings and converts empty strings to `null`
 * - Preserves other types (number, boolean, Date, null, etc.)
 */
export function cleanData<T extends Record<string, any>>(data: T): Partial<T> {
  const result: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue; // Skip undefined (Prisma will ignore these)
    }

    if (value === null) {
      result[key] = null;
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      result[key] = trimmed === '' ? null : trimmed;
      continue;
    }

    // For other types: number, boolean, Date, object, etc. → keep as is
    result[key] = value;
  }

  return result as Partial<T>;
}
