# Implementation Plan - Big Question Bank Redesign (V2)

The goal is to redesign the "Big Question Bank" section into a professional, two-column responsive interface as per the provided requirements. This involves moving from a single-column accordion-style layout to a more sophisticated dashboard-style layout.

## User Review Required

> [!IMPORTANT]
> **Layout Change**: On desktop and laptops, the screen will be split into two columns: the question list on the left and the detailed answer preview on the right.
> **Mobile Experience**: On mobile devices, the answer preview will open as a full-screen overlay (drawer/modal) to ensure readability.
> **Persistence**: Question states (loading, generated answers) remain independent. Selecting a new question for preview will not trigger an API call if the answer was already generated.

## Proposed Changes

### Frontend (Next.js/Tailwind)

#### [MODIFY] [BigQuestionsPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/flashcards/big-questions/page.tsx)
- **Grid Layout**: Implement a responsive grid: `grid-cols-1 lg:grid-cols-12`.
    - Left Column (Questions): `lg:col-span-5` or `lg:col-span-6`.
    - Right Column (Preview): `lg:col-span-7` or `lg:col-span-6`.
- **Question Cards**:
    - Display Mark value prominently.
    - Show the Question text.
    - Display the "Proposed Answer Structure" in a condensed list.
    - Buttons: "Preview Full Answer" and "Download PDF".
- **Full Answer Preview Panel**:
    - Sticky/Fixed-height panel on desktop.
    - Renders the selected question's full details.
    - Includes "Regenerate Answer" and "Download PDF" buttons.
    - Uses `ReactMarkdown` for academic-style formatting.
- **Mobile responsiveness**:
    - Ensure the sidebar toggle (already in project) works with the new layout.
    - Implement a slide-over/modal for the Full Answer on mobile.

## Verification Plan

### Manual Verification
1.  **Responsive Check**:
    - Desktop: Verify two-column layout.
    - Tablet: Verify stacking behavior.
    - Mobile: Verify full-width preview modal.
2.  **Functionality Check**:
    - Generate 10 questions.
    - Click "Preview" on Q1, then Q2. Ensure answers are independent.
    - Click "Regenerate" on Q1. Verify only Q1's answer changes.
3.  **PDF Check**:
    - Download a PDF and verify the formatting matches the "Exam Study Guide" style.
