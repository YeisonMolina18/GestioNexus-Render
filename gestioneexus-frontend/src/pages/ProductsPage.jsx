import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/api';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import Pagination from '../components/Pagination';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const ProductsPage = () => {
    const { searchTerm } = useOutletContext(); 
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    
    const fileInputRef = useRef(null);

    const fetchProducts = async (pageToFetch = currentPage) => {
        setLoading(true);
        try {
            const { data } = await api.get('/products', {
                params: { 
                    search: debouncedSearchTerm,
                    page: pageToFetch 
                }
            });
            setProducts(data.products);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudieron cargar los productos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

    useEffect(() => {
        fetchProducts(currentPage);
    }, [debouncedSearchTerm, currentPage]);

    const openModalForCreate = () => { setEditingProduct(null); setIsModalOpen(true); };
    const openModalForEdit = (product) => { setEditingProduct(product); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingProduct(null); };
    
    const handleProductAdded = () => {
        if (currentPage !== 1) setCurrentPage(1);
        else fetchProducts(1);
    };
    
    const handleProductUpdated = () => {
        fetchProducts(currentPage);
    };

    const handleDelete = (productId) => {
        Swal.fire({
            title: '¿Estás seguro?', text: "El producto será eliminado, NO se puede revertir.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#16A34A', cancelButtonColor: '#D33',
            confirmButtonText: 'Sí, ¡elimínalo!', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/products/${productId}`);
                    Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
                    fetchProducts(currentPage);
                } catch (error) {
                    Swal.fire('Error', 'No se pudo desactivar el producto.', 'error');
                }
            }
        });
    };

    const handleFileImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    Swal.fire('Archivo vacío', 'El archivo Excel no contiene datos para importar.', 'warning');
                    return;
                }

                const requiredColumns = ['NOMBRE', 'MARCA', 'CATEGORIA', 'TALLAS', 'REFERENCIA', 'CANTIDAD', 'PRECIO', 'COSTO'];
                const firstRowKeys = Object.keys(json[0]);
                const hasAllColumns = requiredColumns.every(col => firstRowKeys.includes(col));

                if (!hasAllColumns) {
                    Swal.fire('Columnas incorrectas', `El archivo debe tener exactamente las siguientes columnas: ${requiredColumns.join(', ')}`, 'error');
                    return;
                }

                importProducts(json);

            } catch (error) {
                Swal.fire('Error de lectura', 'No se pudo procesar el archivo Excel. Verifique el formato.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    const importProducts = async (productsToImport) => {
        Swal.fire({
            title: `¿Importar ${productsToImport.length} productos?`,
            text: "Esta acción los agregará a tu inventario. Las referencias duplicadas causarán un error.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#16A34A',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await api.post('/products/bulk-import', { products: productsToImport });
                    Swal.fire('¡Éxito!', response.data.msg, 'success');
                    handleProductAdded();
                } catch (error) {
                    Swal.fire('Error en la importación', error.response?.data?.msg || 'No se pudieron importar los productos.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* --- CAMBIO PARA RESPONSIVIDAD AQUÍ --- */}
            {/* Hacemos que este contenedor sea flexible y permita que los elementos se envuelvan (wrap)
              en pantallas pequeñas. 'flex-col sm:flex-row' hace que los elementos se apilen
              verticalmente en pantallas muy pequeñas y vuelvan a estar en fila en pantallas más grandes. */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Productos</h1>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".xlsx, .xls, .csv"
                    />
                    <button
                        onClick={handleFileImportClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md"
                    >
                        Importar Productos
                    </button>
                    <button 
                        onClick={openModalForCreate} 
                        className="bg-[#16A34A] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                        + Agregar Producto
                    </button>
                </div>
            </div>
            
            {/* --- CAMBIO PARA RESPONSIVIDAD AQUÍ --- */}
            {/* El 'overflow-x-auto' es la clave. Le dice al navegador que si el contenido
              interior (la tabla) es más ancho que el contenedor, debe mostrar una barra
              de scroll horizontal en lugar de romper el diseño. */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
                {loading ? (
                    <div className="text-center py-8">Cargando productos...</div>
                ) : products.length > 0 ? (
                    // La clase 'min-w-full' asegura que la tabla intente ocupar todo el espacio,
                    // pero el 'overflow-x-auto' del div padre la controlará.
                    <table className="min-w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Marca</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3">Tallas</th>
                                <th className="px-4 py-3">Referencia</th>
                                <th className="px-4 py-3 text-center">Cantidad</th>
                                <th className="px-4 py-3">Precio</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{product.name}</th>
                                    <td className="px-4 py-3 whitespace-nowrap">{product.brand}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{product.category}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{product.sizes}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{product.reference}</td>
                                    <td className="px-4 py-3 text-center">{product.quantity}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">${new Intl.NumberFormat('es-CO').format(product.price)}</td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <div className="flex justify-center items-center gap-4">
                                            <button onClick={() => openModalForEdit(product)} className="text-blue-600 hover:underline font-semibold">Editar</button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:underline font-semibold">Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No se encontraron productos {debouncedSearchTerm && `para la búsqueda '${debouncedSearchTerm}'`}.
                    </div>
                )}
                
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                />
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                title={editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            >
                <ProductForm 
                    onProductAdded={handleProductAdded}
                    onProductUpdated={handleProductUpdated}
                    closeModal={closeModal}
                    productToEdit={editingProduct}
                />
            </Modal>
        </div>
    );
};

export default ProductsPage;