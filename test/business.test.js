import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, test } from "node:test";

process.env.MONGO_URI ??= "mongodb://127.0.0.1:27017/eventsphere_test";
process.env.JWT_SECRET ??= "test-secret-that-is-long-enough";
process.env.RAZORPAY_KEY_ID = "rzp_test_business";
process.env.RAZORPAY_KEY_SECRET = "razorpay-test-secret";

let Booking;
let Event;
let confirmPayment;
let createBooking;
let createEvent;
let createPaymentOrder;
let updateOrganizerEvent;

before(async () => {
  ({ default: Booking } = await import("../models/booking.model.js"));
  ({ default: Event } = await import("../models/event.model.js"));
  ({ createBooking } = await import("../services/booking.service.js"));
  ({ createEvent, updateOrganizerEvent } = await import("../services/event.service.js"));
  ({ confirmPayment, createPaymentOrder } = await import("../services/payment.service.js"));
});

test("organizer event creation controls seats, ownership, and approval", async () => {
  const originalCreate = Event.create;
  let createdData;

  try {
    Event.create = async (data) => {
      createdData = data;
      return data;
    };

    await createEvent("507f1f77bcf86cd799439011", {
      title: "Tech Summit",
      description: "A practical technology event",
      venue: "Convention Center",
      eventDate: new Date(Date.now() + 86_400_000).toISOString(),
      totalSeats: 120,
      price: 499,
    });

    assert.equal(createdData.availableSeats, 120);
    assert.equal(createdData.isApproved, false);
    assert.equal(createdData.organizerId, "507f1f77bcf86cd799439011");
  } finally {
    Event.create = originalCreate;
  }
});

test("event updates preserve sold seats and require reapproval", async () => {
  const originalFindOne = Event.findOne;
  const event = {
    totalSeats: 100,
    availableSeats: 80,
    isApproved: true,
    async save() {},
  };

  try {
    Event.findOne = async () => event;
    const result = await updateOrganizerEvent(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
      { totalSeats: 150, title: "Updated Summit" },
    );

    assert.equal(result.totalSeats, 150);
    assert.equal(result.availableSeats, 130);
    assert.equal(result.isApproved, false);

    await assert.rejects(
      updateOrganizerEvent(
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439011",
        { totalSeats: 10 },
      ),
      /sold seats/,
    );
  } finally {
    Event.findOne = originalFindOne;
  }
});

test("booking amount is calculated from event price and quantity", async () => {
  const originalEventFindOne = Event.findOne;
  const originalBookingCreate = Booking.create;
  let bookingData;

  try {
    Event.findOne = async () => ({
      id: "507f1f77bcf86cd799439012",
      price: 750,
      availableSeats: 5,
    });
    Booking.create = async (data) => {
      bookingData = data;
      return data;
    };

    await createBooking({
      userId: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
      quantity: 2,
    });

    assert.equal(bookingData.amount, 1500);
    assert.equal(bookingData.quantity, 2);
  } finally {
    Event.findOne = originalEventFindOne;
    Booking.create = originalBookingCreate;
  }
});

test("Razorpay order uses server amount converted to paise", async () => {
  const originalBookingFindOne = Booking.findOne;
  const originalEventFindById = Event.findById;
  let orderOptions;
  const booking = {
    id: "507f1f77bcf86cd799439013",
    eventId: "507f1f77bcf86cd799439012",
    amount: 999,
    quantity: 3,
    paymentStatus: "pending",
    async save() {},
  };

  try {
    Booking.findOne = async () => booking;
    Event.findById = async () => ({
      isApproved: true,
      eventDate: new Date(Date.now() + 86_400_000),
      availableSeats: 10,
    });

    const result = await createPaymentOrder(
      {
        bookingId: booking.id,
        userId: "507f1f77bcf86cd799439011",
      },
      {
        keyId: "rzp_test_business",
        razorpayClient: {
          orders: {
            async create(options) {
              orderOptions = options;
              return { id: "order_123", ...options };
            },
          },
        },
      },
    );

    assert.equal(orderOptions.amount, 99900);
    assert.equal(orderOptions.currency, "INR");
    assert.equal(booking.razorpayOrderId, "order_123");
    assert.equal(result.keyId, "rzp_test_business");
  } finally {
    Booking.findOne = originalBookingFindOne;
    Event.findById = originalEventFindById;
  }
});

test("payment success verifies signature, reduces seats, and confirms booking", async () => {
  const originalBookingFindOne = Booking.findOne;
  const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const originalEventFindOneAndUpdate = Event.findOneAndUpdate;
  let seatUpdate;
  let emailPayload;
  const user = {
    id: "507f1f77bcf86cd799439011",
    name: "Test User",
    email: "user@example.com",
  };
  const bookingId = "507f1f77bcf86cd799439013";
  const eventId = "507f1f77bcf86cd799439012";
  const orderId = "order_123";
  const paymentId = "pay_123";
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const pendingBooking = {
    id: bookingId,
    eventId,
    userId: user.id,
    quantity: 2,
    paymentStatus: "pending",
    razorpayOrderId: orderId,
  };
  const claimedBooking = {
    ...pendingBooking,
    paymentStatus: "processing",
    paymentId,
    bookingStatus: "pending",
    async save() {},
    async populate() {
      this.eventId = {
        title: "Tech Summit",
        venue: "Convention Center",
        eventDate: new Date(Date.now() + 86_400_000),
      };
      return this;
    },
  };

  try {
    Booking.findOne = async () => pendingBooking;
    Booking.findOneAndUpdate = async () => claimedBooking;
    Event.findOneAndUpdate = async (filter, update) => {
      assert.equal(filter.availableSeats.$gte, 2);
      seatUpdate = update;
      return { id: eventId };
    };

    const result = await confirmPayment(
      {
        bookingId,
        user,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
      {
        async sendConfirmation(payload) {
          emailPayload = payload;
        },
      },
    );

    assert.equal(seatUpdate.$inc.availableSeats, -2);
    assert.equal(result.paymentStatus, "paid");
    assert.equal(result.bookingStatus, "confirmed");
    assert.equal(emailPayload.email, user.email);
  } finally {
    Booking.findOne = originalBookingFindOne;
    Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    Event.findOneAndUpdate = originalEventFindOneAndUpdate;
  }
});

test("payment success rejects an invalid Razorpay signature before changing seats", async () => {
  const originalBookingFindOne = Booking.findOne;
  const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  let claimed = false;

  try {
    Booking.findOne = async () => ({
      id: "507f1f77bcf86cd799439013",
      userId: "507f1f77bcf86cd799439011",
      paymentStatus: "pending",
      razorpayOrderId: "order_123",
    });
    Booking.findOneAndUpdate = async () => {
      claimed = true;
    };

    await assert.rejects(
      confirmPayment({
        bookingId: "507f1f77bcf86cd799439013",
        user: {
          id: "507f1f77bcf86cd799439011",
          name: "Test User",
          email: "user@example.com",
        },
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "invalid",
      }),
      /Invalid payment signature/,
    );
    assert.equal(claimed, false);
  } finally {
    Booking.findOne = originalBookingFindOne;
    Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
  }
});
