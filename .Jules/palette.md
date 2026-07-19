# Palette's Journal

## 2025-02-18 - [Accessibility in Sidebar & Components]
**Learning:** Decorative icons inside interactive buttons and section headers cause screen reader noise by announcing redundant or non-descriptive icon names (e.g. "Film", "Clapperboard"). Additionally, dynamic tab/view-switching sidebars require semantic pointers like `aria-current="page"` to let assistive technologies know which view is active.
**Action:** Always wrap or mark inline SVG icons with `aria-hidden="true"` when they are decorative, and use `aria-current="page"` on current nav/view items instead of relying only on `data-active` or CSS class states.
