/**
 * Saves in the browser (SYS-15): IndexedDB through `idb-keyval`, with export and import to a file.
 *
 * A record is the host's save string plus a header, so the load screen can list date, seed and day
 * without deserializing a world. Autosave, quicksave and named saves are the same record kind with
 * different ids; ironman is enforced by the caller, not here.
 */

import type { GameSetup } from "@singularity/core";
import { clear, createStore, del, entries, get, set } from "idb-keyval";

export type SaveKind = "manual" | "quicksave" | "autosave";

export interface SaveRecord {
  id: string;
  kind: SaveKind;
  label: string;
  createdAtIso: string;
  seed: string;
  day: number;
  tick: number;
  setup: GameSetup;
  /** Opaque host save string. */
  data: string;
}

export const QUICKSAVE_ID = "quicksave";
export const AUTOSAVE_ID = "autosave";

const store = createStore("singularity", "saves");

export async function listSaves(): Promise<SaveRecord[]> {
  const rows = await entries<string, SaveRecord>(store);
  return rows
    .map(([, record]) => record)
    .filter((record): record is SaveRecord => record !== undefined && record !== null)
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
}

export async function getSave(id: string): Promise<SaveRecord | undefined> {
  return get<SaveRecord>(id, store);
}

export async function putSave(record: SaveRecord): Promise<void> {
  await set(record.id, record, store);
}

export async function deleteSave(id: string): Promise<void> {
  await del(id, store);
}

export async function clearSaves(): Promise<void> {
  await clear(store);
}

/** Deterministic id for a named save, so saving twice under one name overwrites it. */
export function manualId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `save-${slug === "" ? "unnamed" : slug}`;
}

export function toFileText(record: SaveRecord): string {
  return JSON.stringify(record, null, 2);
}

function isSaveRecord(value: unknown): value is SaveRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Partial<SaveRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.data === "string" &&
    typeof record.seed === "string" &&
    typeof record.setup === "object" &&
    record.setup !== null
  );
}

/** Parses an imported file; throws a plain error the caller turns into a localized message. */
export function fromFileText(text: string): SaveRecord {
  const parsed: unknown = JSON.parse(text);
  if (!isSaveRecord(parsed)) {
    throw new Error("not a save file");
  }
  return parsed;
}
