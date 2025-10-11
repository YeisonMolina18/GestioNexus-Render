const { Router } = require('express');
const { check } = require('express-validator');
const { createSale, getSales, getSaleById } = require('../controllers/sales.controller');
const { validateJWT } = require('../middlewares/validate-jwt');
const { validateFields } = require('../middlewares/validate-fields');

const router = Router();

router.use(validateJWT);

router.get('/', getSales);
router.get('/:id', getSaleById); // <-- RUTA NUEVA AÑADIDA

router.post('/', [
    check('total_amount', 'El monto total es obligatorio').isNumeric(),
    check('products', 'La lista de productos no puede estar vacía').isArray({ min: 1 }),
    check('products.*.product_id', 'El ID del producto es obligatorio').isInt(),
    check('products.*.quantity', 'La cantidad del producto debe ser un entero positivo').isInt({ gt: 0 }),
    check('products.*.unit_price', 'El precio unitario es obligatorio').isNumeric(),
    validateFields
], createSale);

module.exports = router;