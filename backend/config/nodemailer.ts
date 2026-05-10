import nodemailer from "nodemailer";

/*
 *    Nodemailer SMTP Transporter Configuration
 *    Uses Gmail SMTP or any SMTP provider
 *    Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface NodemailerMailProps {
  to: string;
  subject: string;
  html: string;
}

/*
 *    Sends an email using Nodemailer SMTP
 *    Params: to - recipient email, subject - email subject, html - email body
 *    Returns: message info on success, logs error on failure
 */
async function sendMailNodemailer({ to, subject, html }: NodemailerMailProps) {
  try {
    const info = await transporter.sendMail({
      from: `"Tube Pay" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ [Nodemailer] Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ [Nodemailer] Error sending email:", error);
    return null;
  }
}

export { transporter, sendMailNodemailer };
