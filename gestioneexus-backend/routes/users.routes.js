const { Router } = require('express');
const { check, body } = require('express-validator');
const multer = require('multer');

// --- CORRECCIÓN: Se importa el 'storage' de Cloudinary y se elimina 'path' ---
const { storage } = require('../helpers/cloudinary.config');

const { getUsers, createUser, updateUser, deleteUser, activateUser, updatePassword, uploadProfilePhoto } = require('../controllers/users.controller');
const { validateJWT } = require('../middlewares/validate-jwt');
const { isAdminRole } = require('../middlewares/validate-roles');
const { validateFields } = require('../middlewares/validate-fields');

const router = Router();

// --- CORRECCIÓN: Multer ahora usa el storage de Cloudinary en lugar del disco local ---
const upload = multer({ storage });

// Se aplica el middleware de JWT a todas las rutas de este archivo
router.use(validateJWT);

// La ruta de subida de fotos ahora enviará los archivos directamente a Cloudinary
router.post('/upload-photo', upload.single('profile_photo'), uploadProfilePhoto);

// Definición de validaciones de contraseña para reutilizar
const passwordValidationMsg = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un caracter especial.';
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{8,}$/;

// Las demás rutas permanecen sin cambios
router.put('/update-password', [
    check('oldPassword', 'La contraseña actual es obligatoria').not().isEmpty(),
    check('newPassword').matches(passwordRegex).withMessage(passwordValidationMsg),
    validateFields
], updatePassword);

router.get('/', isAdminRole, getUsers);

router.post('/', [
    isAdminRole, 
    check('full_name').not().isEmpty(), 
    check('username').not().isEmpty(), 
    check('email').isEmail(), 
    check('role_id').isInt(), 
    check('password').matches(passwordRegex).withMessage(passwordValidationMsg), 
    validateFields
], createUser);

router.put('/activate/:id', isAdminRole, activateUser);

router.put('/:id', [
    isAdminRole, 
    body('password').if(body('password').exists({ checkFalsy: true })).matches(passwordRegex).withMessage(passwordValidationMsg), 
    validateFields
], updateUser);

router.delete('/:id', isAdminRole, deleteUser);

module.exports = router;