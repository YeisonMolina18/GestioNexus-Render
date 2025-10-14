// No necesitamos la librería nodemailer para esta solución.

const sendPasswordResetEmail = async (userEmail, token) => {
    try {
        // CORRECCIÓN: Aseguramos que la URL del frontend se lea desde las variables de entorno.
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        // ¡AQUÍ ESTÁ LA SOLUCIÓN!
        // En lugar de enviar un correo, imprimimos el link directamente en los logs de Render.
        // Los asteriscos son para que puedas encontrarlo fácilmente.
        console.log('*************************************************');
        console.log('** LINK DE RECUPERACIÓN DE CONTRASEÑA GENERADO **');
        console.log(`** Usuario: ${userEmail}`);
        console.log(`** Link: ${resetLink}`);
        console.log('*************************************************');

        // La función termina aquí, sin intentar conectarse a ningún servidor de correo.

    } catch (error) {
        console.error('Error al generar el link de recuperación (no se envió correo):', error);
        // Este error solo ocurriría si process.env.FRONTEND_URL no está definido.
        throw new Error('No se pudo generar el link de recuperación.');
    }
};

module.exports = { 
    sendPasswordResetEmail 
};