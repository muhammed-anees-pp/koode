# Koode - Mental Health & Online Consultation Platform

![Project Status](https://img.shields.io/badge/status-completed-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10+-blue)
![Django](https://img.shields.io/badge/Django-5.x-092E20)
![React](https://img.shields.io/badge/React-19-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-336791)

Koode is a full-stack mental health and wellness platform designed to connect patients with verified psychologists for secure online consultations. It provides appointment booking, real-time chat, video consultations, wallet payments, reviews, complaints, psychologist onboarding, and admin management in one complete system.

The platform is built with a Django REST backend and a React frontend, with real-time features powered by Django Channels, Redis, and WebSockets.

## Features

### Authentication & Access Control

- **JWT Authentication:** Secure login and session handling using access and refresh tokens.
- **Google Authentication:** Google login support for patients and psychologists.
- **Role-Based Access:** Separate workflows for patients, psychologists, and administrators.
- **Account Protection:** Suspended users are automatically logged out and blocked from protected flows.
- **Password Reset:** Email-based password recovery support.

### Patient Experience

- **Psychologist Discovery:** Patients can browse verified psychologists and view detailed profiles.
- **Psychologist Finder:** Guided recommendation flow to help patients find suitable psychologists.
- **Appointment Booking:** Patients can book available slots and manage upcoming, past, and cancelled appointments.
- **Wallet & Payments:** Wallet balance, transaction history, Razorpay payment support, and refund handling.
- **Video Consultations:** Patients can join secure consultation rooms during the active appointment window.
- **Rejoin Support:** Once admitted by the psychologist, patients can leave and rejoin during the active slot.
- **Reviews & Complaints:** Patients can review completed consultations and raise complaints when eligible.
- **Chatbot Support:** Built-in Koode assistant for platform guidance and support.

### Psychologist Workflow

- **Profile Management:** Psychologists can manage profile details, specialties, and availability.
- **Availability Slots:** Psychologists can create and manage appointment slots.
- **Application & Verification:** Psychologists complete an onboarding application before approval.
- **Interview Room:** Admins can conduct online interviews with applicants.
- **Appointment Management:** Psychologists can view, reschedule, cancel, and complete appointments.
- **Consultation Notes:** Psychologists can save private notes and patient-facing notes.
- **Patient Summary:** Psychologists can view patient consultation history and summary reports.
- **Wallet & Payouts:** Psychologists can track earnings and payout-related information.

### Real-Time Communication

- **Video Rooms:** ZEGOCLOUD-powered video rooms for interviews and consultations.
- **Admission Flow:** Psychologists admit patients before they can join consultation rooms.
- **Live Chat:** Appointment-based chat using WebSockets.
- **Consultation Messages:** In-room messaging during active consultations.
- **Notifications:** Real-time notifications for appointments, messages, status changes, and platform events.

### Admin Management

- **Dashboard:** Admin overview of platform activity and operational metrics.
- **User Management:** Manage patients, psychologists, and account status.
- **Application Review:** Review psychologist applications and verification status.
- **Interview Management:** Schedule and manage psychologist onboarding interviews.
- **Appointment Oversight:** Inspect bookings, payments, consultations, and appointment status.
- **Finance Controls:** Track wallet transactions, commissions, payouts, and payment records.
- **Complaint Handling:** Manage patient complaints and related workflows.
- **Reports:** Dashboard and report export support for administrative review.

## Tech Stack

### Backend

| Component | Technology |
| --- | --- |
| Framework | Django, Django REST Framework |
| Authentication | Simple JWT |
| Real-Time | Django Channels, Daphne |
| Task Queue | Celery |
| Broker / Cache | Redis |
| Database | PostgreSQL |
| Media Storage | AWS S3 via Django Storages |
| Payments | Razorpay |
| Video SDK | ZEGOCLOUD |
| AI Support | Mistral AI |

### Frontend

| Component | Technology |
| --- | --- |
| Framework | React 19 with Vite |
| Routing | React Router |
| Server State | TanStack React Query |
| Client State | Zustand |
| Styling | Tailwind CSS |
| Forms | React Hook Form, Zod |
| HTTP Client | Axios |
| Video SDK | Zego Express Engine WebRTC |

## Project Structure

```text
koode/
|-- backend/
|   |-- accounts/
|   |-- applications/
|   |-- appointments/
|   |-- chat/
|   |-- chatbot/
|   |-- complaints/
|   |-- config/
|   |-- consultations/
|   |-- dashboard/
|   |-- finance/
|   |-- home/
|   |-- interviews/
|   |-- notifications/
|   |-- patient_summary/
|   |-- patients/
|   |-- psychologist_finder/
|   |-- psychologists/
|   |-- reviews/
|   |-- video/
|   |-- manage.py
|   `-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- store/
|   |   `-- utils/
|   |-- package.json
|   `-- vite.config.js
|
`-- README.md
```

## Consultation Room Rules

- The room opens **5 minutes before** the appointment start time.
- The room closes automatically at the appointment slot end time.
- Patients must request to join before their first entry.
- Psychologists must admit the patient before a patient token is issued.
- After admission, the patient can leave and rejoin during the same active slot.
- The patient button shows **Rejoin** after successful admission.
- Cancelled, completed, unpaid, or expired appointments cannot open the room.

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- PostgreSQL
- Redis
- Razorpay account
- ZEGOCLOUD account
- AWS S3 bucket
- Google OAuth client ID

## 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv koode-venv
source koode-venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Run WebSocket Server

Use Daphne when testing real-time notifications or chat:

```bash
cd backend
daphne config.asgi:application
```

### Run Celery Worker

```bash
cd backend
celery -A config worker -l info
```

## Docker Backend Setup

The backend can also run through Docker Compose with Redis, Daphne, and a Celery worker. PostgreSQL is expected to be an external AWS RDS instance, not a Docker container.

Create `backend/.env.docker` from the example and put your real RDS credentials there:

```text
DB_NAME=your_rds_database
DB_USER=your_rds_user
DB_PASSWORD=your_rds_password
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_SSLMODE=require
```

```bash
# Build backend images
docker compose -f docker-compose.backend.yml build

# Start Redis, Django/Daphne, and Celery
docker compose -f docker-compose.backend.yml up -d

# Check service status and logs
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f backend-web
```

The compose file loads `backend/.env.docker.example` and optionally overlays `backend/.env.docker` when present. Copy the example to `backend/.env.docker` for local secrets or service keys.

Local Docker ports:

```text
Backend:    http://localhost:8000
Redis:      127.0.0.1:6380
```

Run one-off Django commands through the web service:

```bash
docker compose -f docker-compose.backend.yml run --rm backend-web python manage.py check
docker compose -f docker-compose.backend.yml run --rm backend-web python manage.py migrate
docker compose -f docker-compose.backend.yml run --rm backend-web python manage.py createsuperuser
```

## 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build Frontend

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file inside the `backend/` directory.

```text
# General
DEBUG=True
SECRET_KEY=your_django_secret_key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_SSLMODE=require
DB_SSLROOTCERT=
DB_CONN_MAX_AGE=60

# Redis, Channels, Celery
REDIS_URL=redis://127.0.0.1:6379/0
CHANNEL_REDIS_URL=redis://127.0.0.1:6379/1

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=30
REFRESH_TOKEN_LIFETIME_DAYS=1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend URLs
PATIENT_FRONTEND_URL=http://localhost:5173
PSYCHOLOGIST_FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5173

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@example.com
EMAIL_HOST_PASSWORD=your_email_password
DEFAULT_FROM_EMAIL=your_email@example.com

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=your_region
AWS_S3_SIGNATURE_VERSION=s3v4

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/

# ZEGOCLOUD
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret
ZEGO_CONSULTATION_APP_ID=your_zego_consultation_app_id
ZEGO_CONSULTATION_SERVER_SECRET=your_zego_consultation_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
MISTRAL_MODEL=mistral-small-latest
MISTRAL_TIMEOUT_SECONDS=30
CHATBOT_USE_LLM_REWRITES=1
```

For Google Cloud OAuth, configure:

```text
Authorized JavaScript origins:
http://localhost:5173
http://127.0.0.1:5173
https://koode.online
https://www.koode.online

Authorized redirect URIs:
http://localhost:8000/api/auth/google/callback/
https://koode.online/api/auth/google/callback/
https://www.koode.online/api/auth/google/callback/
```

Create a `.env` file inside the `frontend/` directory.

```text
VITE_API_BASE_URL=http://localhost:8000/api/
VITE_WS_BASE_URL=ws://localhost:8000
```

## Useful Commands

### Backend

```bash
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Deployment Notes

- Use PostgreSQL as the production database.
- Use Redis for Channels and Celery.
- Serve the backend with an ASGI server such as Daphne for WebSocket support.
- Build the frontend with `npm run build`.
- Serve frontend static files from `frontend/dist`.
- Configure all production secrets through environment variables.
- Set `DEBUG=False` in production.
- Configure production `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
- Store uploaded media in AWS S3.

## Project Status

Koode is feature-complete for the main patient, psychologist, and admin workflows. The project is ready for production hardening, deployment configuration, monitoring, and expanded automated testing.

## Author

**Koode Project**

Mental Health & Online Consultation Platform
