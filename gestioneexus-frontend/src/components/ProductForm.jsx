import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const FormField = ({ label, name, type = 'text', value, onChange, required = false, disabled = false, placeholder = '' }) => (
    <div>
        <label htmlFor={name} className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
        <input 
            id={name} 
            type={type} 
            name={name} 
            value={value} 
            onChange={onChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227] disabled:bg-gray-200" 
            required={required} 
            disabled={disabled}
            min={type === 'number' ? '0' : undefined}
            step={name === 'quantity' ? '1' : '0.01'}
            placeholder={placeholder}
        />
    </div>
);

const ProductForm = ({ onProductAdded, onProductUpdated, closeModal, productToEdit }) => {
    const [formData, setFormData] = useState({
        name: '', reference: '', category: '', sizes: '',
        brand: '', quantity: '', price: '', cost: ''
    });
    const [brands, setBrands] = useState([]);
    const [showNewBrandInput, setShowNewBrandInput] = useState(false);
    const [newBrand, setNewBrand] = useState('');

    const isEditing = !!productToEdit;

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const { data } = await api.get('/products/brands');
                setBrands(data);
            } catch (error) {
                console.error("No se pudieron cargar las marcas", error);
            }
        };
        fetchBrands();
    }, []);

    useEffect(() => {
        if (isEditing && productToEdit) {
            setFormData({
                name: productToEdit.name,
                reference: productToEdit.reference || '',
                category: productToEdit.category || '',
                sizes: productToEdit.sizes || '',
                brand: productToEdit.brand || '',
                quantity: productToEdit.quantity,
                price: productToEdit.price,
                cost: productToEdit.cost || ''
            });
            if (productToEdit.brand && !brands.includes(productToEdit.brand)) {
                setShowNewBrandInput(true);
                setNewBrand(productToEdit.brand);
            }
        } else {
            setFormData({
                name: '', reference: '', category: '', sizes: '',
                brand: '', quantity: '', price: '', cost: ''
            });
            setShowNewBrandInput(false);
            setNewBrand('');
        }
    }, [productToEdit, isEditing, brands]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'brand') {
            if (value === 'add_new') {
                setShowNewBrandInput(true);
                setFormData(prevState => ({ ...prevState, brand: '' }));
            } else {
                setShowNewBrandInput(false);
                setNewBrand('');
                setFormData(prevState => ({ ...prevState, [name]: value }));
            }
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const finalBrand = showNewBrandInput ? newBrand.trim() : formData.brand;

        if (!finalBrand) {
             Swal.fire('Error', 'Debes seleccionar o agregar una marca.', 'error');
             return;
        }

        const submissionData = { ...formData, brand: finalBrand };

        try {
            if (isEditing) {
                const { data: updatedProduct } = await api.put(`/products/${productToEdit.id}`, submissionData);
                Swal.fire('¡Éxito!', 'Producto actualizado correctamente.', 'success');
                onProductUpdated(updatedProduct);
            } else {
                const { data: newProduct } = await api.post('/products', submissionData);
                Swal.fire('¡Éxito!', 'Producto agregado correctamente.', 'success');
                onProductAdded(newProduct);
            }
            closeModal();
        } catch (error) {
            const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Ocurrió un error.';
            Swal.fire('Error', errorMsg, 'error');
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre del Producto" name="name" value={formData.name} onChange={handleChange} required />
                
                <div>
                    <label htmlFor="brand" className="block mb-1 text-sm font-medium text-gray-700">Marca</label>
                    <select
                        id="brand"
                        name="brand"
                        value={showNewBrandInput ? 'add_new' : formData.brand}
                        onChange={handleChange}
                        required={!showNewBrandInput}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227]"
                    >
                        <option value="">Seleccione una marca</option>
                        {brands.map((brandName, index) => (
                            <option key={index} value={brandName}>{brandName}</option>
                        ))}
                        <option value="add_new" className="font-bold text-blue-600">-- Agregar nueva marca... --</option>
                    </select>
                </div>
                
                {showNewBrandInput && (
                    <div className="md:col-span-2">
                        <FormField 
                            label="Nombre de la Nueva Marca" 
                            name="newBrand" 
                            value={newBrand} 
                            onChange={(e) => setNewBrand(e.target.value)} 
                            required 
                            placeholder="Escribe el nombre de la nueva marca"
                        />
                    </div>
                )}

                <FormField label="Referencia" name="reference" value={formData.reference} onChange={handleChange} />
                <div>
                    <label htmlFor="category" className="block mb-1 text-sm font-medium text-gray-700">Categoría</label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D1227]"
                    >
                        <option value="">Seleccione una categoría</option>
                        <option value="Hombre">Hombre</option>
                        <option value="Mujer">Mujer</option>
                        <option value="Niño">Niño</option>
                        <option value="Niña">Niña</option>
                        <option value="Unisex">Unisex</option>
                    </select>
                </div>
                <FormField label="Talla" name="sizes" value={formData.sizes} onChange={handleChange} placeholder="Ej: S, M, L, 32, 34..." />
                <FormField label="Cantidad" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
                
                <FormField label="Costo (Compra)" name="cost" type="number" value={formData.cost} onChange={handleChange} required />
                <FormField label="Precio (Venta)" name="price" type="number" value={formData.price} onChange={handleChange} required />
            </div>
            <div className="flex justify-end pt-4 border-t mt-6">
                <button type="button" onClick={closeModal} className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-green-700 font-semibold">
                    {isEditing ? 'Guardar Cambios' : 'Agregar Producto'}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;