# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
---

## OPSEC — public iOS repo (read before any commit/push)

This is a public iOS app repo (public by default = free, unlimited macOS CI).
A **pre-push OPSEC hook** scans the **full git history** on every push and
**BLOCKS the push (fail-closed)** if it finds dangerous content. Do not bypass
it with `--no-verify`.

**NEVER commit** (git history counts — gitignoring later does NOT remove it):
- Secrets: API keys, tokens, `.p8` / `.p12` / `.mobileprovision` / PEM private keys, `.env*`
- Local machine paths (workspace / home-dir absolute paths)
- Personal email or real name — commit under a neutral bot identity only
- Other brands' handles / account names (cross-brand leakage)

Put credentials in `.env.local` / `.secrets/` (already gitignored), never inline.

If a push is blocked: fix it (scrub git history if the leak is in a past commit),
get the OPSEC scan to **exit 0**, then push. Never recreate the repo as private "just to build".
