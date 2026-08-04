# Palette's Journal

## 2026-08-04 - Sidebar Accessibility and Navigation Context
**Learning:** Decorative icons inside buttons and section headers cause screen reader clutter and noise. In active sidebar navigation interfaces, users with assistive technologies depend on the `aria-current="page"` attribute to quickly identify which section of the app is currently loaded without having to guess or rely solely on page-level h2 changes.
**Action:** Always wrap active navigation controls with `aria-current="page"` or similar semantic helpers, and flag nested visual/decorative icons with `aria-hidden="true"`.
