import nodemailer from "nodemailer";

import { getSmtpConfig } from "./env.js";

let transporter;

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
