import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  // 1. Create a transporter object using SMTP transport service
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // Port 465 ke liye true hona zaroori hai
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // 3. Trigger the email dispatch
  await transporter.sendMail(mailOptions);
};
