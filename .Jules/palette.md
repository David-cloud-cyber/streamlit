## 2026-04-03 - [Form Field Required Indicator and Layout Constraints]
**Learning:** In design systems where field labels use `.field-label` with `justify-content: space-between` to spread out helpers/additional info, adding a required asterisk directly as a sibling of the label text can push the asterisk to the far right, separating it from the label. Wrapping the label text and the asterisk inside a nested inline flex container (`span className="flex items-center gap-1"`) ensures they stay closely coupled and visually associated.
**Action:** Always wrap label text and dynamic indicators (like required asterisks or help tooltips) in a nested flex/inline-flex wrapper when parent containers use space-between layout properties.

## 2026-04-03 - [Screen Reader Context in Custom Status Indicators and Navigation]
**Learning:** Interactive elements such as sidebar navigation buttons that visually represent the "current active view" need to explicitly communicate this state to assistive technologies. Using standard HTML attributes like `aria-current="page"` prevents screen reader users from having to guess which view is currently loaded. Furthermore, decorative icons embedded inside button text should be marked with `aria-hidden="true"` to prevent screen readers from reading redundant icon names.
**Action:** Apply `aria-current="page"` to active sidebar items and ensure nested decorative/icon-only elements are masked from screen readers.

## 2026-04-03 - [Ensuring Immediate Announcement of Dynamic Updates via Toast Notifications]
**Learning:** Dynamic toast/alert messages must be announced immediately by screen readers. When these updates occur asynchronously (e.g. auth success/error, API state changes), assigning `role="alert"` or `aria-live="assertive"` on the container guarantees that assistive technologies announce the messages immediately.
**Action:** Always include a `role="alert"` on dynamic toast, banner, or error elements.
