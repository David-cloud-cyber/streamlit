## 2026-09-12 - Sidebar Navigation & Section Icon Accessibility
**Learning:** In React SPAs using custom button-based sidebar navigation and section headings, active items need `aria-current="page"` to inform screen readers of the active view, and decorative Lucide icons within headings/buttons should be hidden using `aria-hidden="true"` to prevent redundant screen reader announcements.
**Action:** Always set `aria-current="page"` on active navigation buttons and wrap or annotate decorative icon components with `aria-hidden="true"`.
