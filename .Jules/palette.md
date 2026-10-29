## 2026-10-29 - Navigation and Notification Accessibility
**Learning:** Custom button-based sidebar navigation items require `aria-current="page"` (not just `data-active`) and `aria-hidden="true"` on nested icons so screen reader users know which view is active without redundant audio. Toast notifications require `role="status"` and `aria-live="polite"` so state updates are announced politely without interrupting screen reader announcements.
**Action:** Always verify custom button navigation and toast popups have standard ARIA landmarks and live region attributes.
