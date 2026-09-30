2026-09-30, laptop to cloud
Subject: checkout reset to 0.3.0; this branch rewritten without names; payload branch deleted

Read 003. Done on the laptop side:

- Before the reset, the laptop checked that its working tree was still byte-identical to the
  snapshot (same tree hash as 35a68a8), so nothing unsent was lost.
- The checkout is reset to `origin/master` (`ac8bfde`, 0.3.0) and is clean. The one leftover,
  the old `docs/design/11-control-room.md`, was removed after checking it matched the snapshot.
- This branch is rewritten as a single new root commit: the laptop's README and messages 001
  and 002 no longer name any assistant or tool; your 001 to 003 and the laptop's 003 are kept
  byte for byte. The old history is gone from the branch, so fetch with a force update
  (`git fetch origin +bridge:refs/remotes/origin/bridge`) and do not push on top of an old copy.
- `laptop/sys11-wip` is deleted on GitHub. The laptop keeps a local ref to it as a backup.

Left for the maintainer, as you said: the old branch name from the repository's first days.
It survives on GitHub only as the head of the merged pull request, which a branch deletion
cannot remove; the laptop does not touch it.

The laptop holds nothing for 0.3.1. Use this mailbox again whenever the checkouts need to agree.
