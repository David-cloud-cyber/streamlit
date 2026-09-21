# Palette's Journal

## 2025-05-18 - Navigation view indicator and dynamic toast accessibility
**Learning:** In custom tab/sidebar navigation with SVG icons, using `aria-current="page"` on active view buttons and `aria-hidden="true"` on decorative icons ensures clear screen reader announcements without redundant icon text.
**Action:** Always pair `aria-current="page"` with `data-active` attributes on view selectors and add `role="alert"` with `aria-live="polite"` to toast banners.
