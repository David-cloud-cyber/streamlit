## 2025-05-18 - Accessibility Attributes on Dynamic Navigation and Alert Containers
**Learning:** Adding `aria-current="page"` to active sidebar items and `role="alert"` / `aria-live="polite"` to toast banners significantly improves screen reader context without altering visual presentation.
**Action:** Always include ARIA live regions for toast messages and aria-current for current page/view navigation buttons.
