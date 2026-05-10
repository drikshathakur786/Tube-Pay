# Tube Pay

A full-stack platform for live streamers to receive real-time donations (superchats) from their viewers — built as a team project for the **Full Stack Engineering** course.

🌐 **Live Demo**: [https://tube-pay.w16manik.ninja](https://tube-pay-beta.vercel.app)

---

## What it does

- Streamers can create live streams and share a QR code for viewers to donate
- Viewers donate via Razorpay and their superchat appears live on stream
- Emails are sent to both parties on every successful donation
- Real-time superchat feed powered by Socket.IO and Firebase Realtime Database

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Express.js 5, Node.js, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Caching | Redis (sessions + caching) |
| Auth | Google OAuth (Passport.js) + JWT |
| Payments | Razorpay |
| Email | Resend + Nodemailer (SMTP) |
| Realtime | Socket.IO + Firebase Realtime Database |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Deploy | Docker Compose |

---

## Getting Started

### Prerequisites
- Node.js 22+
- Docker Desktop

### Run with Docker (easiest)

```bash
git clone https://github.com/drikshathakur786/Tube-Pay.git
cd Tube-Pay

# Copy and fill in your env variables
cp .env.example .env

# Start everything
docker compose up
```

App runs at `http://localhost:3000`, API at `http://localhost:5000`.

### Run locally

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in values
npx prisma migrate dev
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
GOOGLE_CLIENT_ID / SECRET     → Google Cloud Console
RAZORPAY_KEY_ID / SECRET      → Razorpay Dashboard
RESEND_KEY / EMAIL             → Resend Dashboard
SMTP_USER / PASS               → Gmail App Password
JWT_SECRET                     → any random string
FIREBASE_DATABASE_URL          → Firebase Console
FIREBASE_SERVICE_ACCOUNT       → Firebase service account JSON
```

---

## API Overview

| Method | Route | Description |
|---|---|---|
| GET | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/token` | Get JWT token |
| GET | `/api/auth/jwt-protected` | JWT-protected demo route |
| GET | `/api/streams/live` | Get all live streams |
| POST | `/api/streams` | Create a stream |
| POST | `/api/payment/order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify payment |
| GET | `/api/superchats/:streamId` | Get superchats from Firebase |

---

## Running Tests

```bash
cd backend
npm test
```

31 tests across unit and integration test suites.

---

## Team

Built by a team of students for the Full Stack Engineering course.
