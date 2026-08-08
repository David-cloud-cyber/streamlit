## 2025-08-08 - Cohesion of Form Labels and Required Indicators in Flex-based Spaced Layouts

**Learning:**
The application's `.field-label` style implements a flex layout with `justify-content: space-between`. Adding a required asterisk `*` directly as a sibling of the label text inside the `.field-label` container causes it to be pushed to the far right, which breaks visual association and results in poor UX.

**Action:**
To maintain proximity and semantic cohesion, wrap the label text and the required indicator inside a nested flex container (e.g., `<span className="flex items-center gap-1">`) inside the label container. This overrides the space-between property and keeps the visual indicator directly adjacent to the label text.
