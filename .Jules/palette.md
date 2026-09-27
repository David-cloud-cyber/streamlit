## 2026-09-27 - Active Navigation and Toast Notification Accessibility
**Learning:** In single-page web applications with custom sidebar navigation buttons and inline toast banners, assistive technologies need explicit context: `aria-current="page"` on active view buttons, `aria-hidden="true"` on decorative inline icons, and `role="status"` with `aria-live="polite"` on dynamic alert banners.
**Action:** Always include `aria-current` on tab/navigation elements, mark non-informative icons as decorative (`aria-hidden="true"`), and declare politeness live regions on toast containers.
