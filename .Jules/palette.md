# Palette's Journal - MoneyPrinterTurbo Studio

## 2026-04-18 - Input Field and Indicator Accessibility
**Learning:** For users with assistive technology, relying only on red visual highlighting for required fields is insufficient. Functional HTML validation attributes (like `required`) and visual stars must work together, while ensuring screen readers do not read decorative stars ("asterisk" or "star") by applying `aria-hidden="true"`. Wrapping the label text and required star in a tight nested flexbox (`flex items-center gap-1`) ensures that they stay close together regardless of the parent container's layout (such as `justify-content: space-between` or any wide spacing), improving visual reading flow and preventing disjointed label elements.

**Action:**
1. Update `Field` component wrapper to accept `required?: boolean`.
2. Wrap label text and `required` asterisk in `span className="flex items-center gap-1"`.
3. Set `aria-hidden="true"` on the asterisk.
4. Add native `required` attribute on inner inputs.
