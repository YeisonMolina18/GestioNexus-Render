const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db/database');
const { generateJWT } = require('../helpers/jwt.helper');
const { sendPasswordResetEmail } = require('../helpers/email.helper');
const { logAction } = require('../helpers/audit.helper');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { rows } = await pool.query('SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1', [email]);
        const user = rows[0];

        if (!user) { return res.status(400).json({ msg: 'Usuario o contraseña incorrectos' }); }
        if (!user.is_active) { return res.status(400).json({ msg: 'El usuario está desactivado' }); }
        
        const validPassword = bcrypt.compareSync(password.trim(), user.password.trim());
        if (!validPassword) { return res.status(400).json({ msg: 'Usuario o contraseña incorrectos' }); }

        const token = await generateJWT(user.id, user.full_name, user.role_name);
        await logAction(user.id, 'Inició sesión.');
        res.json({
            ok: true,
            user: {
                id: user.id,
                fullName: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role_name,
                profilePictureUrl: user.profile_picture_url
            },
            token
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

const renewToken = async (req, res) => {
    const { uid, name, role } = req;
    const token = await generateJWT(uid, name, role);

    const { rows } = await pool.query(
        'SELECT u.id, u.full_name, u.username, u.email, u.profile_picture_url, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', 
        [uid]
    );
    const user = rows[0];

    res.json({
        ok: true,
        token,
        user: { 
            id: uid, 
            name: user.full_name,
            fullName: user.full_name,
            username: user.username,
            email: user.email,
            role: user.role_name,
            profilePictureUrl: user.profile_picture_url
        }
    });
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
        const user = rows[0];

        // --- ¡AQUÍ ESTÁ EL CAMBIO! ---
        // Ahora, si el usuario no existe, se enviará un error 404 claro al frontend.
        if (!user) {
            return res.status(404).json({ msg: 'Este correo no está registrado en el sistema.' });
        }

        // Si el usuario sí existe, se continúa con el proceso.
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        
        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
            [token, expires, user.id]
        );
        
        await sendPasswordResetEmail(user.email, token);
        
        // Se envía un mensaje de éxito genérico al frontend.
        res.json({ msg: 'Se ha procesado la solicitud de recuperación.' });

    } catch (error) {
        console.error("Error en forgotPassword:", error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
        const user = rows[0];
        
        if (!user) {
            return res.status(400).json({ msg: 'El token de recuperación es inválido o ha expirado.' });
        }
        
        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(password, salt);
        
        await pool.query('UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hashedPassword, user.id]);
        
        await logAction(user.id, `Restableció su contraseña mediante recuperación.`);
        res.json({ msg: 'Tu contraseña ha sido actualizada exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al restablecer la contraseña' });
    }
};

module.exports = { 
    login, 
    renewToken, 
    forgotPassword, 
    resetPassword 
};