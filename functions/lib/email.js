"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer = __importStar(require("nodemailer"));
/**
 * Envia un correo electrónico transaccional.
 *
 * Si existen las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS,
 * utilizará el servidor SMTP de producción. De lo contrario, creará una
 * cuenta de prueba en Ethereal Mail y mostrará un enlace para previsualizar el correo.
 */
async function sendEmail({ to, subject, html, attachments, }) {
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
            auth: { user, pass }
        });
    }
    else {
        // Mock / Ethereal Mail para desarrollo local
        console.log('No se encontraron credenciales SMTP en el entorno. Generando cuenta de pruebas en Ethereal...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        }
        catch (err) {
            console.error('Error al crear cuenta Ethereal, imprimiendo correo en consola:', err);
            console.log(`\n=== CORREO ENVIADO (CONSOLA) ===\nPARA: ${to}\nASUNTO: ${subject}\nCONTENIDO:\n${html}\n================================\n`);
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
//# sourceMappingURL=email.js.map