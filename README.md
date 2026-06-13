# EventSphere Backend

Production-oriented REST API foundation for EventSphere, built with Node.js, Express,
MongoDB, Mongoose, JWT, bcrypt, Nodemailer, and Razorpay.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and provide real MongoDB, JWT, SMTP, and Razorpay
   credentials.

3. Start development mode:

   ```bash
   npm run dev
   ```

The API defaults to `http://localhost:5000`. Authentication is exposed at
`/api/auth` and `/api/v1/auth`.

## Scripts

- `npm run dev` starts the API with Nodemon.
- `npm start` starts the API with Node.js.
- `npm test` runs the foundation test suite.

## Authentication API

| Method | Endpoint | Authentication |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public |
| `POST` | `/api/v1/auth/send-verification-otp` | Public |
| `POST` | `/api/v1/auth/verify-otp` | Public |
| `POST` | `/api/v1/auth/login` | Public |
| `POST` | `/api/v1/auth/forgot-password` | Public |
| `POST` | `/api/v1/auth/reset-password` | Public |
| `GET` | `/api/v1/auth/me` | Bearer token |
| `GET` | `/api/v1/health` | Public |

Public registration accepts the `user` and `organizer` roles. Login is blocked until
the account email has been verified.

See [Authentication API](docs/authentication-api.md) for payloads, responses, and
error codes for the requested `/api/auth` endpoints.

All responses use the following envelope:

```json
{
  "success": true,
  "message": "Request completed",
  "data": {}
}
```

## Structure

```text
config/       Environment, database, mail, and Razorpay clients
controllers/  HTTP request handlers
middleware/   Authentication, authorization, and errors
models/       User, OTP, Event, and Booking schemas
routes/       Versioned Express routers
services/     Authentication and email business logic
utils/        Shared errors, JWT, OTP, and async helpers
```
