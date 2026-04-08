

## Problem

The report upload flow **never reads the actual PDF/image content**. It creates a fake placeholder string like `[PDF Report: blood_test.pdf] File size: 245.3KB` and sends that to the AI. The AI has no real data to analyze, so results are meaningless.

## Solution

Send the actual file bytes to the `medtwin-analyze` edge function and use the **Gemini Vision API** (already available via the Lovable AI Gateway) to extract text directly from the PDF/image. Gemini natively supports PDF and image inputs.

## Plan

### Step 1: Update the Edge Function — Add real file processing

Add a new stage `report-extract` to `medtwin-analyze/index.ts` that:
- Accepts base64-encoded file data + MIME type
- Sends the file as an `inline_data` part to Gemini via the AI Gateway's multimodal endpoint
- Gemini reads the actual PDF pages / image and extracts all text + medical data
- Returns structured JSON (conditions, metrics, notes)

This replaces the current `report-analyze` stage which only receives fake text.

### Step 2: Update ReportsPage.tsx — Send real file data

- Read the uploaded file as an ArrayBuffer using `FileReader`
- Convert to base64
- Send the base64 data + MIME type to the edge function instead of the placeholder string
- Remove the fake `extractedText` generation

### Step 3: Store real extracted text

- Save the AI-extracted text content into the `extracted_text` column so future AI calls (symptom analysis, diagnosis) have real report data in context

## Technical Details

- **Model**: `google/gemini-2.5-flash` — supports native PDF/image input via multimodal content parts
- **File size**: Already capped at 10MB client-side; Gemini supports up to 20MB inline
- **Edge function**: Will use the OpenAI-compatible API with image_url content parts (base64 data URI) which the Lovable AI Gateway supports
- **No external OCR service needed** — Gemini handles both digital and scanned PDFs natively

