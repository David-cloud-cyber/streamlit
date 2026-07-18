# Palette's Journal - MoneyPrinterTurbo Studio

## 2025-02-23 - Enhanced Form Input and Sidebar Accessibility
**Learning:** For users navigating complex SaaS applications using keyboard and screen readers, missing `aria-current` on navigation links, decorative icons announced unnecessarily, and missing visual indicators for required fields with accurate helper markup can cause navigation fatigue and errors.
**Action:** Always map sidebar navigation state with `aria-current="page"`, hide decorative icons using `aria-hidden="true"`, and use nested flex containers for field labels with required indicators to keep elements visually coherent and screen-reader friendly.
