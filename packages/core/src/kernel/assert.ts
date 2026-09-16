/** Exhaustiveness guard for discriminated unions. */
export function assertNever(value: never, what: string): never {
  throw new Error(`unhandled ${what}: ${JSON.stringify(value)}`);
}
