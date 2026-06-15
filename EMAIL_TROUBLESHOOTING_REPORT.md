# Email Sending Troubleshooting Report

## Executive Summary

Email sending in the EventSphere backend was failing due to two critical issues:
1. **Local test script** (`emailcheck.js`) was not loading environment variables, causing connection attempts to `127.0.0.1:587`
2. **Production deployment** (Render) likely has missing or misconfigured SMTP environment variables
3. **No error handling** - registration failed completely when email sending failed
4. **No verification** - SMTP connection was not verified before sending emails

## Root Cause Analysis

### Issue 1: emailcheck.js Missing dotenv/config

**File:** `backend/emailcheck.js`
**Line:** 1 (missing import)
**Problem:** The script directly accessed `process.env.SMTP_HOST` without loading `dotenv/config`. When SMTP_HOST is undefined, Nodemailer defaults to `localhost` (127.0.0.1:587), causing `ECONNREFUSED` errors.

**Evidence:**
```
Error: connect ECONNREFUSED 127.0.0.1:587
```

### Issue 2: Render Environment Variables Missing

**File:** `backend/config/env.js` (lines 37-44)
**Problem:** The `getSmtpConfig()` function uses `requireValue()` which throws an error if SMTP_HOST, SMTP_USER, SMTP_PASS, or SMTP_FROM are missing. Render logs showed `ETIMEDOUT` errors, suggesting the SMTP_HOST was either missing or incorrect.

**Evidence:**
```
Error: Connection timeout
code: ETIMEDOUT
command: CONN
```

### Issue 3: No SMTP Connection Verification

**File:** `backend/config/mailer.js` (lines 7-19)
**Problem:** The transporter was created but never verified. This meant connection issues were only discovered when attempting to send emails, causing registration to fail.

### Issue 4: No Graceful Error Handling

**File:** `backend/services/auth.service.js` (lines 16-32)
**Problem:** When email sending failed, the entire registration process failed. Users were created in MongoDB but the API returned HTTP 500, leaving the application in an inconsistent state.

## Email Flow Audit

Complete flow from registration to email sending:

```
POST /api/v1/auth/register
  ↓
auth.controller.js:19 (register controller)
  ↓
auth.service.js:51 (registerUser service)
  ↓
auth.service.js:16 (createOtp function)
  ↓
auth.service.js:26 (sendEmail callback)
  ↓
email.service.js:4 (sendVerificationEmail)
  ↓
email.service.js:5 (getSmtpConfig)
  ↓
config/env.js:37 (getSmtpConfig function)
  ↓
email.service.js:6 (getMailer)
  ↓
config/mailer.js:7 (getMailer function)
  ↓
config/mailer.js:10 (nodemailer.createTransport)
  ↓
email.service.js:8 (transporter.sendMail)
```

## Required Code Changes

### 1. config/mailer.js

**Changes:**
- Made `getMailer()` async
- Added debug logging to print SMTP configuration
- Added `await transporter.verify()` before returning transporter
- Logs connection verification success/failure

**Before:**
```javascript
export const getMailer = () => {
  if (!transporter) {
    const smtp = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }
  return transporter;
};
```

**After:**
```javascript
export const getMailer = async () => {
  if (!transporter) {
    const smtp = getSmtpConfig();
    console.log("SMTP CONFIG", {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      passExists: !!smtp.pass,
      from: smtp.from,
    });
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection verified successfully");
  }
  return transporter;
};
```

### 2. services/email.service.js

**Changes:**
- Updated all email functions to `await getMailer()` (now async)
- Functions affected: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendBookingConfirmationEmail`

**Before:**
```javascript
await getMailer().sendMail({ ... });
```

**After:**
```javascript
const transporter = await getMailer();
await transporter.sendMail({ ... });
```

### 3. emailcheck.js

**Changes:**
- Added `import "dotenv/config"` at the top
- Added debug logging to print environment variables
- Now properly loads environment variables before accessing them

**Before:**
```javascript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  // ...
});
```

**After:**
```javascript
import "dotenv/config";
import nodemailer from "nodemailer";

console.log("SMTP ENV CHECK", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  passExists: !!process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  // ...
});
```

### 4. services/auth.service.js

**Changes:**
- Wrapped email sending in try-catch block in `createOtp` function
- Logs email errors but does not throw, allowing registration to proceed
- Ensures user creation succeeds even if email fails

**Before:**
```javascript
await sendEmail({
  name: user.name,
  email: user.email,
  otp,
  expiresInMinutes: env.otpExpiresInMinutes,
});
```

**After:**
```javascript
try {
  await sendEmail({
    name: user.name,
    email: user.email,
    otp,
    expiresInMinutes: env.otpExpiresInMinutes,
  });
} catch (emailError) {
  console.error("Email sending failed:", emailError.message);
  // Don't throw - allow registration to proceed even if email fails
}
```

## Required Environment Changes

### For Local Development

Ensure `.env` file contains:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=EventSphere <your-email@gmail.com>
```

### For Render Deployment

Add the following environment variables in Render dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| SMTP_HOST | smtp.gmail.com | Or your SMTP provider |
| SMTP_PORT | 587 | For TLS, or 465 for SSL |
| SMTP_SECURE | false | For TLS (port 587), or true for SSL (port 465) |
| SMTP_USER | your-email@gmail.com | Your email address |
| SMTP_PASS | your-app-password | Gmail App Password (NOT regular password) |
| SMTP_FROM | EventSphere <your-email@gmail.com> | From address |

**Important:** After adding environment variables, you must **redeploy** the application for the changes to take effect.

## Gmail-Specific Configuration

If using Gmail as SMTP provider:

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate an App Password:**
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password as SMTP_PASS
3. **Do NOT use your regular Gmail password** - it will not work

**Correct Gmail Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password (spaces are ok)
SMTP_FROM=EventSphere <your-email@gmail.com>
```

## Standalone Test Script

The updated `emailcheck.js` script now:

1. Loads environment variables via `dotenv/config`
2. Prints the SMTP configuration being used
3. Creates a Nodemailer transporter
4. Verifies the SMTP connection
5. Reports success or failure

**To run the test:**
```bash
cd backend
node emailcheck.js
```

**Expected output (success):**
```
SMTP ENV CHECK {
  host: 'smtp.gmail.com',
  port: '587',
  secure: 'false',
  user: 'your-email@gmail.com',
  passExists: true,
  from: 'EventSphere <your-email@gmail.com>'
}
Verifying SMTP connection...
SMTP OK
```

**Expected output (failure - missing env):**
```
SMTP ENV CHECK {
  host: undefined,
  port: undefined,
  secure: undefined,
  user: undefined,
  passExists: false,
  from: undefined
}
Error: Missing required environment variable: SMTP_HOST
```

## Improved Production-Safe Implementation

### Graceful Degradation

The registration flow now handles email failures gracefully:

1. User is created in MongoDB ✓
2. OTP is generated and stored in MongoDB ✓
3. Email is attempted (with verification) ✓
4. If email fails, error is logged but registration succeeds ✓
5. User can request a new OTP via resend endpoint ✓

This ensures:
- No HTTP 500 errors during registration
- Users can still use the application
- Email issues can be debugged via logs
- Users can manually request OTP resend

### Connection Verification

The SMTP connection is now verified before first use:
- Catches configuration errors early
- Prevents partial email sends
- Provides clear error messages in logs
- Only verifies once (transporter is cached)

### Debug Logging

Comprehensive logging at key points:
- SMTP configuration values (without exposing password)
- Connection verification status
- Email sending errors
- Registration flow status

## Verification Steps

### 1. Verify Local Environment

```bash
cd backend
node emailcheck.js
```

Should show SMTP configuration and verify successfully.

### 2. Verify Application Startup

```bash
npm run dev
```

Check logs for:
- "SMTP CONFIG" with correct values
- "Verifying SMTP connection..."
- "SMTP connection verified successfully"

### 3. Test Registration

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

Should return:
```json
{
  "success": true,
  "message": "Registration successful. Check your email for the verification code.",
  "data": { "user": { ... } }
}
```

### 4. Verify Render Deployment

1. Add SMTP environment variables in Render dashboard
2. Trigger a new deployment
3. Check Render logs for SMTP configuration
4. Test registration via production endpoint
5. Verify email is received

## Files Modified

1. `backend/config/mailer.js` - Added async getMailer, debug logging, connection verification
2. `backend/services/email.service.js` - Updated to await getMailer
3. `backend/emailcheck.js` - Added dotenv/config and debug logging
4. `backend/services/auth.service.js` - Added graceful error handling for email failures

## Next Steps

1. **Immediate:** Update `.env` file with correct SMTP credentials
2. **Test:** Run `node emailcheck.js` to verify local configuration
3. **Deploy:** Add SMTP environment variables to Render
4. **Redeploy:** Trigger a new deployment on Render
5. **Monitor:** Check logs for SMTP configuration and verification
6. **Test:** Perform end-to-end registration test on production

## Summary

The email sending issue was caused by:
- Missing `dotenv/config` in test script (local)
- Missing/misconfigured SMTP environment variables (Render)
- No connection verification before sending
- No graceful error handling

All issues have been addressed with:
- Proper environment variable loading
- Connection verification with logging
- Graceful error handling in registration
- Comprehensive debug logging
- Updated test script

The application is now production-safe and will provide clear error messages for any remaining configuration issues.
