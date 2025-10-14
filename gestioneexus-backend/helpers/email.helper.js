const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (userEmail, token) => {
    try {
        // --- INICIO DE DIAGNÓSTICO ---
        // Vamos a imprimir las variables en los logs de Render para asegurarnos de que se están leyendo bien.
        console.log('--- Intentando enviar correo ---');
        console.log('Usuario de correo leído desde variables:', process.env.EMAIL_USER);
        // No imprimimos la contraseña por seguridad, pero si el usuario está mal, la contraseña también lo estará.
        // --- FIN DE DIAGNÓSTICO ---

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // --- OPCIÓN DE DEPURACIÓN ---
            // Esto nos dará logs más detallados del intento de conexión.
            logger: true,
            debug: true 
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        const mailOptions = {
            from: `"GestioNexus" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Recuperación de Contraseña',
            html: `
                <h1>Recuperación de Contraseña</h1>
                <p>Has solicitado restablecer tu contraseña.</p>
                <p>Haz clic en el siguiente enlace para continuar (expira en 15 minutos):</p>
                <a href="${resetLink}" style="background-color: #5D1227; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Restablecer Contraseña
                </a>
            `,
        };

        console.log('Enviando correo a:', userEmail);
        await transporter.sendMail(mailOptions);
        console.log(`Correo de recuperación enviado exitosamente a: ${userEmail}`);

    } catch (error) {
        console.error('Error detallado al enviar el correo de recuperación:', error);
        throw new Error('No se pudo enviar el correo de recuperación.');
    }
};

module.exports = { 
    sendPasswordResetEmail 
};