/**
 * The two content indexes the in-game panels still need.
 *
 * The view sends locale keys for everything it names itself. What it sends as bare ids is the
 * graph: a tech's `requires` and `unlocks` are tech ids and operation ids, and the panel that
 * prints them has to know which kind each one is before it can name it. That is this lookup, and
 * nothing else: no panel reads content for numbers, which all come from the view.
 */

import type { OperationDef, TechDef } from "@singularity/core";
import { contentBundle } from "./bundle.js";

function index<T extends { id: string }>(
  records: readonly T[] | undefined,
): ReadonlyMap<string, T> {
  return new Map((records ?? []).map((record) => [record.id, record]));
}

export const techById: ReadonlyMap<string, TechDef> = index(contentBundle.techs);
export const operationById: ReadonlyMap<string, OperationDef> = index(contentBundle.operations);
