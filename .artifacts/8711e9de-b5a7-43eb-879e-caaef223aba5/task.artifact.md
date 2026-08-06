# Task List - Password Reset & Email Integration

- `[/]` Backend Configuration
    - `[ ]` Add SMTP settings to `app/config.py`
    - `[ ]` Add SMTP variables to `render.yaml`
- `[/]` Email Service
    - `[ ]` Create `app/services/email_service.py` with SMTP logic
- `[/]` Auth Integration
    - `[ ]` Connect `forgot-password` endpoint to email service
    - `[ ]` Fix linter errors in `routers/auth.py` and `services/ai_service.py`
- `[ ]` Push & Deploy
    - `[ ]` Push to GitHub
    - `[ ]` Trigger Render build
