/// <reference types="vite/client" />

/**
 * The compiled content bundle, aliased in `vite.config.ts` to
 * `packages/content/build/bundle.json` (produced by `pnpm content:build`). It is declared as
 * `unknown` on purpose: `content/bundle.ts` is the single place that narrows it to `ContentBundle`.
 */
declare module "@content/bundle" {
  const bundle: unknown;
  export default bundle;
}

/** The workspace version, defined in `vite.config.ts`; read through `lib/runLog.ts`. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /**
   * Which `GameHost` implementation the client builds with; "worker" by default. "local" runs the
   * same core on the main thread, and "mock" is the old name for it.
   */
  readonly VITE_HOST?: "local" | "mock" | "worker";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
