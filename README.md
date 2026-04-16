# Koode 🌿

Koode is a comprehensive mental health and wellness platform that seamlessly connects patients with verified professional psychologists. It provides an intuitive interface for appointment booking, real-time messaging, video consultations, and comprehensive management tools for both practitioners and administrators.

## 🚀 Features

### For Patients
- **Discover Psychologists:** Browse and filter through a list of verified psychologists.
- **Appointment Booking:** Seamlessly book, reschedule, or cancel appointments.
- **Video Consultations:** Secure, high-quality video calls integrated directly into the platform.
- **Real-time Notifications:** Get instant alerts for upcoming appointments, messages, and status updates.

### For Psychologists
- **Profile Management:** Manage availability, credentials, and specialties.
- **Schedule Management:** View, accept, and manage patient appointments dynamically.
- **Interviews & Applications:** Track onboarding progress entirely inside the app.

### For Administrators
- **Admin Dashboard:** Comprehensive oversight of the platform.
- **User & Practitioner Management:** Add, suspend, or verify psychologists and patients.
- **Content & Service Management:** Review incoming applications and interview processes.

## 💻 Tech Stack

**Frontend:**
- [React](https://react.dev/) (v19) with [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for modern, responsive styling
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [React Query](https://tanstack.com/query/latest) for data fetching and caching
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for robust form validation
- [ZegoCloud](https://www.zegocloud.com/) for WebRTC video communications

**Backend:**
- [Django](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery](https://docs.celeryq.dev/) & [Redis](https://redis.io/) for asynchronous tasks and caching
- [Django Channels](https://channels.readthedocs.io/) for WebSockets & Real-time notifications
- JWT Authentication


## 🛠️ Getting Started

Follow these steps to get the project up and running locally.

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis (for Celery and WebSockets)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Create and activate a virtual environment:
```bash
python -m venv koode-venv
source koode-venv/bin/activate  # On Windows use: koode-venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Run database migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

Start the backend server:
```bash
python manage.py runserver
```

*(Note: To test real-time features and background tasks, make sure Redis is running, and start your Celery worker locally).*

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```


## 🔐 Environment Variables

You will need to set up `.env` files for both the frontend and backend. 

* Check `backend/.env.example` (if available) or configure your database, secret keys, AWS S3 keys, and Redis URL in `backend/.env`.
* Configure your API Base URL and ZegoCloud credentials in `frontend/.env`.

---
