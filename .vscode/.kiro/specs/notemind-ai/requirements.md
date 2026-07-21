# Requirements Document

## Introduction

NoteMind AI is an intelligent web application that transforms handwritten notes into accurate, editable, searchable, and interactive digital documents. The platform combines Computer Vision, OCR, ML, NLP, and LLMs to serve students and teachers as a complete AI-powered study assistant. Core capabilities include handwritten text extraction, AI-driven content understanding, quiz and flashcard generation, RAG-based chat with notes, revision planning, collaboration, and rich export options. An Admin role manages users, storage, and analytics.

---

## Glossary

- **Platform**: The NoteMind AI web application as a whole
- **Student**: A registered user who uploads, edits, and studies personal notes
- **Teacher**: A registered user who creates classroom content and shares assignments
- **Admin**: A privileged user who manages users, storage, and system health
- **Note**: A digital document produced from an uploaded handwritten or printed image/PDF
- **OCR_Engine**: The subsystem responsible for recognising text in images and PDFs
- **Enhancer**: The AI image-preprocessing pipeline that improves image quality before OCR
- **Refiner**: The NLP post-processing pipeline that corrects OCR output text
- **Formatter**: The subsystem that converts refined text into structured document formats
- **AI_Assistant**: The RAG-based conversational AI that answers queries about a Note
- **Knowledge_Base**: The per-user vector store used by the AI_Assistant
- **Quiz_Generator**: The subsystem that produces assessment questions from a Note
- **Flashcard_Generator**: The subsystem that produces flashcard sets from a Note
- **Revision_Planner**: The subsystem that generates and tracks personalised study schedules
- **Mind_Map_Generator**: The subsystem that produces concept maps from a Note
- **Flowchart_Generator**: The subsystem that produces process diagrams from a Note
- **Formula_Recognizer**: The subsystem that detects and encodes mathematical/scientific formulas
- **Code_Recognizer**: The subsystem that detects handwritten source code in a Note
- **Translator**: The subsystem that converts Note content into a target language
- **Voice_AI**: The subsystem that handles text-to-speech and voice-input features
- **Export_Service**: The subsystem that renders Notes into downloadable file formats
- **Auth_Service**: The subsystem that manages authentication and authorisation
- **Storage_Service**: The cloud storage layer (Firebase Storage or AWS S3)
- **Search_Engine**: The subsystem that indexes and retrieves Notes
- **Collaboration_Service**: The subsystem that handles sharing, live editing, and comments
- **Analytics_Service**: The subsystem that tracks and reports user study metrics
- **Dashboard**: The UI screen that surfaces aggregated metrics to a logged-in user

---

## Requirements

---

### Requirement 1: User Authentication and Account Management

**User Story:** As a new user, I want to register and log in securely, so that my notes and study data are protected and personalised.

#### Acceptance Criteria

1. THE Auth_Service SHALL support registration with email address, display name, and password.
2. WHEN a new user registers with an email address, THE Auth_Service SHALL send an email verification link to that address before granting full access.
3. WHEN an unverified user attempts to access protected features, THE Auth_Service SHALL deny the request and prompt the user to verify their email.
4. THE Auth_Service SHALL support Google OAuth 2.0 sign-in as an alternative to email/password registration.
5. WHEN a user submits a forgot-password request with a registered email address, THE Auth_Service SHALL send a password-reset link valid for 60 minutes.
6. IF a password-reset link is used after its 60-minute expiry, THEN THE Auth_Service SHALL reject the request and inform the user that the link has expired.
7. WHEN a registered user provides correct credentials, THE Auth_Service SHALL issue a signed JWT access token with a 15-minute expiry and a refresh token with a 7-day expiry.
8. WHEN a JWT access token expires, THE Auth_Service SHALL accept the refresh token and issue a new access token without requiring the user to log in again.
9. THE Auth_Service SHALL enforce role assignment to exactly one of three roles: Student, Teacher, or Admin.
10. THE Platform SHALL allow a logged-in user to update their display name, profile photo, and password from the profile management screen.

---

### Requirement 2: Document Upload System

**User Story:** As a Student or Teacher, I want to upload handwritten notes in various formats, so that the Platform can process and digitise them.

#### Acceptance Criteria

1. THE Platform SHALL accept uploads in JPG, JPEG, PNG, and PDF file formats.
2. WHEN a user uploads a multi-page PDF, THE Platform SHALL extract and process each page individually as a separate image.
3. THE Platform SHALL support batch upload of up to 50 files in a single upload session.
4. THE Platform SHALL support drag-and-drop file selection from the user's local file system.
5. THE Platform SHALL support camera-scan capture via the device's camera API when accessed from a supported browser.
6. WHEN a user uploads a file exceeding 20 MB, THE Platform SHALL reject the file and display an error message stating the maximum allowed size.
7. WHEN a user uploads a file in an unsupported format, THE Platform SHALL reject the file and display a message listing the supported formats.
8. WHEN an upload session begins, THE Platform SHALL display a real-time progress indicator showing the percentage of bytes transferred.
9. IF a network interruption occurs during upload, THEN THE Platform SHALL resume the upload from the last successfully transferred chunk when connectivity is restored.
10. THE Platform SHALL allow users to organise uploaded documents into named folders before or after upload.

---

### Requirement 3: AI Image Enhancement

**User Story:** As a Student, I want the Platform to automatically improve the quality of my uploaded images, so that the OCR Engine produces more accurate results.

#### Acceptance Criteria

1. WHEN an image is queued for OCR, THE Enhancer SHALL automatically apply noise removal, blur reduction, and background cleaning before passing the image to the OCR_Engine.
2. THE Enhancer SHALL perform perspective correction and skew detection on each uploaded image.
3. THE Enhancer SHALL perform automatic brightness and contrast normalisation on each uploaded image.
4. THE Enhancer SHALL detect and correct page rotation to within ±1 degree of upright orientation.
5. THE Enhancer SHALL remove drop shadows and uneven lighting gradients from scanned page images.
6. WHEN enhancement is complete, THE Enhancer SHALL pass the processed image to the OCR_Engine without requiring user intervention.
7. THE Platform SHALL allow a user to view a side-by-side preview of the original and enhanced image before committing to OCR processing.

---

### Requirement 4: OCR Text Recognition

**User Story:** As a Student, I want the OCR Engine to accurately recognise handwritten and printed text from my uploaded images, so that I receive editable digital notes.

#### Acceptance Criteria

1. THE OCR_Engine SHALL recognise handwritten text, printed text, and mixed handwritten/printed documents.
2. THE OCR_Engine SHALL support recognition in English, Tamil, Hindi, and French within a single document.
3. WHEN a document contains a table structure, THE OCR_Engine SHALL preserve the table's row and column layout in the extracted text.
4. WHEN a document contains bullet-point or numbered lists, THE OCR_Engine SHALL preserve the list structure in the extracted text.
5. WHEN a document contains heading-level text (larger or bolder than body text), THE OCR_Engine SHALL annotate those spans as headings in the extracted output.
6. WHEN OCR processing is complete, THE OCR_Engine SHALL report a confidence score between 0.0 and 1.0 for the overall document.
7. WHEN the OCR_Engine confidence score for a document falls below 0.7, THE Platform SHALL notify the user and suggest re-uploading a higher-quality image.
8. THE OCR_Engine SHALL complete processing of a single A4-sized page image within 30 seconds on the production server.

---

### Requirement 5: AI Text Refinement

**User Story:** As a Student, I want the extracted text to be automatically corrected and cleaned, so that the final note is ready to use without extensive manual editing.

#### Acceptance Criteria

1. WHEN OCR output is produced, THE Refiner SHALL correct common OCR character-substitution errors (e.g., "0" for "O", "1" for "l") using contextual language modelling.
2. THE Refiner SHALL perform spell checking and apply corrections for all identified misspellings in the OCR output.
3. THE Refiner SHALL correct grammatical errors and normalise punctuation and capitalisation in the OCR output.
4. THE Refiner SHALL remove duplicate lines and stray non-printable symbols introduced by OCR noise.
5. WHEN the Refiner modifies a word or phrase, THE Platform SHALL track the original OCR token alongside the corrected token so the user can review and revert individual corrections.
6. THE Refiner SHALL preserve specialised terminology, proper nouns, and domain-specific acronyms without altering them.

---

### Requirement 6: Smart Document Formatting

**User Story:** As a Student or Teacher, I want to convert my refined note text into professionally formatted documents, so that I can use them for study or classroom distribution.

#### Acceptance Criteria

1. THE Formatter SHALL convert refined text into the following output formats: Professional Notes, Markdown, Rich Text (RTF), Microsoft Word (DOCX), and Academic Format (APA/MLA style).
2. WHEN a user selects a target format, THE Formatter SHALL generate the formatted document within 10 seconds for a single A4-sized page.
3. WHEN a document contains headings detected by the OCR_Engine, THE Formatter SHALL map those headings to the correct heading levels in the selected output format.
4. THE Formatter SHALL preserve table structures, bullet lists, and numbered lists in all supported output formats.
5. WHEN a user edits the formatted document in the Platform's inline editor, THE Platform SHALL auto-save changes at intervals not exceeding 30 seconds.

---

### Requirement 7: AI Chat with Notes (RAG-Based Assistant)

**User Story:** As a Student, I want to ask questions about my uploaded notes and receive accurate, context-grounded answers, so that I can deepen my understanding without leaving the Platform.

#### Acceptance Criteria

1. THE AI_Assistant SHALL use a Retrieval-Augmented Generation pipeline that retrieves semantically relevant passages from the user's Knowledge_Base before generating a response.
2. WHEN a user submits a question, THE AI_Assistant SHALL return a response within 15 seconds.
3. THE AI_Assistant SHALL support the following built-in prompt modes: Explain Chapter, Explain in Simple Language, Generate Examples, List Important Topics, Generate Interview Questions, List Formulas, and Compare Concepts.
4. WHEN the AI_Assistant generates a response, THE Platform SHALL display the source passages from the Note that were used to ground the answer.
5. THE Knowledge_Base SHALL be scoped per user so that one user's notes are never accessible to another user's AI_Assistant session.
6. WHEN a user adds or updates a Note, THE Platform SHALL re-index that Note in the user's Knowledge_Base within 60 seconds.
7. WHEN the AI_Assistant cannot find relevant content in the Knowledge_Base for a query, THE Platform SHALL inform the user that no relevant note content was found and suggest adding more notes.

---

### Requirement 8: AI Summary Generation

**User Story:** As a Student, I want to generate different types of summaries from my notes, so that I can quickly review key content.

#### Acceptance Criteria

1. THE AI_Assistant SHALL generate summaries in the following modes: 50-word summary, 100-word summary, Detailed summary, Bullet-point summary, and Revision summary.
2. WHEN a user requests a summary, THE AI_Assistant SHALL produce the selected summary type within 15 seconds for a note up to 5,000 words.
3. WHEN a Bullet-point summary is requested, THE AI_Assistant SHALL return a structured list where each bullet represents a distinct key idea.
4. WHEN a Revision summary is requested, THE AI_Assistant SHALL highlight the most examination-relevant concepts from the note.

---

### Requirement 9: AI Notes Simplifier

**User Story:** As a Student, I want to simplify complex notes into easier language levels, so that I can understand difficult concepts progressively.

#### Acceptance Criteria

1. THE AI_Assistant SHALL simplify a Note's text at three target reading levels: Engineering Level (technical terminology preserved), School Level (accessible to secondary-school students), and Child Friendly (accessible to primary-school students).
2. WHEN a user selects a target reading level, THE AI_Assistant SHALL return the simplified version within 15 seconds for a note up to 5,000 words.
3. THE AI_Assistant SHALL preserve factual accuracy when simplifying note content.
4. WHEN simplification is complete, THE Platform SHALL display the original and simplified texts side-by-side for comparison.

---

### Requirement 10: AI Quiz Generator

**User Story:** As a Student or Teacher, I want to automatically generate quizzes from note content, so that I can assess understanding efficiently.

#### Acceptance Criteria

1. THE Quiz_Generator SHALL produce questions in the following types: Multiple Choice (MCQ), Fill in the Blank, True/False, One-Word Answer, Matching, Descriptive, Viva Voce, and Placement-style questions.
2. THE Quiz_Generator SHALL support three difficulty levels: Easy, Medium, and Hard.
3. WHEN a user requests a quiz, THE Quiz_Generator SHALL generate a minimum of 5 and a maximum of 50 questions per request, based on the user's selection.
4. WHEN a quiz is generated, THE Quiz_Generator SHALL include the correct answer and a brief explanation for each question.
5. WHEN a Student submits quiz answers, THE Analytics_Service SHALL record the score, the timestamp, and the source Note identifier.
6. IF the Quiz_Generator cannot derive sufficient question content from a Note, THEN THE Platform SHALL inform the user that the note does not contain enough content to generate the requested number of questions.

---

### Requirement 11: Flashcard Generator

**User Story:** As a Student, I want to create flashcard sets from my notes, so that I can practise active recall.

#### Acceptance Criteria

1. THE Flashcard_Generator SHALL produce flashcard sets in the following types: Standard Flashcards (term/definition), Definition Cards, and Formula Cards.
2. WHEN a user requests a flashcard set, THE Flashcard_Generator SHALL generate between 5 and 100 cards per request.
3. THE Platform SHALL allow a user to edit, delete, or add cards within a generated flashcard set.
4. WHEN a Student marks a flashcard as "known", THE Analytics_Service SHALL record that event against the card identifier and the session timestamp.
5. THE Flashcard_Generator SHALL extract formula content and render it in LaTeX notation on Formula Cards.

---

### Requirement 12: AI Revision Planner

**User Story:** As a Student, I want a personalised revision schedule based on my notes and exam dates, so that I can study systematically.

#### Acceptance Criteria

1. THE Revision_Planner SHALL generate a daily or weekly study schedule based on the Student's uploaded subjects, chapter list, and a user-supplied exam date.
2. WHEN a Student provides an exam date, THE Revision_Planner SHALL distribute revision sessions across the available days, allocating more time to topics identified as weak by the Analytics_Service.
3. THE Platform SHALL send revision reminder notifications to the user at the scheduled session start time via in-app notification.
4. WHEN a Student marks a revision session as completed, THE Revision_Planner SHALL update the remaining schedule to reflect the completed session.
5. THE Revision_Planner SHALL allow the Student to adjust the daily study-hours budget and regenerate the schedule accordingly.

---

### Requirement 13: AI Study Analytics

**User Story:** As a Student, I want to view detailed analytics of my study activity, so that I can identify weak areas and track progress.

#### Acceptance Criteria

1. THE Analytics_Service SHALL track and store the following metrics per Student: total reading time per note, quiz scores per attempt, flashcard recall accuracy per card, and pages uploaded per session.
2. THE Dashboard SHALL display the following aggregate metrics: total notes, overall OCR accuracy, total AI queries, cumulative study hours, total pages uploaded, weekly progress chart, subjects covered, and quiz performance trend.
3. WHEN the Analytics_Service identifies a topic where the Student's quiz score is below 60% across three or more attempts, THE Platform SHALL label that topic as a weak topic and surface it on the Dashboard.
4. THE Analytics_Service SHALL generate a weekly progress report summarising the Student's activity for the prior 7 days and make it accessible from the Dashboard.

---

### Requirement 14: AI Keyword and Concept Extraction

**User Story:** As a Student, I want the Platform to automatically identify keywords, definitions, and formulas from my notes, so that I can focus on the most important content.

#### Acceptance Criteria

1. THE AI_Assistant SHALL extract and list the top keywords from a Note, ranked by relevance score.
2. THE AI_Assistant SHALL identify and extract definition pairs (term → definition) present in a Note.
3. THE Formula_Recognizer SHALL detect mathematical, physics, and chemistry formulas in a Note and represent each formula in LaTeX notation.
4. WHEN keyword extraction is complete, THE Platform SHALL display the keywords as a tag cloud or structured list on the Note's detail page.

---

### Requirement 15: AI Mind Map Generator

**User Story:** As a Student, I want to generate mind maps and knowledge graphs from my notes, so that I can visualise concept relationships.

#### Acceptance Criteria

1. THE Mind_Map_Generator SHALL produce a hierarchical concept map from a Note, with the central topic as the root node and sub-topics as child nodes.
2. WHEN a mind map is generated, THE Platform SHALL render it as an interactive, pan-and-zoom diagram in the browser.
3. THE Mind_Map_Generator SHALL identify and label the relationships between sibling nodes based on the note content.
4. THE Platform SHALL allow a user to export the generated mind map as a PNG or SVG image.

---

### Requirement 16: AI Flowchart Generator

**User Story:** As a Student or Teacher, I want to convert note content describing processes or algorithms into flowcharts, so that I can visualise step-by-step logic.

#### Acceptance Criteria

1. THE Flowchart_Generator SHALL produce a flowchart from note text that describes a sequential process, algorithm, or workflow.
2. WHEN a flowchart is generated, THE Platform SHALL render it as an interactive diagram with standard flowchart notation (start/end, process, decision, input/output nodes).
3. THE Platform SHALL allow a user to export the generated flowchart as a PNG or SVG image.
4. IF the note content does not describe a discernible sequential process, THEN THE Platform SHALL inform the user that a flowchart could not be generated and suggest rephrasing the relevant content.

---

### Requirement 17: AI Formula and Code Recognition

**User Story:** As a Student studying STEM or Computer Science, I want handwritten formulas and code snippets to be correctly identified and rendered, so that I can use them in my digital notes.

#### Acceptance Criteria

1. THE Formula_Recognizer SHALL detect inline and block-level mathematical, physics, and chemistry formulas in uploaded images and convert each to valid LaTeX notation.
2. WHEN a LaTeX formula is produced, THE Platform SHALL render it visually using a LaTeX rendering library in the note editor.
3. THE Code_Recognizer SHALL detect handwritten source code in Python, Java, C, C++, and SQL from uploaded images.
4. WHEN handwritten code is detected, THE Code_Recognizer SHALL produce plain-text source code with syntax highlighting applied in the note editor.
5. THE Code_Recognizer SHALL preserve indentation structure when extracting handwritten code.

---

### Requirement 18: AI Translation

**User Story:** As a multilingual Student, I want to translate my notes into another language, so that I can study in my preferred language.

#### Acceptance Criteria

1. THE Translator SHALL support translation of Note content between English and the following target languages: Tamil, Hindi, French, German, and Japanese.
2. WHEN a user requests translation, THE Translator SHALL return the translated text within 20 seconds for a note up to 5,000 words.
3. THE Translator SHALL preserve heading structure, bullet lists, and table layouts in the translated output.
4. WHEN translation is complete, THE Platform SHALL display the original and translated texts side-by-side.
5. THE Translator SHALL preserve LaTeX formula notation without altering the formula content during translation.

---

### Requirement 19: Voice AI Features

**User Story:** As a Student, I want to interact with my notes using voice commands and text-to-speech, so that I can study hands-free.

#### Acceptance Criteria

1. THE Voice_AI SHALL read Note content aloud using text-to-speech synthesis when a user activates the Read Aloud function.
2. THE Voice_AI SHALL accept voice commands to navigate between notes, start and stop playback, and trigger AI_Assistant queries.
3. WHEN a user issues a voice search command, THE Voice_AI SHALL convert the spoken query to text and pass it to the Search_Engine.
4. WHEN a user activates the voice chatbot mode, THE Voice_AI SHALL convert spoken questions to text, send them to the AI_Assistant, and read the response aloud.
5. THE Voice_AI SHALL support English voice input and output as the baseline language.

---

### Requirement 20: Knowledge Management and Smart Search

**User Story:** As a Student or Teacher, I want to organise my notes hierarchically and search across all my content, so that I can find and manage information quickly.

#### Acceptance Criteria

1. THE Platform SHALL allow a user to organise Notes into a hierarchy of: Semester → Subject → Unit → Chapter → Folder.
2. THE Platform SHALL support tagging Notes with user-defined labels and marking Notes as Favourites.
3. THE Search_Engine SHALL support the following search modes: keyword search, semantic (meaning-based) search, AI-powered natural-language search, voice search, date-range filter, and subject filter.
4. WHEN a keyword search query is submitted, THE Search_Engine SHALL return results within 3 seconds.
5. WHEN a semantic search query is submitted, THE Search_Engine SHALL return the top 10 most semantically relevant Notes ranked by similarity score.
6. THE Search_Engine SHALL index newly created or updated Notes within 60 seconds of the change being saved.

---

### Requirement 21: Collaboration Features

**User Story:** As a Teacher or Student, I want to share notes and collaborate in real time, so that group study sessions and classroom distribution are efficient.

#### Acceptance Criteria

1. THE Collaboration_Service SHALL allow a Note owner to share a Note with other registered users by email address, granting either view-only or edit access.
2. THE Collaboration_Service SHALL support real-time collaborative editing where multiple users can edit the same Note simultaneously, with changes propagating to all active editors within 2 seconds.
3. THE Collaboration_Service SHALL maintain a version history for each Note, storing every saved revision with the author's identity and a timestamp.
4. WHEN a user restores a prior version, THE Collaboration_Service SHALL replace the current Note content with the selected revision and record the restore action in the version history.
5. THE Collaboration_Service SHALL allow users to add, edit, and delete inline comments on a Note.
6. WHEN a comment is added to a shared Note, THE Platform SHALL notify all users with edit or view access to that Note via in-app notification.

---

### Requirement 22: Export and Download

**User Story:** As a Student or Teacher, I want to export my notes in multiple file formats, so that I can use them in other applications.

#### Acceptance Criteria

1. THE Export_Service SHALL support exporting a Note in the following formats: PDF, DOCX, TXT, HTML, Markdown (.md), and PowerPoint (.pptx).
2. WHEN a user requests an export, THE Export_Service SHALL generate and make the file available for download within 30 seconds for a note up to 10,000 words.
3. THE Export_Service SHALL preserve all formatting, headings, tables, bullet lists, and embedded LaTeX formulas in the exported file.
4. THE Export_Service SHALL apply syntax highlighting to code blocks in PDF and HTML exports.

---

### Requirement 23: Storage, Security, and Auto-Save

**User Story:** As a user, I want my notes to be securely stored and automatically backed up, so that I never lose my work.

#### Acceptance Criteria

1. THE Storage_Service SHALL encrypt all stored Note files using AES-256 encryption at rest.
2. THE Platform SHALL perform an automatic cloud backup of each Note to the Storage_Service at intervals not exceeding 5 minutes while a Note is open.
3. THE Platform SHALL auto-save in-editor changes at intervals not exceeding 30 seconds without requiring user action.
4. THE Platform SHALL maintain a minimum of 30 days of version history for each Note.
5. WHEN a duplicate upload is detected (same file content hash as an existing Note in the user's account), THE Platform SHALL notify the user and offer to merge or skip the duplicate.

---

### Requirement 24: Admin Dashboard and Management

**User Story:** As an Admin, I want tools to manage users, storage, and system performance, so that I can ensure the Platform operates reliably.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following system-level metrics to the Admin: total registered users, active users in the last 30 days, total storage consumed, average OCR accuracy across all processed documents, and total AI queries processed.
2. THE Platform SHALL allow the Admin to suspend or reactivate any user account.
3. THE Platform SHALL allow the Admin to set a per-user storage quota and notify the user when usage reaches 80% of the quota.
4. WHEN a user's storage usage reaches 100% of their quota, THE Storage_Service SHALL reject new uploads for that user and notify both the user and the Admin.
5. THE Platform SHALL provide the Admin with an OCR performance report listing documents with confidence scores below 0.7, grouped by upload date.

---

### Requirement 25: Teacher-Specific Features

**User Story:** As a Teacher, I want to generate and distribute assignments and question papers from my classroom notes, so that I can manage assessments efficiently.

#### Acceptance Criteria

1. THE Quiz_Generator SHALL allow a Teacher to generate a structured question paper containing a specified mix of question types and difficulty levels from one or more Notes.
2. WHEN a Teacher exports a question paper, THE Export_Service SHALL format it with question numbers, marks allocation, and an answer key as a separate section.
3. THE Collaboration_Service SHALL allow a Teacher to share a Note or question paper with a group of Student accounts in a single operation.
4. THE Platform SHALL allow a Teacher to set an expiry date on a shared Note, after which Student access is automatically revoked.

---

### Requirement 26: Offline OCR Mode

**User Story:** As a Student in a low-connectivity environment, I want basic OCR processing to work offline, so that I can digitise notes without an internet connection.

#### Acceptance Criteria

1. WHERE the Offline OCR Mode feature is enabled, THE OCR_Engine SHALL process single-page images locally on the user's device using a downloaded on-device model.
2. WHERE the Offline OCR Mode feature is enabled, THE Platform SHALL queue AI-dependent features (AI_Assistant, Quiz_Generator, Translation) and execute them when connectivity is restored.
3. WHEN the device reconnects to the internet, THE Platform SHALL automatically synchronise locally processed Notes with the cloud Storage_Service.

---

### Requirement 27: Bonus — AI Diagram Generator

**User Story:** As a Student, I want the Platform to generate educational diagrams from text descriptions in my notes, so that I can visualise complex concepts.

#### Acceptance Criteria

1. THE Platform SHALL accept a natural-language text description from a Note and pass it to an AI diagram generation model.
2. WHEN a diagram is generated, THE Platform SHALL render it as an inline image in the note editor.
3. WHEN a diagram is generated, THE Platform SHALL allow the user to export the diagram as a PNG file.

---

### Requirement 28: Bonus — AI Exam Predictor and Personalised Recommendations

**User Story:** As a Student, I want the Platform to predict likely exam topics and recommend study actions, so that I can prepare strategically.

#### Acceptance Criteria

1. THE AI_Assistant SHALL analyse a Student's Notes and historical quiz performance to identify the topics most likely to appear in an exam, based on concept frequency and the Student's weak-topic profile.
2. THE Platform SHALL surface personalised study recommendations on the Dashboard, updated at least once per day.
3. WHEN a Student's quiz performance on a topic improves above 80% across three consecutive attempts, THE Analytics_Service SHALL remove that topic from the weak-topic list.

---
