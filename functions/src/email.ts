import * as nodemailer from 'nodemailer';

/**
 * Envia un correo electrónico transaccional.
 *
 * Si existen las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS,
 * utilizará el servidor SMTP de producción. De lo contrario, creará una
 * cuenta de prueba en Ethereal Mail y mostrará un enlace para previsualizar el correo.
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  let transporter;

  if (host && user && pass) {
    // Configuración SMTP Real
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // Mock / Ethereal Mail para desarrollo local
    console.log(
      'No se encontraron credenciales SMTP en el entorno. Generando cuenta de pruebas en Ethereal...'
    );
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error(
        'Error al crear cuenta Ethereal, imprimiendo correo en consola:',
        err
      );
      console.log(
        `\n=== CORREO ENVIADO (CONSOLA) ===\nPARA: ${to}\nASUNTO: ${subject}\nCONTENIDO:\n${html}\n================================\n`
      );
      return;
    }
  }

  const mailOptions = {
    from: '"Educar para Transformar" <noreply@educar-para-transformar.com>',
    to,
    subject,
    html,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Correo enviado con ID: ${info.messageId}`);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Ver previsualización en: ${previewUrl}`);
  }
}
