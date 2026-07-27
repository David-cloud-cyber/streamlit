# Palette's Journal - UX & Accessibility Learnings

## 2025-02-18 - [Accessible Form Inputs & Sidebar Navigation]
**Learning:** To keep label text and required asterisks close together regardless of CSS alignment properties (such as `.field-label` with `justify-content: space-between`), wrap them inside a nested flex container (e.g., `span className="flex items-center gap-1"`). Active sidebar navigation buttons should use `aria-current="page"` to signal the active view to assistive technologies, and nested icons within buttons should have `aria-hidden="true"` to prevent redundant audio announcements.
**Action:** When designing form fields, add an optional `required` prop on the `Field` wrapper that displays a red asterisk with `aria-hidden="true"` and ensure the child inputs utilize the HTML native `required` attribute. For navigation, always tag the active state with `aria-current="page"`.
