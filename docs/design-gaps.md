# Design gaps

Flow steps with no matching file in `design/`. Each got a minimal functional version built
only from existing `src/components/ui` primitives and tokens (no new visual patterns),
marked `// design-pending` at its entry point. Replace with the real design and remove the
row here once one exists — see "NEW DESIGNS ROUTINE" in CLAUDE.md working style.

| Screen | Flow | What it needs to do | Built from | Route |
|---|---|---|---|---|
| Guides | 1 — Discover (Platform Shell nav item) | Index of admission-process/documents/board explainer articles. Platform Shell's design names it as one of 5 primary nav items but no guide-content screen exists anywhere in `design/`. | page tokens only (`border-rule`, `text-card`/`text-body`, `rounded-md`) — no existing card component fit an article-topic list | `/[locale]/guides` |
