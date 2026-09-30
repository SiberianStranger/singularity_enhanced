/** A deterministic linked-slider plan over compute remaining after operation reservations. */

export interface ComputeAllocationPlanInput {
  capacity: number;
  jobsLimit: number;
  /** Keys, including zero-valued ones, are the player's explicitly selected research projects. */
  research: Record<string, number>;
  jobs: number;
  target: "research" | "jobs" | "free";
  value: number;
}

export interface ComputeAllocationPlan {
  research: Record<string, number>;
  jobs: number;
  free: number;
}

function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Divide only scaled weights, so even a stale map of very large allocations stays finite. */
function firstShare(total: number, first: number, second: number): number {
  const scale = Math.max(first, second);
  if (scale === 0) return 0;
  const a = first / scale;
  return total * (a / (a + second / scale));
}

function researchPlan(
  keys: readonly string[],
  weights: Readonly<Record<string, number>>,
  total: number,
): Record<string, number> {
  const plan = Object.fromEntries(keys.map((id) => [id, 0]));
  const maximum = keys.reduce((largest, id) => Math.max(largest, weights[id] ?? 0), 0);
  const selected = maximum > 0 ? keys.filter((id) => (weights[id] ?? 0) > 0) : keys;
  const denominator =
    maximum > 0
      ? selected.reduce((sum, id) => sum + (weights[id] ?? 0) / maximum, 0)
      : selected.length;
  let remaining = total;
  for (const [position, id] of selected.entries()) {
    const weight = maximum > 0 ? (weights[id] ?? 0) / maximum : 1;
    // Give the rounding remainder to the final participating project in stable ID order.
    const amount =
      position === selected.length - 1
        ? remaining
        : Math.min(remaining, total * (weight / denominator));
    plan[id] = amount;
    remaining = Math.max(0, remaining - amount);
  }
  return plan;
}

/**
 * Move one slider and scale the other two in their existing proportions. A capped job share
 * becomes free capacity; when free itself was chosen, selected research receives that overflow.
 * With no remaining weights, idle capacity is the fallback. Lowering an entirely free pool
 * assigns paid work first and then explicitly selected research. This function chooses no tech.
 *
 * Inputs are sanitized for previews; authoritative command validation still rejects bad input.
 * No decimal rounding is applied: subtraction carries floating-point remainders into free work.
 */
export function planComputeAllocation(input: ComputeAllocationPlanInput): ComputeAllocationPlan {
  const capacity = nonnegative(input.capacity);
  const limit = Math.min(capacity, nonnegative(input.jobsLimit));
  const value = Math.min(capacity, nonnegative(input.value));
  const keys = Object.keys(input.research).sort();
  const weights = Object.fromEntries(keys.map((id) => [id, nonnegative(input.research[id] ?? 0)]));
  const oldJobs = nonnegative(input.jobs);
  const maximum = keys.reduce(
    (largest, id) => Math.max(largest, weights[id] ?? 0),
    Math.max(capacity, oldJobs),
  );
  const researchWeight =
    maximum > 0 ? keys.reduce((sum, id) => sum + (weights[id] ?? 0) / maximum, 0) : 0;
  const jobsWeight = maximum > 0 ? oldJobs / maximum : 0;
  const freeWeight =
    maximum > 0 ? Math.max(0, capacity / maximum - researchWeight - jobsWeight) : 0;
  let research = 0;
  let jobs = 0;

  switch (input.target) {
    case "research": {
      research = keys.length > 0 ? value : 0;
      jobs = Math.min(limit, firstShare(capacity - research, jobsWeight, freeWeight));
      break;
    }
    case "jobs": {
      jobs = Math.min(limit, value);
      research = firstShare(capacity - jobs, researchWeight, freeWeight);
      break;
    }
    case "free": {
      const remaining = capacity - value;
      if (researchWeight + jobsWeight > 0) {
        research = firstShare(remaining, researchWeight, jobsWeight);
        jobs = Math.min(limit, remaining - research);
        if (keys.length > 0) research = remaining - jobs;
      } else {
        jobs = Math.min(limit, remaining);
        if (keys.length > 0) research = remaining - jobs;
      }
      break;
    }
  }

  return {
    research: researchPlan(keys, weights, research),
    jobs,
    free: Math.max(0, capacity - jobs - research),
  };
}
