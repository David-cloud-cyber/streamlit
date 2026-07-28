# Palette's Journal - MoneyPrinterTurbo Studio UX & Accessibility

## 2025-02-17 - Sidebar Navigation & Indicator Accessibility
**Learning:** Decorative icons inside interactive button controls can cause redundant audio announcements on screen readers if not properly hidden using `aria-hidden="true"`. Furthermore, visual states like "active" tabs or pages should be explicitly communicated programmatically using `aria-current="page"`. Similarly, status indicators using visual elements (icons and color-coding alone) should include clear `title` attributes for desktop tooltips and corresponding `aria-label` labels for assistive technology to ensure everyone has the same contextual feedback.
**Action:** Always wrap or mark purely decorative icons with `aria-hidden="true"`, mark the active navigation node with `aria-current="page"`, and augment dynamic state indicator icons with both `title` and `aria-label` attributes describing the exact state (e.g., API online or offline).
