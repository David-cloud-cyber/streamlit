# Palette's Journal - Critical Learnings Only

This journal contains critical UX/accessibility learnings and patterns identified while enhancing the MoneyPrinter SaaS Studio interface.

## 2025-02-23 - Micro-UX and Accessibility Enhancements
**Learning:** Adding semantic HTML tags and ARIA attributes (such as `aria-current="page"`, `aria-hidden="true"`, and `role="alert"`) vastly improves screen reader accessibility without interfering with Tailwind CSS or layout. Wrapping the label text and required asterisk together prevents CSS `justify-content: space-between` from splitting them across the page width.
**Action:** When defining custom layouts (e.g. `.field-label` which has `justify-content: space-between`), nest children to keep related semantic elements close visually.
