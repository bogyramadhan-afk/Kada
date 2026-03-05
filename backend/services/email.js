import nodemailer from 'nodemailer';

function smtpReady() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Jika SMTP belum ada, aplikasi tetap jalan dan isi email hanya dicetak.
export async function sendMessageCopy({ to, subject, text }) {
  if (!smtpReady()) {
    console.log('SMTP belum dikonfigurasi. Email dicatat ke console.');
    console.log({ to, subject, text });
    return { logged: true };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });

  return { logged: false };
}

export async function sendWelcomeEmail({ to, name }) {
  const safeName = String(name || 'Pengguna');
  const subject = 'Selamat datang di KADA';
  const text = `Halo ${safeName},\n\nAkun kamu berhasil dibuat. Selamat datang di KADA.\n\nSalam,\nTim KADA`;

  if (!smtpReady()) {
    console.log('SMTP belum dikonfigurasi. Email welcome dicatat ke console.');
    console.log({ to, subject, text });
    return { logged: true };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });

  return { logged: false };
}
