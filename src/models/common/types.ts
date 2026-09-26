// ISO-8601 date string, e.g. "2026-09-26T10:00:00.000Z".
export type ISOString =
  `${number}-${number}-${number}T${number}:${number}:${number}${string}`;

// Base shape for all entities.
export interface Entity {
  id: string;
  created: ISOString;
}
