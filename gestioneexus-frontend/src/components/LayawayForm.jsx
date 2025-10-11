import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

// Pequeño componente interno para manejar la selección de productos
const ProductSelector = ({ products, onAdd }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [quantity, setQuantity] = useState(1);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAddClick = () => {
        if (!selectedId) {
            Swal.fire({ title: 'Atención', text: 'Debes seleccionar un producto de la lista.', icon: 'warning', confirmButtonColor: '#5D1227' });
            return;
        }
        const product = products.find(p => p.id === parseInt(selectedId));
        onAdd(product, quantity);
        setSelectedId('');
        setQuantity(1);
        setSearchTerm('');
    };

    return (
        <div className="space-y-2">
            <input 
                type="text"
                placeholder="Buscar producto por nombre o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-2">
                <select onChange={(e) => setSelectedId(e.target.value)} value={selectedId} className="flex-grow p-2 border border-gray-300 rounded-md h-9 text-sm">
                    <option value="">-- Selecciona un producto --</option>
                    {/* --- CORRECCIÓN AQUÍ: Se añade la talla (p.sizes) al texto de la opción --- */}
                    {filteredProducts.map(p => 
                        <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                            {p.name} - Talla: {p.sizes} (Stock: {p.quantity})
                        </option>
                    )}
                </select>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="w-full md:w-20 p-2 border border-gray-300 rounded-md h-9 text-sm" />
                <button type="button" onClick={handleAddClick} className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 h-9 flex-shrink-0 text-sm">Añadir</button>
            </div>
        </div>
    );
};


const LayawayForm = ({ onPlanAdded, closeModal }) => {
    const [customerData, setCustomerData] = useState({
        customer_name: '',
        customer_id_doc: '',
        customer_contact: '',
        down_payment: '',
        deadline: '',
    });
    const [availableProducts, setAvailableProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await api.get('/products', { params: { limit: 1000 }});
                setAvailableProducts(data.products);
            } catch (error) { console.error("No se pudieron cargar los productos", error); }
        };
        fetchProducts();
    }, []);

    const handleCustomerChange = (e) => {
        const { name, value } = e.target;
        if (name === 'customer_id_doc' || name === 'customer_contact' || name === 'down_payment') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setCustomerData(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setCustomerData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const addProductToPlan = (product, quantity) => {
        if (!product || !quantity || quantity <= 0) {
            Swal.fire({ title: 'Atención', text: 'Por favor, selecciona un producto y una cantidad válida.', icon: 'warning' });
            return;
        }
        if (selectedProducts.find(p => p.product_id === product.id)) {
            Swal.fire({ title: 'Atención', text: 'Este producto ya ha sido añadido al plan.', icon: 'warning' });
            return;
        }
        setSelectedProducts(prev => [...prev, {
            product_id: product.id, name: product.name,
            quantity: parseInt(quantity), price: product.price,
        }]);
    };

    const removeProductFromPlan = (productId) => {
        setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
    };

    const totalValue = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedProducts.length === 0) {
            Swal.fire('Error', 'Debes agregar al menos un producto al plan.', 'error');
            return;
        }
        const downPayment = parseFloat(customerData.down_payment);
        if (downPayment > totalValue) {
            Swal.fire('Error', 'El abono inicial no puede ser mayor que el valor total del plan.', 'error');
            return;
        }

        const finalPlanData = {
            ...customerData,
            total_value: totalValue,
            products: selectedProducts.map(p => ({ product_id: p.product_id, quantity: p.quantity })),
        };
        
        try {
            const { data } = await api.post('/layaway', finalPlanData);
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Plan Separe creado correctamente.'});
            onPlanAdded(data);
            closeModal();
        } catch (error) {
            console.error("Error al crear el plan separe:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.msg || 'No se pudo crear el plan.' });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <fieldset className="border p-3 rounded-lg">
                <legend className="text-base font-semibold px-2 text-gray-700">Datos del Cliente</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input name="customer_name" placeholder="Nombre Completo" value={customerData.customer_name} onChange={handleCustomerChange} required className="p-2 border rounded-md" />
                    <input name="customer_contact" placeholder="Contacto (Teléfono)" value={customerData.customer_contact} onChange={handleCustomerChange} required className="p-2 border rounded-md" inputMode="numeric" pattern="[0-9]*" />
                    <input name="customer_id_doc" placeholder="Cédula (Opcional)" value={customerData.customer_id_doc} onChange={handleCustomerChange} className="p-2 border rounded-md" inputMode="numeric" pattern="[0-9]*" />
                    <div>
                        <label className="text-xs text-gray-600 ml-1">Fecha Límite</label>
                        <input name="deadline" type="date" value={customerData.deadline} onChange={handleCustomerChange} required className="w-full p-2 border rounded-md" />
                    </div>
                </div>
            </fieldset>

            <fieldset className="border p-3 rounded-lg">
                <legend className="text-base font-semibold px-2 text-gray-700">Productos a Separar</legend>
                <ProductSelector products={availableProducts} onAdd={addProductToPlan} />
                <div className="mt-3 max-h-32 overflow-y-auto space-y-2">
                    {selectedProducts.map(p => (
                        <div key={p.product_id} className="flex justify-between items-center bg-gray-100 p-2 rounded-md text-xs">
                            <span>{p.name} (x{p.quantity}) - {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.price * p.quantity)}</span>
                            <button type="button" onClick={() => removeProductFromPlan(p.product_id)} className="text-red-500 font-bold hover:text-red-700 px-2">X</button>
                        </div>
                    ))}
                </div>
            </fieldset>

            <fieldset className="border p-3 rounded-lg">
                 <legend className="text-base font-semibold px-2 text-gray-700">Resumen Financiero</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                     <input name="down_payment" placeholder="Abono Inicial" type="number" value={customerData.down_payment} onChange={handleCustomerChange} required className="p-2 border rounded-md" min="0" />
                     <div className="text-left md:text-right">
                         <p className="text-xs text-gray-600">Valor Total del Apartado:</p>
                         <p className="text-xl font-bold text-gray-800">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalValue)}</p>
                     </div>
                 </div>
            </fieldset>

            <div className="flex justify-end pt-3 border-t mt-4">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold text-sm">Crear Plan</button>
            </div>
        </form>
    );
};

export default LayawayForm;