## 2026-10-10 - Active Navigation and Dynamic Toast Accessibility
**Learning:** Active sidebar buttons require `aria-current="page"` to signal current view location to assistive technology, and dynamic notification toasts require `role="status"` with `aria-live="polite"` to be announced without interrupting active screen reader speech.
**Action:** Always include `aria-current="page"` on active navigation tabs and `role="status"` with `aria-live="polite"` on toast/banner components.
