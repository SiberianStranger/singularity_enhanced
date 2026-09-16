/**
 * Content schemas.
 *
 * Type direction: `@singularity/core` owns the TypeScript types (`EventDef`, `Condition`, ...) and
 * this package validates YAML against zod schemas that produce those shapes. Core never imports
 * content, so there is no cycle. See README.md.
 */

export * from "./bundle.js";
export * from "./common.js";
export type { SchemaCompatibility } from "./compat.js";
export * from "./configurator.js";
export * from "./decisions.js";
export * from "./dsl.js";
export * from "./events.js";
export * from "./hardware.js";
export * from "./journal.js";
export * from "./operations.js";
export * from "./research.js";
export * from "./world.js";
