# Palette's Journal - MoneyPrinterTurbo Studio UX & Accessibility

This journal tracks critical UX and accessibility learnings.

## 2025-02-24 - Form Fields & Layout Accessibility
**Learning:** Required fields must have visual indicators that are kept close to labels in nested flex containers to avoid separation under various justification rules, and standard ARIA attributes must be present on sidebar navigation to orient screen reader users.
**Action:** Implement required field support in the standard custom `Field` component and update the navigation bar and decorative section titles with appropriate ARIA/aria-hidden attributes.
