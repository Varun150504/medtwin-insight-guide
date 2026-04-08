

## Summary

Three improvements: (1) enhance AI follow-up questions to cross-reference past medical records, (2) add PDF download for clinical reports, (3) replace non-functional SOS call/map features with working alternatives.

## Changes

### 1. AI questions that reference past medical records

**Edge Function** (`medtwin-analyze/index.ts`): Update the `questions` stage system prompt to explicitly instruct the AI to:
- Cross-reference current symptoms against the patient's uploaded medical reports and past session history
- Ask questions like "Your last blood test showed elevated sugar — have you been managing that?"
- Probe whether current symptoms might be connected to known chronic conditions or past diagnoses
- Include a directive: "If the patient has medical reports or past conditions, at least ONE question MUST reference them"

**User prompt**: Already passes `fullContext` which includes report data and history. No structural change needed — just stronger prompt instructions.

### 2. Downloadable clinical report (PDF)

**DiagnosisResult.tsx**: After the clinical report is generated and displayed in the modal, add a "Download PDF" button that:
- Uses the browser's built-in `window.print()` approach OR generates a clean HTML string and opens it in a new window for printing/saving as PDF
- The simplest reliable approach: create a styled HTML document string from the report data, open in a new window, and call `window.print()` — this gives the user a native Save as PDF option
- No external library needed

### 3. Fix Emergency / SOS / Map features

The current issues:
- `tel:911` links don't work in web browsers (only on mobile devices with a phone app)
- Google Maps "hospitals near me" opens externally which may be blocked by popup blockers
- SOS is purely simulated with a toast

**Replacements:**
- **Emergency numbers**: Replace `tel:` links with a "Copy number" button (copies to clipboard) since web apps can't make phone calls. Keep `tel:` as a fallback link for mobile.
- **SOS button**: Replace the simple toast with a detailed in-page alert card showing: timestamp, location (if available), list of contacts that "would be notified", and the user's latest diagnosis/risk level. Add a "Share via WhatsApp" button that opens `https://wa.me/?text=...` with a pre-filled emergency message including location — this actually works across all devices.
- **Nearby hospitals**: Embed a Google Maps iframe (`https://www.google.com/maps/embed/v1/search?q=hospitals+near+me&key=...`) directly in the page instead of opening a new tab. Since we don't have a Maps API key, use a direct link button that's styled more prominently, plus show a static list of emergency instructions (what to tell the dispatcher, what to bring).
- **DiagnosisResult hospitals**: Same approach — replace `window.open` with a prominent "Open Google Maps" link styled as a proper anchor tag (not blocked by popup blockers).

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/medtwin-analyze/index.ts` | Strengthen questions prompt to reference medical records |
| `src/components/DiagnosisResult.tsx` | Add PDF download button, fix hospital map link, fix emergency call |
| `src/pages/EmergencyPage.tsx` | Add WhatsApp SOS sharing, copy-to-clipboard for numbers, better SOS feedback UI |

