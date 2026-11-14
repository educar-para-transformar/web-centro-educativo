import * as nodemailer from 'nodemailer';

type Attachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
};

const DEFAULT_FROM =
  '"Educar para Transformar" <noreply@educar-para-transformar.com>';

function createProductionTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number.parseInt(process.env.SMTP_PORT, 10)
    : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function createDevelopmentTransport() {
  console.log(
    'SMTP no configurado. Generando cuenta de pruebas en Ethereal...'
  );

  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailInput) {
  let transporter = createProductionTransport();

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        `SMTP no configurado; correo omitido. Para: ${to}. Asunto: ${subject}`
      );
      return;
    }

    try {
      transporter = await createDevelopmentTransport();
    } catch (error) {
      console.error(
        'No se pudo crear la cuenta Ethereal; correo impreso en consola:',
        error
      );
      console.log(
        `\n=== CORREO NO ENVIADO ===\nPARA: ${to}\nASUNTO: ${subject}\nCONTENIDO:\n${html}\n==========================\n`
      );
      return;
    }
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? DEFAULT_FROM,
    to,
    subject,
    html,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  });

  console.log(`Correo enviado con ID: ${info.messageId}`);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Ver previsualización en: ${previewUrl}`);
  }
}
