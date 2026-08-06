# Implementation Plan - Mermaid Diagram Stability Fix

The goal is to resolve the "Syntax error" in Mermaid diagrams and ensure the AI generates 100% valid diagram code.

## User Review Required

> [!IMPORTANT]
> **Robust Rendering**: I am switching the diagram engine to use a modern rendering method that handles errors gracefully. Instead of a red box, if a diagram fails, it will show a "Try again" button and the raw text so you can still read the explanation.
> **Prompt Tuning**: I am updating the AI's internal "Brain" to be extremely strict. It will be instructed to ONLY produce valid Mermaid syntax without any conversational filler inside the code blocks.

## Proposed Changes

### 1. Frontend: Robust Diagram Component
- **[MODIFY] [Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Use `mermaid.render` API for reliable SVG generation.
    - Add error handling to prevent the whole page from showing "Syntax Error".
    - Auto-clean the input string (remove common AI mistakes like "Diagram:" or "Here is the code:").

### 2. Backend: Strict Syntax Enforcement
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - **Prompt Update**: "When generating diagrams, start exactly with the diagram type (e.g., 'graph TD'). Do NOT add titles or labels inside the code block."
    - **Python Fix**: Resolve the `any` reference issue and optimize the hybrid search logic.

---

## Verification Plan

### Manual Verification
- **Stress Test**: Ask the AI for a "Complex Flowchart of a Banking System." Verify it renders without syntax errors.
- **Auto-Correction Test**: If the AI makes a small mistake, the new `Mermaid.tsx` should attempt to strip invalid lines before rendering.
- **Theme Test**: Ensure diagrams look good in both Dark and Light modes.

**I am applying these stability fixes now. No action needed on your part until the final deploy.**
