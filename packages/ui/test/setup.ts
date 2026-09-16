import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { initI18n } from "../src/i18n/index.js";

// jsdom has no layout, so these two are stubs rather than behavior under test.
window.scrollTo = (): void => undefined;
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = (): string => "blob:test";
  URL.revokeObjectURL = (): void => undefined;
}

await initI18n();

afterEach(() => {
  cleanup();
});
