/**
 * Recursively converts all Date objects to ISO strings in a nested object
 */

export type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends object
      ? SerializeDates<T[K]>
      : T[K]
}

export function serializeDates<T>(obj: T): SerializeDates<T> {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      value instanceof Date ? value.toISOString() : value
    )
  ) as SerializeDates<T>
}
