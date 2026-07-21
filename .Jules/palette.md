# Palette's Journal - Critical UX/accessibility learnings

## 2026-04-03 - Nested Flex Containers for Required Form Asterisks
**Learning:** When form fields use custom layout classes (e.g. `.field-label` with `justify-content: space-between`), placing a required asterisk inside the label can cause it to float far away from the label text. Wrapping the text and the asterisk inside a nested flex container (`span className="flex items-center gap-1"`) ensures they remain tightly grouped regardless of parent layout alignments.
**Action:** Always wrap label text and dynamic asterisks inside a small inner container when aligning elements in a space-between flex layout.

## 2026-04-03 - Screen Reader Announcements and Decorative Elements
**Learning:** Screen readers require explicit ARIA attributes like `aria-current="page"` to indicate active elements within navigation bars. Additionally, decorative icons inside buttons and dynamic status components should use `aria-hidden="true"` or detailed screen-reader-specific labels (`aria-label` and `title` attributes) to avoid audio clutter or clarify connection statuses.
**Action:** Enhance all sidebar items, icons, connection indicators, and toast alerts with appropriate ARIA roles, labels, and states.
