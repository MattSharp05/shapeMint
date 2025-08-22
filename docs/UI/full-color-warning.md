# Full Color (MJF) UI Blocking - Implementation Note

Purpose
-------
Document the required UI change to inform and block users when they select "Full Color Nylon 12 (MJF)" for a model that does not include texture/color (i.e., is not printable in full color). This is a developer-facing note describing UX copy, placement, handling of the server error `material_not_printable`, and acceptance criteria.

Where to implement
-------------------
- Primary (blocking): `frontend/src/pages/Order.tsx` — handle server error `material_not_printable` and present a blocking modal to the user when a quote attempt returns that error. (Note: server already returns this error code.)
- Optional (better UX): `frontend/src/components/Order/MaterialSelection.tsx` — perform a lightweight pre-check when the user selects Full Color and show an inline banner if unavailable.

Server contract
---------------
- Server returns HTTP 400 with JSON when full color is not supported:
  - { error: "material_not_printable", message: string, details?: { modelId, materialId, reason } }

UX behavior (hard block)
------------------------
1. User selects Full Color (MJF) material and completes shipping info.
2. User clicks "Get Quote".
3. If server returns `material_not_printable`, show a blocking modal with the following contents and prevent proceeding to checkout.

Modal copy (recommended)
- Title: "Full Color unavailable for this model"
- Body: "Shapeways requires color/texture data for Full Color Nylon (MJF). This model does not include the needed color/texture information, so Full Color is not available for this design. Choose a single-color nylon material or upload a textured model."
- Primary CTA: "Choose different material" (navigate back/expand `MaterialSelection`)
- Secondary CTA: "Cancel" (close modal)

Inline banner (optional pre-check in MaterialSelection)
- Text: "Full Color unavailable: model lacks texture/color data. Choose a different material or upload a textured model."

Developer notes
---------------
- Hook into `getQuote` error handling in `frontend/src/services/shapeways.ts` to surface `data.error` and `data.message` to the caller.
- `Order.tsx` should detect `e.code === 'material_not_printable'` and show the modal.
- Add server-side logging evt `full_color_not_printable` (already present) to track frequency.
- Consider adding an optional DB audit column or table to record blocked quote attempts (reason code) for analytics.

Acceptance criteria
-------------------
- Attempting to Get Quote with Full Color on a non-textured model shows the blocking modal and no quote is created.
- The modal CTA returns the user to material selection and does not allow checkout until a supported material is chosen.
- Developer can reproduce behavior by using a known non-textured model and selecting Full Color.

Testing
-------
- Unit test (edge function): mock model info without color support → server returns 400.
- Frontend test: mock `getQuote` to throw error with `code: 'material_not_printable'` and assert modal appears and Next/Checkout is blocked.

Follow-ups
----------
- Implement the modal component and hook it to `Order.tsx` (if not already present).
- Optionally add the pre-check in `MaterialSelection.tsx` to improve UX.
- Optionally add analytics/audit storage for blocked attempts.

Created: automated developer note (repo)
