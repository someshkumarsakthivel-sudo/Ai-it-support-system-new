# AI IT Support System

An AI-powered IT support ticket management system designed to help employees raise IT issues, support engineers resolve assigned tickets, and administrators monitor support operations from one platform.

## Key Features

### AI Ticket Analysis
- Automatically analyzes IT support tickets using Google Gemini.
- Generates category and subcategory.
- Suggests ticket priority.
- Detects ticket sentiment.
- Generates a short problem summary.
- Provides troubleshooting recommendations.
- Generates an AI confidence score.
- Uses relevant Knowledge Base articles as supporting context.
- Validates AI output before saving it.

### Knowledge Base
- Administrators can create and manage troubleshooting articles.
- Articles can be published or unpublished.
- Articles can be associated with support categories.
- AI searches relevant published articles before analysis.
- Unrelated articles are filtered out using relevance scoring.

### Ticket Management
- Employees can create and track support tickets.
- Engineers can manage tickets assigned to them.
- Administrators can manage and assign tickets.
- Supports ticket status workflow such as Open, Assigned, In Progress, Pending, Resolved, and Closed.
- Supports ticket priority levels: Low, Medium, High, and Critical.

### SLA Management
- Automatic response and resolution deadlines.
- SLA status tracking.
- Detection of met and breached SLA deadlines.
- SLA information displayed on ticket details and administrator dashboard.

### Notifications
- New ticket notifications.
- Ticket assignment notifications.
- Ticket status change notifications.
- Mark individual notifications as read.
- Mark all notifications as read.

### File Attachments
Supported file types:
- PDF
- PNG
- JPG/JPEG
- TXT
- CSV
- DOCX

Security controls:
- File extension validation.
- Maximum file size of 10 MB.
- Unique server-side filenames.
- Ticket-level access control for upload and download.

### Role-Based Access Control
The system provides three roles:

**Employee**
- Create tickets.
- View own tickets.
- Access attachments for own tickets.

**Support Engineer**
- View assigned tickets.
- Update assigned tickets.
- Analyze assigned tickets.

**Administrator**
- Manage users.
- Assign tickets.
- Manage Knowledge Base articles.
- View system-wide tickets.
- View support analytics.

### Admin Dashboard
The administrator dashboard provides:
- Total ticket count.
- Ticket status statistics.
- Priority statistics.
- Unassigned ticket count.
- Active users and engineers.
- SLA performance.
- Recent tickets.
- Support operational overview.

## Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- JWT Authentication
- Argon2id Password Hashing

**AI**
- Google Gemini API

**Testing**
- Pytest

## AI Workflow

```text
Create Ticket
     ↓
Search Knowledge Base
     ↓
Find Relevant Articles
     ↓
Gemini AI Analysis
     ↓
Validate AI Response
     ↓
Save Analysis
     ↓
Display Result