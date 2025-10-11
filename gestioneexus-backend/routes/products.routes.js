const { Router } = require('express');
const { check } = require('express-validator');

const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductByReference, bulkImportProducts, getUniqueBrands } = require('../controllers/products.controller');
const { validateJWT } = require('../middlewares/validate-jwt');
const { isAdminRole } = require('../middlewares/validate-roles');
const { validateFields } = require('../middlewares/validate-fields');

const router = Router();

router.use(validateJWT);

// --- NUEVA RUTA PARA OBTENER MARCAS ---
// La colocamos aquí para que sea accesible por todos los usuarios logueados
router.get('/brands', getUniqueBrands);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/reference/:ref', getProductByReference);

const productValidations = [
    check('name', 'El nombre del producto es obligatorio').not().isEmpty(),
    check('quantity', 'La cantidad debe ser un número entero igual o mayor a 0').isInt({ min: 0 }),
    check('price', 'El precio debe ser un número igual o mayor a 0').isFloat({ min: 0 }),
    check('cost', 'El costo debe ser un número igual o mayor a 0').isFloat({ min: 0 })
];

router.post('/', [ isAdminRole, ...productValidations, validateFields ], createProduct);

router.put('/:id', [ isAdminRole, ...productValidations, validateFields ], updateProduct);

router.delete('/:id', isAdminRole, deleteProduct);

router.post('/bulk-import', [ isAdminRole, validateFields ], bulkImportProducts);

module.exports = router;
