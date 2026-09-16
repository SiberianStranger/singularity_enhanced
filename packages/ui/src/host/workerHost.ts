/**
 * `GameHost` backed by the simulation worker.
 *
 * The worker owns the clock and pushes views; this class only correlates requests with replies and
 * fans views out to subscribers. Requests are answered exactly once, so a rejected promise always
 * means the worker refused or crashed, never a lost message.
 */

import type { CommandResult, ContentBundle, GameSetup, PlayerCommand } from "@singularity/core";
import type { HostRequest, HostResponse } from "./protocol.js";
import type { GameHost, ViewListener } from "./types.js";

/** Distributes over the request union, which `Omit` on its own would collapse. */
type RequestBody<T = HostRequest> = T extends { id: number } ? Omit<T, "id"> : never;

interface Pending {
  resolve(value: CommandResult | string | undefined): void;
  reject(error: Error): void;
}

export class WorkerHost implements GameHost {
  private readonly worker: Worker;
  private readonly listeners = new Set<ViewListener>();
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private disposed = false;

  constructor(worker?: Worker) {
    this.worker = worker ?? new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<HostResponse>): void => {
      this.receive(event.data);
    };
    this.worker.onerror = (event: ErrorEvent): void => {
      const error = new Error(event.message || "simulation worker failed");
      for (const entry of this.pending.values()) {
        entry.reject(error);
      }
      this.pending.clear();
    };
  }

  private receive(message: HostResponse): void {
    if (message.kind === "view") {
      for (const listener of this.listeners) {
        listener(message.view);
      }
      return;
    }
    const entry = this.pending.get(message.id);
    if (entry === undefined) {
      return;
    }
    this.pending.delete(message.id);
    if (message.ok) {
      entry.resolve(message.result);
    } else {
      entry.reject(new Error(message.error));
    }
  }

  private send(request: RequestBody): Promise<CommandResult | string | undefined> {
    if (this.disposed) {
      return Promise.reject(new Error("host is disposed"));
    }
    const id = this.nextId++;
    const message = { ...request, id } as HostRequest;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(message);
    });
  }

  async init(setup: GameSetup, contentBundle: ContentBundle): Promise<void> {
    await this.send({ type: "init", setup, content: contentBundle });
  }

  async command(cmd: PlayerCommand): Promise<CommandResult> {
    const result = await this.send({ type: "command", command: cmd });
    return typeof result === "object" && result !== null ? result : { ok: true };
  }

  setSpeed(n: number): void {
    void this.send({ type: "set_speed", speed: n }).catch(() => undefined);
  }

  subscribe(listener: ViewListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async save(): Promise<string> {
    const result = await this.send({ type: "save" });
    if (typeof result !== "string") {
      throw new Error("the worker returned no save");
    }
    return result;
  }

  async load(save: string, contentBundle?: ContentBundle): Promise<void> {
    await this.send({
      type: "load",
      save,
      ...(contentBundle === undefined ? {} : { content: contentBundle }),
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.worker.postMessage({ id: 0, type: "dispose" } satisfies HostRequest);
    this.worker.terminate();
    this.listeners.clear();
    this.pending.clear();
  }
}
