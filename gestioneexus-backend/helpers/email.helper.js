const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (userEmail, token) => {
    try {
        // --- CORRECCIÓN: Configuración para un servicio de correo real (ej. Gmail) ---
        // Estas credenciales se leerán desde las variables de entorno en Render.
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // true para el puerto 465
            auth: {
                user: process.env.EMAIL_USER, // Tu correo de envío
                pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación
            },
        });

        // --- CORRECCIÓN: Se usa una variable de entorno para la URL del frontend ---
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

        await transporter.sendMail(mailOptions);
        console.log(`Correo de recuperación enviado a: ${userEmail}`);

    } catch (error) {
        console.error('Error al enviar el correo de recuperación:', error);
        throw new Error('No se pudo enviar el correo de recuperación.');
    }
};

module.exports = { 
    sendPasswordResetEmail 
};