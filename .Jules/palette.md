## 2026-10-23 - Screen Reader Live Announcements and Navigation ARIA Attributes
**Learning:** Toast banners without `role="status"` and `aria-live="polite"` fail to be announced to screen reader users when generated dynamically. In addition, active sidebar navigation items need `aria-current="page"` for clear assistive tech landmark navigation.
**Action:** Always add `role="status"` and `aria-live="polite"` to toast notification containers, and mark active navigation items with `aria-current="page"`.
