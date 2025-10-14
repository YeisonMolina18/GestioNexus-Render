const pool = require('../db/database');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');
const { logAction } = require('../helpers/audit.helper');

const getUsers = async (req, res) => {
    const { search = '' } = req.query;
    try {
        const searchTerm = `%${search}%`;
        // --- CORRECCIÓN: Se usan $1, $2, $3 y se desestructura { rows } ---
        const { rows } = await pool.query(
            `SELECT u.id, u.full_name, u.username, u.email, u.is_active, u.profile_picture_url, r.name as role 
             FROM users u 
             JOIN roles r ON u.role_id = r.id
             WHERE u.full_name ILIKE $1 OR u.username ILIKE $2 OR u.email ILIKE $3`, // ILIKE es insensible a mayúsculas en Postgres
            [searchTerm, searchTerm, searchTerm]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ msg: "Error al obtener los usuarios" });
    }
};

const createUser = async (req, res) => {
    const { uid } = req;
    const { full_name, username, email, password, role_id } = req.body;
    try {
        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(password, salt);
        // --- CORRECCIÓN: Se usan placeholders $1, $2, etc. y RETURNING id ---
        const result = await pool.query(
            'INSERT INTO users (full_name, username, email, password, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [full_name, username, email, hashedPassword, role_id]
        );
        
        const newUserId = result.rows[0].id; // Obtenemos el ID del resultado

        const { rows: newUserRows } = await pool.query('SELECT u.id, u.full_name, u.username, u.email, u.is_active, u.profile_picture_url, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [newUserId]);
        
        await logAction(uid, `Creó el usuario '${full_name}' (ID: ${newUserId})`);
        res.status(201).json(newUserRows[0]);
    } catch (error) {
        console.error("Error creating user:", error);
        // --- CORRECCIÓN: El código de error de duplicado en Postgres es '23505' ---
        if (error.code === '23505') { // 23505 es unique_violation
            return res.status(400).json({ msg: 'El correo o nombre de usuario ya existe.' });
        }
        res.status(500).json({ msg: 'Error al crear el usuario' });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { uid } = req;
    try {
        // --- CORRECCIÓN: Todas las queries usan ahora placeholders de PostgreSQL ---
        if (uid === parseInt(id)) {
            const { full_name, username, email, password } = req.body;
            if (password && password.trim().length > 0) {
                const salt = bcrypt.genSaltSync();
                const hashedPassword = bcrypt.hashSync(password.trim(), salt);
                await pool.query(
                    'UPDATE users SET full_name = $1, username = $2, email = $3, password = $4 WHERE id = $5',
                    [full_name, username, email, hashedPassword, id]
                );
            } else {
                await pool.query(
                    'UPDATE users SET full_name = $1, username = $2, email = $3 WHERE id = $4',
                    [full_name, username, email, id]
                );
            }
        } else {
            const { full_name, username, email, role_id, password } = req.body;
            if (password && password.trim().length > 0) {
                const salt = bcrypt.genSaltSync();
                const hashedPassword = bcrypt.hashSync(password.trim(), salt);
                await pool.query(
                    'UPDATE users SET full_name = $1, username = $2, email = $3, role_id = $4, password = $5 WHERE id = $6',
                    [full_name, username, email, role_id, hashedPassword, id]
                );
            } else {
                await pool.query(
                    'UPDATE users SET full_name = $1, username = $2, email = $3, role_id = $4 WHERE id = $5',
                    [full_name, username, email, role_id, id]
                );
            }
        }
        const { rows } = await pool.query('SELECT u.id, u.full_name, u.username, u.email, u.is_active, u.profile_picture_url, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [id]);
        await logAction(req.uid, `Actualizó al usuario con ID: ${id}`);
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ msg: 'Error al actualizar el usuario' });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { uid } = req;
    if (uid === parseInt(id)) {
        return res.status(400).json({ msg: 'Acción no permitida: No puedes desactivarte a ti mismo.' });
    }
    try {
        // --- CORRECCIÓN ---
        await pool.query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);
        const { rows } = await pool.query('SELECT u.id, u.full_name, u.username, u.email, u.is_active, u.profile_picture_url, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [id]);
        await logAction(uid, `Desactivó al usuario con ID: ${id}`);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Error al desactivar el usuario' });
    }
};

const activateUser = async (req, res) => {
    const { id } = req.params;
    const { uid } = req;
    try {
        // --- CORRECCIÓN ---
        await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [id]);
        const { rows } = await pool.query('SELECT u.id, u.full_name, u.username, u.email, u.is_active, u.profile_picture_url, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [id]);
        await logAction(uid, `Activó al usuario con ID: ${id}`);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Error al activar el usuario' });
    }
};

const updatePassword = async (req, res) => {
    const { uid } = req;
    const { oldPassword, newPassword } = req.body;
    try {
        // --- CORRECCIÓN ---
        const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [uid]);
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
        const isPasswordCorrect = bcrypt.compareSync(oldPassword.trim(), user.password.trim());
        if (!isPasswordCorrect) {
            return res.status(400).json({ msg: 'La contraseña actual es incorrecta.' });
        }
        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(newPassword, salt);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, uid]);
        await logAction(uid, 'Actualizó su propia contraseña.');
        res.json({ msg: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const uploadProfilePhoto = async (req, res) => {
    const { uid } = req;
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No se ha subido ningún archivo.' });
        }
        
        // --- CORRECCIÓN ---
        const { rows } = await pool.query('SELECT profile_picture_url FROM users WHERE id = $1', [uid]);
        const user = rows[0];

        if (user && user.profile_picture_url) {
            const oldImagePath = path.join(__dirname, '../public', user.profile_picture_url);
            if (await fs.pathExists(oldImagePath)) {
                await fs.unlink(oldImagePath);
                console.log(`Imagen antigua eliminada: ${oldImagePath}`);
            }
        }
        
        const newPhotoUrl = `/uploads/profiles/${req.file.filename}`;
        await pool.query('UPDATE users SET profile_picture_url = $1 WHERE id = $2', [newPhotoUrl, uid]);
        
        await logAction(uid, 'Actualizó su foto de perfil.');
        res.json({
            msg: 'Foto de perfil actualizada exitosamente.',
            profilePictureUrl: newPhotoUrl,
        });
    } catch (error) {
        console.error("Error al subir la foto:", error);
        res.status(500).json({ msg: 'Error al subir la foto de perfil' });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    updatePassword,
    uploadProfilePhoto
};