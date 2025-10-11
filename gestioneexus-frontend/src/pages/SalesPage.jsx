import React, { useState, useEffect, useContext } from 'react'; // 1. Importamos useContext
import { AuthContext } from '../context/AuthContext'; // 2. Importamos el AuthContext
import api from '../api/api';
import Swal from 'sweetalert2';
import Modal from '../components/Modal';

const SalesPage = () => {
    // 3. Obtenemos la función para verificar notificaciones desde el contexto
    const { checkNotificationStatus } = useContext(AuthContext);

    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [subtotal, setSubtotal] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [total, setTotal] = useState(0);
    const [amountGiven, setAmountGiven] = useState('');
    const [change, setChange] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [variantOptions, setVariantOptions] = useState([]);
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

    useEffect(() => {
        const newSubtotal = cart.reduce((sum, item) => sum + parseFloat(item.total), 0);
        setSubtotal(newSubtotal);
    }, [cart]);

    useEffect(() => {
        const discountValue = parseFloat(discount) || 0;
        const discountAmount = subtotal * (discountValue / 100);
        const newTotal = subtotal - discountAmount;
        setTotal(newTotal);
    }, [subtotal, discount]);

    useEffect(() => {
        const given = parseFloat(amountGiven);
        if (!isNaN(given) && given >= total) {
            setChange(given - total);
        } else {
            setChange(0);
        }
    }, [amountGiven, total]);

    const addProductToCart = (product) => {
        if (product.quantity < 1) {
            Swal.fire('Sin Stock', 'Este producto no tiene unidades disponibles.', 'warning');
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            const newCart = [...cart];
            const currentItem = newCart[existingItemIndex];

            if (currentItem.quantity + 1 > product.quantity) {
                Swal.fire('Stock Insuficiente', `No puedes agregar más unidades de ${product.name} (Talla: ${product.sizes}). Stock disponible: ${product.quantity}`, 'warning');
                return;
            }

            currentItem.quantity += 1;
            currentItem.total = currentItem.quantity * parseFloat(currentItem.price);
            setCart(newCart);
        } else {
            setCart([...cart, { 
                ...product, 
                price: parseFloat(product.price),
                quantity: 1, 
                total: parseFloat(product.price)
            }]);
        }
        setSearchTerm('');
    };

    const handleSearchAndAdd = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        try {
            const { data } = await api.get(`/products/reference/${searchTerm.trim()}`);
            
            if (Array.isArray(data)) {
                if (data.length === 1) {
                    addProductToCart(data[0]);
                } else {
                    setVariantOptions(data);
                    setIsVariantModalOpen(true);
                }
            } else {
                addProductToCart(data);
            }

        } catch (error) {
            Swal.fire('Error', error.response?.data?.msg || 'Producto no encontrado.', 'error');
        }
    };

    const handleVariantSelect = (variant) => {
        addProductToCart(variant);
        setIsVariantModalOpen(false);
        setVariantOptions([]);
    };

    const removeItemFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const handlePay = async () => {
        if (cart.length === 0) {
            Swal.fire('Carrito Vacío', 'Agrega productos antes de pagar.', 'warning');
            return;
        }
        const given = parseFloat(amountGiven);
        if (isNaN(given) || given < total) {
            Swal.fire({ icon: 'error', title: 'Monto Insuficiente', text: 'El monto dado por el cliente debe ser mayor o igual al total de la venta.', confirmButtonColor: '#5D1227' });
            return;
        }

        setIsSubmitting(true);
        const saleData = {
            total_amount: subtotal,
            discount: discount,
            products: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
            }))
        };
        
        try {
            await api.post('/sales', saleData);
            Swal.fire('¡Venta Exitosa!', 'La venta se ha registrado correctamente.', 'success');
            setCart([]);
            setAmountGiven('');
            setDiscount(0);

            // --- 4. CORRECCIÓN AQUÍ: Verificamos si hay nuevas notificaciones ---
            checkNotificationStatus();

        } catch (error) {
            console.error(error);
            Swal.fire('Error', error.response?.data?.msg || 'No se pudo registrar la venta.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800">Punto de Venta</h1>

                <form onSubmit={handleSearchAndAdd} className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <label htmlFor="search" className="font-semibold text-gray-700">Cod/Ref:</label>
                    <input
                        id="search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227]"
                        placeholder="Escanea o digita la referencia y presiona Enter"
                    />
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Añadir</button>
                </form>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto min-h-[200px]">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Artículo</th>
                                <th className="px-6 py-3 text-center">Cantidad</th>
                                <th className="px-6 py-3">Valor Unitario</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.length > 0 ? cart.map(item => (
                                <tr key={item.id} className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.name} ({item.sizes})</td>
                                    <td className="px-6 py-4 text-center">{item.quantity}</td>
                                    <td className="px-6 py-4">{formatCurrency(item.price)}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(item.total)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 font-bold">Quitar</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">El carrito de compras está vacío.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-lg flex flex-wrap justify-around items-center text-center gap-4">
                        <div>
                            <p className="text-gray-500">Subtotal</p>
                            <p className="text-2xl font-bold text-gray-500">{formatCurrency(subtotal)}</p>
                        </div>
                        <div>
                            <label className="text-gray-500">Descuento (%)</label>
                            <input 
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-24 p-1 text-2xl font-bold border-b-2 text-center focus:outline-none"
                                placeholder="0"
                                min="0"
                                max="100"
                            />
                        </div>
                        <div>
                            <p className="text-gray-500">Monto Total</p>
                            <p className="text-4xl font-bold text-[#5D1227]">{formatCurrency(total)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Devolver</p>
                            <p className="text-4xl font-bold text-green-600">{formatCurrency(change)}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
                        <div>
                            <label htmlFor="amountGiven" className="text-gray-500 mb-2 block">Monto Dado por Cliente</label>
                            <input 
                                id="amountGiven"
                                type="number"
                                value={amountGiven}
                                onChange={(e) => setAmountGiven(e.target.value)}
                                className="w-full p-2 text-2xl font-bold border-b-2 focus:outline-none text-center"
                                placeholder="0"
                            />
                        </div>
                        <button onClick={handlePay} disabled={isSubmitting} className="w-full mt-4 py-3 bg-[#16A34A] text-white font-bold text-xl rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400">
                            {isSubmitting ? 'Procesando...' : 'PAGAR'}
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isVariantModalOpen}
                onClose={() => setIsVariantModalOpen(false)}
                title={`Selecciona una Talla para "${variantOptions[0]?.name}"`}
            >
                <div className="space-y-3">
                    <p>Este producto está disponible en varias tallas. Por favor, elige cuál deseas agregar a la venta.</p>
                    <div className="flex flex-col space-y-2 pt-4">
                        {variantOptions.map(variant => (
                            <button
                                key={variant.id}
                                onClick={() => handleVariantSelect(variant)}
                                disabled={variant.quantity === 0}
                                className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-red-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Talla: {variant.sizes}</span>
                                    <span className={`text-sm ${variant.quantity > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                                        Stock: {variant.quantity}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default SalesPage;