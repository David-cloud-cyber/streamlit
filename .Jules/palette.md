## 2025-05-18 - Navigation view indicator and decorative icons accessibility
**Learning:** Active sidebar navigation buttons should use `aria-current="page"` to signal the active view to assistive technologies, and nested icons within buttons or section title containers should have `aria-hidden="true"` to prevent redundant audio announcements.
**Action:** Always add `aria-current="page"` to active navigation links/buttons and wrap decorative icons in `aria-hidden="true"`.
