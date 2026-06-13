import "dotenv/config";

const requireValue = (name, aliases = []) => {
  const matchedKey = [name, ...aliases].find((key) => process.env[key]?.trim());

  if (!matchedKey) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return process.env[matchedKey].trim();
};

const parsePositiveInteger = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? fallback, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  port: parsePositiveInteger("PORT", 5000),
  mongoUri: requireValue("MONGO_URI", ["MONGO_URL"]),
  jwtSecret: requireValue("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "7d",
  bcryptSaltRounds: parsePositiveInteger("BCRYPT_SALT_ROUNDS", 12),
  otpExpiresInMinutes: parsePositiveInteger("OTP_EXPIRES_IN_MINUTES", 5),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export const getSmtpConfig = () => ({
  host: requireValue("SMTP_HOST"),
  port: parsePositiveInteger("SMTP_PORT", 587),
  secure: process.env.SMTP_SECURE === "true",
  user: requireValue("SMTP_USER"),
  pass: requireValue("SMTP_PASS"),
  from: requireValue("SMTP_FROM", ["SENDER_EMAIL"]),
});

export const getRazorpayConfig = () => ({
  keyId: requireValue("RAZORPAY_KEY_ID", ["TEST_API_KEY"]),
  keySecret: requireValue("RAZORPAY_KEY_SECRET", ["TEST_KEY_SECRET"]),
});

export default env;
