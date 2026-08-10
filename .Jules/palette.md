## 2025-08-10 - Field required pattern integration
**Learning:** In a UI utilizing CSS flexbox styles (e.g., .field-label using space-between), directly appending dynamic text/icons (such as a required asterisk "*") to the label container can break alignment. Wrapping the label text and visual asterisks within a nested inline-flex or flex container (such as a nested span with flex/gap styles) keeps them grouped naturally together.
**Action:** Always nest label content and secondary decorations/indicators inside a secondary helper wrapper to preserve proximity across flexible parents.
