/**
 * Seeded xoshiro128** PRNG.
 *
 * The generator state is four 32-bit words kept in a plain `number[]` so it can live inside the
 * serialized `World`. `createRngFromState` binds to the array it is given and writes every step
 * back into it, which keeps `world.rng` in sync without an explicit sync step.
 */

/** Number of 32-bit words in the generator state. */
export const RNG_STATE_WORDS = 4;

const UINT32 = 4294967296;

export class RngError extends Error {
  readonly code = "rng_error";

  constructor(message: string) {
    super(message);
    this.name = "RngError";
  }
}

export interface Weighted {
  weight: number;
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** True with probability `p`; p <= 0 is always false, p >= 1 always true. */
  chance(p: number): boolean;
  /** Uniformly picks one item; throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Picks one item with probability proportional to its weight. */
  weighted<T extends Weighted>(items: readonly T[]): T;
  /** Returns a shuffled copy (Fisher-Yates), leaving the input untouched. */
  shuffle<T>(items: readonly T[]): T[];
  /** Plain-array copy of the state, safe to serialize. */
  getState(): number[];
  setState(state: readonly number[]): void;
}

/** FNV-1a 32-bit hash, used to turn string seeds into a 32-bit number. */
export function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Expands a 32-bit or string seed into a full generator state with splitmix32. */
export function seedToState(seed: number | string): number[] {
  const numeric = typeof seed === "string" ? fnv1a32(seed) : seed >>> 0;
  let x = numeric;
  const state: number[] = [];
  for (let i = 0; i < RNG_STATE_WORDS; i += 1) {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    state.push((z ^ (z >>> 15)) >>> 0);
  }
  // xoshiro is undefined for the all-zero state.
  const total = state.reduce((sum, word) => sum + word, 0);
  if (total === 0) {
    state[0] = 1;
  }
  return state;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

function readWords(state: readonly number[]): [number, number, number, number] {
  const [a, b, c, d] = state;
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    throw new RngError(`rng state must have ${RNG_STATE_WORDS} words, got ${state.length}`);
  }
  if (a === 0 && b === 0 && c === 0 && d === 0) {
    throw new RngError("rng state must not be all zero");
  }
  return [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
}

/** Creates a generator that owns `state` and writes each step back into it. */
export function createRngFromState(state: number[]): Rng {
  let [s0, s1, s2, s3] = readWords(state);

  const sync = (): void => {
    state[0] = s0;
    state[1] = s1;
    state[2] = s2;
    state[3] = s3;
  };
  sync();

  const nextUint32 = (): number => {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    sync();
    return result;
  };

  const next = (): number => nextUint32() / UINT32;

  return {
    next,
    int(maxExclusive: number): number {
      if (!Number.isFinite(maxExclusive) || maxExclusive < 1) {
        throw new RngError(`int() needs a positive bound, got ${maxExclusive}`);
      }
      return Math.floor(next() * maxExclusive);
    },
    chance(p: number): boolean {
      if (!Number.isFinite(p) || p <= 0) {
        return false;
      }
      if (p >= 1) {
        return true;
      }
      return next() < p;
    },
    pick<T>(items: readonly T[]): T {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) {
        throw new RngError("pick() needs a non-empty array");
      }
      return item;
    },
    weighted<T extends Weighted>(items: readonly T[]): T {
      let total = 0;
      for (const item of items) {
        if (Number.isFinite(item.weight) && item.weight > 0) {
          total += item.weight;
        }
      }
      if (total <= 0) {
        throw new RngError("weighted() needs at least one item with a positive weight");
      }
      let roll = next() * total;
      let last: T | undefined;
      for (const item of items) {
        if (!Number.isFinite(item.weight) || item.weight <= 0) {
          continue;
        }
        last = item;
        roll -= item.weight;
        if (roll < 0) {
          return item;
        }
      }
      if (last === undefined) {
        throw new RngError("weighted() found no eligible item");
      }
      return last;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const a = copy[i];
        const b = copy[j];
        if (a === undefined || b === undefined) {
          continue;
        }
        copy[i] = b;
        copy[j] = a;
      }
      return copy;
    },
    getState(): number[] {
      return [s0, s1, s2, s3];
    },
    setState(nextState: readonly number[]): void {
      [s0, s1, s2, s3] = readWords(nextState);
      sync();
    },
  };
}

/** Creates a generator from a numeric or string seed. */
export function createRng(seed: number | string): Rng {
  return createRngFromState(seedToState(seed));
}
