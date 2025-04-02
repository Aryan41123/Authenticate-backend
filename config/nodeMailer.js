import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.SMTP_USER,  // The correct SMTP username (could be your email or API key)
        pass: process.env.SMTP_PASS,  // The correct SMTP password or API key
    },
   
});

export default transporter;
