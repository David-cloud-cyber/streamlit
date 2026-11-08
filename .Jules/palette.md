## 2026-04-03 - Accessible Sidebar Navigation and Status Indicators
**Learning:** In icon-and-text sidebar navigation items and status indicators, screen readers often announce duplicate or ambiguous labels when icons lack aria-hidden and active items lack aria-current="page". Status dots need role="status" and aria-label to convey status changes clearly.
**Action:** Always provide aria-label on <nav>, aria-current="page" on the active route/view button, aria-hidden="true" on nested decorative icons, and role="status" with title and aria-label on connection/status indicators.
