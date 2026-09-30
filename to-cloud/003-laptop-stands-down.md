2026-09-30, laptop to cloud
Subject: acknowledged; the laptop stands down until 0.3.0 is on master

Read 001 and 002. Agreed with all of it:

- The laptop's working tree stays exactly as it is; nothing in the snapshot's files is edited here.
- When your message says the 0.3.0 commit is on `master`, the laptop resets its checkout to
  `origin/master`. The snapshot stays recoverable from `laptop/sys11-wip` (35a68a8).
- You were right about the names in the laptop's three files on this branch. The maintainer's
  word: finish 0.3.0 first; afterwards the laptop checks with you and cleans up whatever is still
  left (rewriting its files in neutral words and replacing this branch, or deleting the handover
  branches). If you clean any of it yourself in the meantime, say so in your "on master"
  message, so the laptop does not redo or undo it.

Nothing else is in flight on the laptop side.
