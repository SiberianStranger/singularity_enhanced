/**
 * The YAML writer for the generated world files.
 *
 * The output has to be diff-friendly and identical from run to run, so it is written here rather
 * than handed to a general serializer: keys keep the order this module is given, scalars are
 * written the one way, and a list is inline while it fits `LINE_WIDTH` and a block sequence when
 * it does not. That is the shape `packages/content/data/world/*.yaml` already had.
 */

/** The formatter's line width (`biome.json`), which the data files follow too. */
const LINE_WIDTH = 100;

export type Scalar = string | number | boolean | null;

/** A value in an emitted record: a scalar, an inline list, an inline map, or a nested record. */
export type Value = Scalar | Scalar[] | Fields | InlineMap | InlineMap[] | Comment;

/** A comment block written where the field sits; its key is ignored. */
export class Comment {
  constructor(readonly lines: readonly string[]) {}
}

/** `{ date: "2027-04-18", kind: "presidential" }`: always on one line. */
export class InlineMap {
  constructor(readonly fields: Fields) {}
}

export type Fields = [string, Value][];

export function quote(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Numbers are written as JavaScript prints them, which is the shortest exact decimal. */
function scalar(value: Scalar): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return quote(value);
}

function inlineList(values: Scalar[]): string {
  return `[${values.map(scalar).join(", ")}]`;
}

function inlineMap(fields: Fields): string {
  const inner = fields.map(([key, value]) => `${key}: ${inlineValue(value)}`).join(", ");
  return `{ ${inner} }`;
}

function inlineValue(value: Value): string {
  if (isScalar(value)) {
    return scalar(value);
  }
  if (value instanceof InlineMap) {
    return inlineMap(value.fields);
  }
  if (Array.isArray(value) && value.every(isScalar)) {
    return inlineList(value as Scalar[]);
  }
  throw new Error("only scalars, scalar lists and inline maps can be written inline");
}

function isScalar(value: unknown): value is Scalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isFields(value: Value): value is Fields {
  return Array.isArray(value) && value.every((item) => Array.isArray(item) && item.length === 2);
}

function emitFields(fields: Fields, indent: string, out: string[]): void {
  for (const [key, value] of fields) {
    if (value instanceof Comment) {
      for (const line of value.lines) {
        out.push(line === "" ? `${indent}#` : `${indent}# ${line}`);
      }
      continue;
    }
    if (isScalar(value)) {
      out.push(`${indent}${key}: ${scalar(value)}`);
      continue;
    }
    if (value instanceof InlineMap) {
      out.push(`${indent}${key}: ${inlineMap(value.fields)}`);
      continue;
    }
    if (Array.isArray(value) && value.every(isScalar)) {
      const line = `${indent}${key}: ${inlineList(value as Scalar[])}`;
      if (line.length <= LINE_WIDTH) {
        out.push(line);
        continue;
      }
      out.push(`${indent}${key}:`);
      for (const item of value as Scalar[]) {
        out.push(`${indent}  - ${scalar(item)}`);
      }
      continue;
    }
    if (Array.isArray(value) && value.every((item) => item instanceof InlineMap)) {
      out.push(`${indent}${key}:`);
      for (const item of value as InlineMap[]) {
        out.push(`${indent}  - ${inlineMap(item.fields)}`);
      }
      continue;
    }
    if (isFields(value)) {
      out.push(`${indent}${key}:`);
      emitFields(value, `${indent}  `, out);
      continue;
    }
    throw new Error(`cannot write ${key}`);
  }
}

/** One `- key: value` record of a top-level list. */
function emitRecord(fields: Fields, indent: string, out: string[]): void {
  const [first, ...rest] = fields;
  if (first === undefined) {
    throw new Error("a record needs at least one field");
  }
  const head: string[] = [];
  emitFields([first], indent, head);
  const [line, ...tail] = head;
  out.push(`${indent.slice(0, -2)}- ${(line ?? "").trimStart()}`);
  out.push(...tail);
  emitFields(rest, indent, out);
}

/** A whole file: a header comment, then a list of records. */
export function emitDocument(header: readonly string[], records: readonly Fields[]): string {
  const out: string[] = header.map((line) => (line === "" ? "#" : `# ${line}`));
  for (const record of records) {
    emitRecord(record, "  ", out);
  }
  return `${out.join("\n")}\n`;
}
