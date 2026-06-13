import assert from "node:assert/strict";
import { before, test } from "node:test";
import bcrypt from "bcrypt";

process.env.MONGO_URI ??= "mongodb://127.0.0.1:27017/eventsphere_test";
process.env.JWT_SECRET ??= "test-secret-that-is-long-enough";
process.env.BCRYPT_SALT_ROUNDS ??= "4";

let app;
let Booking;
let Event;
let OTP;
let User;
let authorizeRoles;
let loginUser;
let requestPasswordReset;
let registerUser;
let resetUserPassword;
let signAccessToken;
let verifyAccessToken;
let verifyUserOtp;

before(async () => {
  ({ default: app } = await import("../app.js"));
  ({ default: Booking } = await import("../models/booking.model.js"));
  ({ default: Event } = await import("../models/event.model.js"));
  ({ default: OTP } = await import("../models/otp.model.js"));
  ({ default: User } = await import("../models/user.model.js"));
  ({ authorizeRoles } = await import("../middleware/role.middleware.js"));
  ({ loginUser, registerUser, requestPasswordReset, resetUserPassword, verifyUserOtp } =
    await import("../services/auth.service.js"));
  ({ signAccessToken, verifyAccessToken } = await import("../utils/jwt.js"));
});

test("models expose secure defaults and required indexes", () => {
  const user = new User({
    name: "Test User",
    email: "TEST@EXAMPLE.COM",
    password: "hashed-password",
  });
  const event = new Event({
    title: "Launch",
    description: "Product launch",
    venue: "Main Hall",
    eventDate: new Date(Date.now() + 86_400_000),
    totalSeats: 100,
    availableSeats: 100,
    price: 499,
    organizerId: user._id,
  });
  const booking = new Booking({
    userId: user._id,
    eventId: event._id,
    quantity: 2,
    amount: 998,
  });

  assert.equal(user.role, "user");
  assert.equal(user.isVerified, false);
  assert.equal(user.toJSON().password, undefined);
  assert.equal(event.isApproved, false);
  assert.equal(booking.paymentStatus, "pending");
  assert.equal(booking.bookingStatus, "pending");
  assert.ok(
    OTP.schema.indexes().some(
      ([fields, options]) => fields.expireAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
  assert.ok(
    OTP.schema.indexes().some(
      ([fields, options]) =>
        fields.userId === 1 && fields.purpose === 1 && options.unique === true,
    ),
  );
});

test("event rejects available seats above total seats", async () => {
  const event = new Event({
    title: "Invalid Event",
    description: "Invalid seat counts",
    venue: "Main Hall",
    eventDate: new Date(),
    totalSeats: 10,
    availableSeats: 11,
    price: 0,
    organizerId: new User()._id,
  });

  await assert.rejects(event.validate(), /Available seats cannot exceed total seats/);
});

test("role middleware allows and rejects roles correctly", () => {
  const allow = authorizeRoles("organizer", "admin");
  let receivedError;

  allow({ user: { role: "organizer" } }, {}, (error) => {
    receivedError = error;
  });
  assert.equal(receivedError, undefined);

  allow({ user: { role: "user" } }, {}, (error) => {
    receivedError = error;
  });
  assert.equal(receivedError.statusCode, 403);
});

test("public registration rejects the admin role", async () => {
  await assert.rejects(
    registerUser({
      name: "Admin Attempt",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    }),
    (error) => error.statusCode === 400,
  );
});

test("login rejects invalid credentials and unverified users, then issues a JWT", async () => {
  const originalFindOne = User.findOne;
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 4);

  try {
    User.findOne = () => ({ select: async () => null });
    await assert.rejects(loginUser("missing@example.com", password), {
      statusCode: 401,
    });

    User.findOne = () => ({
      select: async () => ({
        id: "507f1f77bcf86cd799439011",
        role: "user",
        password: hashedPassword,
        isVerified: false,
      }),
    });
    await assert.rejects(loginUser("user@example.com", password), {
      statusCode: 403,
    });

    const verifiedUser = {
      id: "507f1f77bcf86cd799439011",
      role: "organizer",
      password: hashedPassword,
      isVerified: true,
    };
    User.findOne = () => ({ select: async () => verifiedUser });
    const result = await loginUser("organizer@example.com", password);

    assert.equal(result.user, verifiedUser);
    assert.equal(verifyAccessToken(result.token).sub, verifiedUser.id);
  } finally {
    User.findOne = originalFindOne;
  }
});

test("OTP verification handles expiry, mismatch, and success", async () => {
  const originalUserFindOne = User.findOne;
  const originalOtpFindOne = OTP.findOne;
  const originalOtpDeleteOne = OTP.deleteOne;
  const originalOtpDeleteMany = OTP.deleteMany;
  const hashedOtp = await bcrypt.hash("123456", 4);
  let saved = false;
  const user = {
    id: "507f1f77bcf86cd799439011",
    isVerified: false,
    save: async () => {
      saved = true;
    },
  };

  const setOtpRecord = (record) => {
    OTP.findOne = () => ({
      async select() {
        return record;
      },
    });
  };

  try {
    User.findOne = async () => user;
    OTP.deleteOne = async () => {};
    OTP.deleteMany = async () => {};

    setOtpRecord({
      id: "otp-id",
      otp: hashedOtp,
      expireAt: new Date(Date.now() - 1000),
      purpose: "email_verification",
    });
    await assert.rejects(verifyUserOtp("user@example.com", "123456"), /expired/);

    setOtpRecord({
      id: "otp-id",
      otp: hashedOtp,
      expireAt: new Date(Date.now() + 60_000),
      purpose: "email_verification",
    });
    await assert.rejects(verifyUserOtp("user@example.com", "654321"), /Invalid/);

    const result = await verifyUserOtp("user@example.com", "123456");
    assert.equal(result, user);
    assert.equal(user.isVerified, true);
    assert.equal(saved, true);
  } finally {
    User.findOne = originalUserFindOne;
    OTP.findOne = originalOtpFindOne;
    OTP.deleteOne = originalOtpDeleteOne;
    OTP.deleteMany = originalOtpDeleteMany;
  }
});

test("forgot password does not disclose unknown accounts", async () => {
  const originalFindOne = User.findOne;

  try {
    User.findOne = async () => null;
    await assert.doesNotReject(requestPasswordReset("missing@example.com"));
  } finally {
    User.findOne = originalFindOne;
  }
});

test("password reset verifies purpose-scoped OTP and stores a bcrypt hash", async () => {
  const originalUserFindOne = User.findOne;
  const originalOtpFindOne = OTP.findOne;
  const originalOtpDeleteOne = OTP.deleteOne;
  const hashedOtp = await bcrypt.hash("123456", 4);
  let deletedFilter;
  let saved = false;
  const user = {
    id: "507f1f77bcf86cd799439011",
    password: "old-password-hash",
    async save() {
      saved = true;
    },
  };

  try {
    User.findOne = () => ({ select: async () => user });
    OTP.findOne = (filter) => {
      assert.equal(filter.purpose, "password_reset");
      return {
        async select() {
          return {
            id: "reset-otp-id",
            otp: hashedOtp,
            expireAt: new Date(Date.now() + 60_000),
          };
        },
      };
    };
    OTP.deleteOne = async (filter) => {
      deletedFilter = filter;
    };

    await resetUserPassword({
      email: "user@example.com",
      otp: "123456",
      newPassword: "new-password-123",
    });

    assert.equal(saved, true);
    assert.equal(await bcrypt.compare("new-password-123", user.password), true);
    assert.equal(deletedFilter.purpose, "password_reset");
  } finally {
    User.findOne = originalUserFindOne;
    OTP.findOne = originalOtpFindOne;
    OTP.deleteOne = originalOtpDeleteOne;
  }
});

test("JWT helpers reject expired tokens", async () => {
  const token = signAccessToken({
    id: "507f1f77bcf86cd799439011",
    role: "user",
  });
  assert.equal(verifyAccessToken(token).role, "user");

  const { default: jwt } = await import("jsonwebtoken");
  const expiredToken = jwt.sign(
    { sub: "507f1f77bcf86cd799439011", role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: -1 },
  );
  assert.throws(() => verifyAccessToken(expiredToken));
});

test("health and unknown routes use the API response format", async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const healthResponse = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    const healthBody = await healthResponse.json();
    assert.equal(healthResponse.status, 200);
    assert.equal(healthBody.success, true);

    const missingResponse = await fetch(`http://127.0.0.1:${port}/api/v1/missing`);
    const missingBody = await missingResponse.json();
    assert.equal(missingResponse.status, 404);
    assert.equal(missingBody.success, false);

    const noTokenResponse = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`);
    assert.equal(noTokenResponse.status, 401);

    const invalidTokenResponse = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, {
      headers: { authorization: "Bearer invalid-token" },
    });
    assert.equal(invalidTokenResponse.status, 401);

    const authRequests = [
      ["/api/auth/register", {}],
      ["/api/auth/verify-otp", { email: "invalid", otp: "123" }],
      ["/api/auth/login", {}],
      ["/api/auth/forgot-password", { email: "invalid" }],
      ["/api/auth/reset-password", { email: "invalid", otp: "123", newPassword: "short" }],
    ];

    for (const [path, body] of authRequests) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 400);
      assert.equal(responseBody.success, false);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
