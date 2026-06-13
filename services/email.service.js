import { getSmtpConfig } from "../config/env.js";
import { getMailer } from "../config/mailer.js";

export const sendVerificationEmail = async ({ name, email, otp, expiresInMinutes }) => {
  const smtp = getSmtpConfig();

  await getMailer().sendMail({
    from: smtp.from,
    to: email,
    subject: "Verify your EventSphere email",
    text: `Hello ${name}, your EventSphere verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    html: `<p>Hello ${name},</p><p>Your EventSphere verification code is <strong>${otp}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
  });
};

export const sendPasswordResetEmail = async ({ name, email, otp, expiresInMinutes }) => {
  const smtp = getSmtpConfig();

  await getMailer().sendMail({
    from: smtp.from,
    to: email,
    subject: "Reset your EventSphere password",
    text: `Hello ${name}, your EventSphere password reset code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    html: `<p>Hello ${name},</p><p>Your EventSphere password reset code is <strong>${otp}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
  });
};

export const sendBookingConfirmationEmail = async ({ name, email, booking }) => {
  const smtp = getSmtpConfig();
  const event = booking.eventId;
  const eventDate = new Date(event.eventDate).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await getMailer().sendMail({
    from: smtp.from,
    to: email,
    subject: `Booking confirmed: ${event.title}`,
    text: `Hello ${name}, your booking for ${event.title} is confirmed. Quantity: ${booking.quantity}. Venue: ${event.venue}. Date: ${eventDate}.`,
    html: `<p>Hello ${name},</p><p>Your booking for <strong>${event.title}</strong> is confirmed.</p><p>Tickets: ${booking.quantity}<br>Venue: ${event.venue}<br>Date: ${eventDate}</p>`,
  });
};
