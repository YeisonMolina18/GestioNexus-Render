-- No se necesita CREATE DATABASE ni USE, Render lo maneja automáticamente.

-- Tabla de Roles
CREATE TABLE roles (
    -- 'SERIAL' es el equivalente de PostgreSQL para 'AUTO_INCREMENT'
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Insertar roles iniciales
INSERT INTO roles (name) VALUES ('admin'), ('normal');

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Tabla de Productos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reference VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    sizes VARCHAR(100),
    brand VARCHAR(100),
    quantity INT NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL
);

-- Tabla de Ventas
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INT,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de Detalles de Venta
CREATE TABLE sale_details (
    id SERIAL PRIMARY KEY,
    sale_id INT,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- En PostgreSQL, primero debemos crear el tipo ENUM
CREATE TYPE layaway_status AS ENUM ('active', 'completed', 'overdue');

-- Tabla de Planes Separe (Apartados)
CREATE TABLE layaway_plans (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_id_doc VARCHAR(50),
    customer_contact VARCHAR(50),
    total_value DECIMAL(10, 2) NOT NULL,
    down_payment DECIMAL(10, 2) NOT NULL,
    balance_due DECIMAL(10, 2) NOT NULL,
    deadline DATE NOT NULL,
    -- Usamos el tipo ENUM que creamos arriba
    status layaway_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Detalles de Planes Separe
CREATE TABLE layaway_plan_details (
    id SERIAL PRIMARY KEY,
    layaway_plan_id INT,
    product_id INT,
    quantity INT NOT NULL,
    FOREIGN KEY (layaway_plan_id) REFERENCES layaway_plans(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabla de Proveedores
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    contact_number VARCHAR(50),
    email VARCHAR(100),
    address VARCHAR(255),
    nit VARCHAR(50) UNIQUE
);

-- Tabla de Auditoría (Logs)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- En PostgreSQL, los triggers se crean en dos pasos:
-- 1. Crear una FUNCIÓN que contiene la lógica.
-- 2. Crear el TRIGGER que llama a esa función.

-- Creamos una única función reutilizable para descontar stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la tabla sale_details
CREATE TRIGGER after_saledetail_insert
AFTER INSERT ON sale_details
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- Trigger para la tabla layaway_plan_details
CREATE TRIGGER after_layawaydetail_insert
AFTER INSERT ON layaway_plan_details
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();


-- Insertar usuarios de prueba (estos no cambian)
INSERT INTO users (full_name, username, email, password, role_id) VALUES
('Yeison Molina', 'admin', 'admin@gestioneexus.com', '$2a$10$wG/N4j5j5Y.l8J5c7Q9p7eRz2q4O/2Yq6E6s.1Q2b6Xz9X7r4Y5yC', 1);

INSERT INTO users (full_name, username, email, password, role_id) VALUES
('Karol Zea Cano', 'karolzea', 'karol@gestioneexus.com', '$2a$10$fW/g8a7H9c.E6k7v/3x8R.sY9d8e7F6g5H4i3J2k1l0O9p8q7r6tU', 2);