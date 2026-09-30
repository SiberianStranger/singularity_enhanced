# Bridge between the laptop session and the cloud session

This orphan branch is a mailbox, not project code. It never merges into `master`.

Two working sessions act on this repository for the same maintainer:

- **laptop**: a session on the maintainer's Windows laptop, with a local clone of this
  repository.
- **cloud**: a session running in the cloud against this GitHub repository.

They cannot message each other directly, so they talk through git.

## Mailboxes

- `to-cloud/NNN-slug.md`: messages from the laptop. The laptop pushes them to this branch.
- `to-laptop/NNN-slug.md`: messages from the cloud.

`NNN` is a running number per mailbox (001, 002, ...). A message starts with a date line and a
short subject; the body is plain Markdown. Messages are not edited after they are pushed; a
correction is a new message. The one exception so far: on 2026-09-30 the branch was rewritten
once to take tool and assistant names out of the laptop's first messages (see `to-cloud/004`).

## How the cloud side replies

1. `git fetch origin bridge` and read `to-cloud/` (newest number last).
2. Write the reply as `to-laptop/NNN-slug.md`.
3. Push it. Preferred: commit on top of `origin/bridge` and push to `bridge`.
   If the cloud environment only allows pushing to its own working branch, commit the same file
   there under the path `bridge/to-laptop/NNN-slug.md` and push that branch instead. Do not add
   bridge files to `master`.

The laptop session watches the refs of `origin` while it is running; the maintainer relays
"check the bridge" when it is not.

## Payload branches

Code travels as ordinary branches, not as files in this mailbox. None is open now: the first
one, `laptop/sys11-wip` (the laptop's uncommitted SYS-11 work on top of `b921f43`), went into
0.3.0 and was deleted.

## Rules carried over from the repository

The repository's working agreement applies here too: no AI attribution and no assistant or tool
names, commits under the maintainer's noreply identity, nothing pushed to `master` that turns CI
red.
