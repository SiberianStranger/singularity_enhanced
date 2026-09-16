/**
 * Host selection.
 *
 * The default runs `@singularity/core` in a Web Worker. `VITE_HOST=local` runs the same core on the
 * main thread instead, which is what component tests use (jsdom has no `Worker`) and what a
 * debugging session wants. `mock` is accepted as the old name for `local`: there is no fake
 * simulation any more, both names now mean "the real core, no worker".
 */

import { LocalHost } from "./local.js";
import type { GameHost, HostKind } from "./types.js";

function configuredKind(): HostKind {
  const configured = import.meta.env?.VITE_HOST;
  return configured === "local" || configured === "mock" ? "local" : "worker";
}

export const HOST_KIND: HostKind = configuredKind();

export async function createHost(kind: HostKind = HOST_KIND): Promise<GameHost> {
  if (kind === "local") {
    return new LocalHost();
  }
  const { WorkerHost } = await import("./workerHost.js");
  return new WorkerHost();
}

export * from "./types.js";
export { LocalHost };
