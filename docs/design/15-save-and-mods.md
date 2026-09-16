# SYS-15: Saves, versioning and mods

Status: v0.

## Saves

- A save is the serialized `World` (ADR-003) plus a header: `{ schemaVersion, gameVersion,
  contentHash, seed, players, tick, date, createdAt, label }`. Stored gzip-compressed with a `.s3`
  extension (the original used `.sav` for pickle and `.s2` for JSON).
- Autosave every N game days (setting, default 3, as the original), quicksave (F5) and quickload (F9),
  named saves, and an ironman flag that disables manual saves and quickload.
- Migrations: `migrations/<from>-<to>.ts` pure functions; the loader applies the chain and refuses
  saves newer than the game with a readable message. Content changes that invalidate a save (removed
  ids) are handled by migrations that map or drop with a log entry, never a crash.
- Locations: browser build uses IndexedDB (with export/import to file); desktop uses the app data
  directory or a portable folder next to the executable.
- Bug reports: a save plus the command log since the last save reproduces any issue exactly.

## Mods

- A mod is a folder with `mod.yaml` (`id, name, version, gameVersion, dependencies, loadOrder`) and
  the same `data/` and `locales/` layout as `packages/content`. Records with the same id override;
  `_remove: true` deletes; lists can `_append`.
- Mods are validated with the same `content:check` tool; the game refuses to load invalid mods and
  shows the issues.
- Saves record the mod list and content hash; loading with a different set warns.
- Browser build: mods are zip uploads kept in IndexedDB; desktop: a `mods/` folder.

## Implementation notes

The desktop shell added in the M1 draft (`packages/desktop`, Tauri 2) only hosts the web client.
Its capability set is `core:default`, so it grants no filesystem access, and saves in a desktop
build live in the WebView's IndexedDB exactly as in the browser build, under the shell's own origin
(`tauri://localhost`, `http://tauri.localhost` on Windows). They are therefore per machine and per
user, they are not visible as files next to the executable, and clearing the WebView data directory
deletes them; moving a save between machines goes through the export and import commands of the
save screen.

M6 replaces this: saves and `mods/` move to the application data directory that Tauri resolves per
platform, with the portable flag that keeps them next to the executable, a migration that imports
whatever the IndexedDB store still holds, and filesystem permissions in the capability set scoped
to that directory. The browser build keeps IndexedDB.
