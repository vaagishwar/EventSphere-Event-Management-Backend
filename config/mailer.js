import nodemailer from "nodemailer";

import { getSmtpConfig } from "./env.js";

let transporter;

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
