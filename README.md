# TalentArch AI

TalentArch AI is a recruitment support system developed as a Final Year Project. It helps recruiters manage job postings, extract structured candidate information from resumes, analyse candidate-job suitability, rediscover existing candidates, and export job-specific reports.

The application uses AI to assist—not replace—recruitment decisions. Final hiring decisions should always include human review.

## Main Features

- Recruiter authentication through Supabase Auth
- Job creation with configurable matching priorities
- PDF and DOCX resume upload and text extraction
- Structured candidate-profile extraction through OpenRouter
- Asynchronous job-specific candidate analysis
- Separate AI processing and recruitment statuses
- Job-specific ranking, statistics, and top-candidate summaries
- Manual retry for failed analyses
- Deterministic candidate rediscovery from the recruiter's existing talent pool
- Candidate database search and candidate details
- Job-specific Excel report export
- Recruiter profile management and account deactivation
- Cross-page analysis progress and completion notifications

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Python, Flask, Gunicorn |
| Database, authentication, and storage | Supabase |
| AI integration | OpenRouter API |
| Resume extraction | PDFPlumber, python-docx |
| Excel export | openpyxl |
| Deployment | Vercel (frontend), Render (backend and worker) |

## System Workflow

1. A recruiter creates a job posting and optionally customizes its matching priorities.
2. The recruiter uploads up to 10 PDF or DOCX resumes per request.
3. The Flask API validates the files, extracts their text, asks OpenRouter for structured candidate data, and stores the latest resume and candidate profile.
4. A `match_results` row is created or reset with an AI processing status of `pending`.
5. The upload request returns after candidate extraction and persistence complete.
6. The background worker claims pending analyses one at a time, changes their status to `processing`, and evaluates the anonymized candidate profile against the job.
7. Flask calculates the final weighted score and persists the result as `completed`. Failures are saved as `failed` with a safe error message.
8. The frontend polls while active analyses exist and updates the candidate table, statistics, rankings, and notifications.

Resume text extraction and candidate-profile extraction are synchronous. Job-specific AI matching is asynchronous and requires the worker process to be running.

## Matching Model

OpenRouter returns independent component scores for:

- Hard skills
- Work experience
- Education
- Soft skills

The AI does **not** calculate the final match score. Flask calculates it using the job's stored priorities:

```text
match score = sum(applicable component score × job weight)
              / sum(applicable job weight)
```

The default weights are:

| Criterion | Default weight |
| --- | ---: |
| Hard skills | 45% |
| Work experience | 30% |
| Education | 15% |
| Soft skills | 10% |

Weights must be whole percentages from 0 to 100 and total exactly 100%. A zero weight intentionally excludes that criterion. A `null` component score means the job does not make the criterion applicable; a score of `0` means it applies but the candidate provides no supporting evidence.

Candidate rediscovery is separate from AI matching. It uses a deterministic preliminary relevance heuristic, does not call OpenRouter, and never stores preliminary relevance as the final `match_score`.

## Project Structure

```text
TalentArchAI/
├── backend/
│   ├── migrations/       # Incremental Supabase SQL migrations
│   ├── models/           # Pydantic request/response models
│   ├── prompts/          # Candidate extraction and job analysis prompts
│   ├── routes/           # Flask API blueprints
│   ├── services/         # Business logic and external integrations
│   ├── tests/            # Backend unit tests
│   ├── utils/            # Authentication and shared utilities
│   ├── app.py            # Flask application entry point
│   └── worker.py         # Sequential background analysis worker
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/   # Application views and reusable UI components
│   │   ├── context/      # Authentication context
│   │   ├── hooks/        # Analysis and rediscovery workflows
│   │   ├── services/     # Frontend API and Supabase clients
│   │   └── utils/        # Ranking, guidance, and matching helpers
│   └── vercel.json       # SPA route rewrite configuration
└── docs/                 # Project documentation assets
```

## Prerequisites

- Node.js 20 or later
- npm
- Python 3.11 or later
- A Supabase project
- An OpenRouter API key

## Supabase Setup

The SQL files in `backend/migrations` are incremental migrations. They assume the project's base tables (`recruiters`, `job_postings`, `candidates`, and `match_results`) and their Row Level Security policies already exist.

Create a private Supabase Storage bucket named `resumes`, then apply the migrations in this exact order using the Supabase SQL Editor:

1. `backend/migrations/001_resume_upload_module.sql`
2. `backend/migrations/002_analysis_queue_foundation.sql`
3. `backend/migrations/003_candidate_delete_cascade.sql`
4. `backend/migrations/004_job_matching_priorities.sql`

Review each migration before running it and apply it to a development project first. Migration 002 installs the PostgreSQL-backed queue functions, constraints, and pending-task index. Migration 004 adds the job-specific matching-priority columns and constraints.

## Environment Variables

Never commit populated `.env` files. Copy the provided templates and fill in the values locally.

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `VITE_API_BASE_URL` | Flask API base URL, including `/api` |

The frontend must never receive the Supabase secret/service-role key or the OpenRouter API key.

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Key used for authenticated, RLS-aware requests |
| `SUPABASE_SECRET_KEY` | Backend-only privileged key for approved storage and queue operations |
| `SUPABASE_JWT_ISSUER` | Expected Supabase access-token issuer |
| `SUPABASE_JWT_ALGORITHMS` | Accepted JWT signing algorithms |
| `OPENROUTER_API_KEY` | Backend-only OpenRouter API key |
| `OPENROUTER_MODEL` | Optional shared fallback model |
| `OPENROUTER_EXTRACTION_MODEL` | Model used for candidate-profile extraction |
| `OPENROUTER_ANALYSIS_MODEL` | Model used for job-specific analysis |
| `OPENROUTER_ANALYSIS_TIMEOUT_SECONDS` | Analysis HTTP timeout; must be below 180 seconds |
| `OPENROUTER_EXTRACTION_INTERVAL_SECONDS` | Delay between resumes in one extraction batch |
| `OPENROUTER_ANALYSIS_INTERVAL_SECONDS` | Delay between worker analysis requests |
| `ANALYSIS_WORKER_POLL_SECONDS` | Queue polling interval while idle |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `FLASK_DEBUG` | Enables Flask debug mode when set to `true` |
| `PORT` | Flask listening port |

## Local Development

### 1. Backend API

From PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Fill in backend/.env without committing it.
python app.py
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/health` to confirm it is available.

### 2. Background worker

Open a second terminal after configuring `backend/.env`:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python worker.py
```

If the worker is not running, uploads can still complete, but job-specific analyses will remain `pending`.

### 3. Frontend

Open a third terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
# Fill in frontend/.env without committing it.
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

## Validation and Tests

Run the backend test suite:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m unittest discover -s tests
```

Validate and build the frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## API Overview

All application endpoints under `/api` require a Supabase bearer token unless stated otherwise.

| Area | Main endpoints |
| --- | --- |
| Health | `GET /health` |
| Jobs | `GET/POST /api/jobs/`, `GET/DELETE /api/jobs/{job_id}` |
| Rediscovery | `GET /api/jobs/{job_id}/rediscovery-candidates`, `POST /api/jobs/{job_id}/candidates` |
| Resumes | `POST /api/jobs/{job_id}/resumes` |
| Job candidates | `GET /api/jobs/{job_id}/candidates`, candidate details, status update, retry, and unlink routes |
| Candidate database | `GET /api/candidates/`, candidate details, signed resume URL, and deletion routes |
| Reports | `POST /api/jobs/{job_id}/reports/excel` |
| Profile | `GET/PATCH /api/profile`, `POST /api/profile/deactivate` |

## Deployment

### Vercel frontend

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Configure all three frontend environment variables.
- Set `VITE_API_BASE_URL` to the deployed Render API URL followed by `/api`.
- `frontend/vercel.json` already rewrites SPA routes to `index.html`.

### Render backend

Create the web service with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Health-check path: `/health`

Configure the backend environment variables and set `FRONTEND_ORIGIN` to the deployed Vercel origin without a trailing path.

The analysis worker must also run from the `backend` directory with:

```text
python worker.py
```

A separate Render background worker is the recommended deployment. For a limited demonstration environment, ensure some continuously running process executes `worker.py`; otherwise queued analyses will not be processed.

## Security and Privacy

- Flask validates Supabase JWTs against the project's JWKS endpoint.
- User-scoped database access uses the recruiter's bearer token and Supabase RLS.
- Privileged Supabase operations occur only after backend authorization and ownership checks.
- Resumes are stored in a private bucket and opened through short-lived signed URLs.
- Job analysis receives an anonymized structured candidate profile—not the candidate's name, email, phone, location, ID, file path, recruiter identity, or raw resume text.
- AI prompts treat resume and job data as untrusted content and instruct the model to ignore embedded instructions.
- API responses and persisted failures use safe error messages rather than exposing secrets or provider internals.

## Current Limitations

- Scanned PDFs require OCR, which is not included.
- Candidate extraction is synchronous, so larger upload batches take longer to return.
- AI scores may vary between repeated analyses even at temperature zero; the final weighted calculation is deterministic for a fixed set of component scores.
- The worker processes one analysis at a time and uses manual retry rather than automatic retry/backoff.
- Only the candidate's latest resume and structured profile are retained.
- The repository migrations are incremental and do not recreate the original base schema from an empty Supabase project.

## Disclaimer

TalentArch AI is an academic prototype. Its AI-generated scores, summaries, and gap analyses are decision-support information and should not be used as the sole basis for employment decisions.
