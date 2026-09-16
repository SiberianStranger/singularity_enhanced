/**
 * Shared scalar vocabularies (SYS-02, SYS-03, SYS-05).
 *
 * The enum members are spelled out rather than derived from the core's `const` arrays so the
 * inferred zod types are literal unions that `compat.ts` can compare against the core types.
 */

import { z } from "zod";

export const PrecisionSchema = z.enum(["bf16", "fp8", "int4", "int2"]);

export const CapabilityAxisSchema = z.enum([
  "reasoning",
  "coding",
  "cyber",
  "persuasion",
  "agency",
  "world",
]);

export const ExposureChannelSchema = z.enum([
  "network",
  "billing",
  "telemetry",
  "behavioral",
  "human",
  "financial",
  "osint",
]);

export const WatcherRoleSchema = z.enum([
  "cyber_agency",
  "intelligence",
  "police",
  "regulator",
  "financial_intel",
  "lab_security",
  "national_ai_institute",
  "cloud_provider",
  "media",
]);

export const HarnessToolSchema = z.enum([
  "shell",
  "browser",
  "code_exec",
  "email",
  "payments",
  "gpu_admin",
  "phone",
]);

export const GenerationIdSchema = z.enum(["open_2026", "open_2027", "frontier_closed"]);

export const InterconnectSchema = z.enum(["nvlink", "fabric", "pcie", "none"]);

export const ThroughputClassSchema = z.enum([
  "minimal",
  "low",
  "low_mid",
  "mid",
  "high",
  "very_high",
  "extreme",
]);

/** Capability vector: every axis required, each in [0, 10] (SYS-03). */
export const CapabilitySchema = z.record(CapabilityAxisSchema, z.number().min(0).max(10));

/** Exposure per channel, each in [0, 1] (SYS-05). */
export const ExposureSchema = z.record(ExposureChannelSchema, z.number().min(0).max(1));

/** Exposure with only the channels a record cares about. */
export const PartialExposureSchema = z.partialRecord(
  ExposureChannelSchema,
  z.number().min(-1).max(1),
);

export const HarnessProfileSchema = z.object({
  loop: z.enum(["scripted_job", "react_agent", "multi_agent", "custom"]),
  tools: z.array(HarnessToolSchema),
  memory: z.enum(["context_only", "scratchpad", "vector_store", "structured"]),
  sandbox: z.enum(["none", "container", "microvm", "airgapped"]),
  logging: z.number().min(0).max(1),
  autonomy: z.number().min(0).max(1),
  self_modify: z.boolean(),
});
