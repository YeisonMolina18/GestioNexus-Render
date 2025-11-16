/*
===================================================================
 SCRIPT DE INSTALACIÓN LIMPIA Y CONFIGURACIÓN INICIAL - GESTIONEXUS
===================================================================
 Propósito: Construye la estructura completa de la base de datos
 (tablas, triggers, etc.) e inserta ÚNICAMENTE los roles
 y el usuario administrador principal.
*/

-- PASO 1: Asegurar que estamos en el esquema correcto
SET search_path TO public;

-- PASO 2: Crear los tipos personalizados
CREATE TYPE layaway_status AS ENUM ('active', 'completed', 'overdue');

--
-- PASO 3: Creación de todas las tablas (La estructura)
--

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    reset_password_token VARCHAR(255) NULL,
    reset_password_expires TIMESTAMP NULL,
    profile_picture_url VARCHAR(255) NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reference VARCHAR(50) NULL,
    category VARCHAR(100) NULL,
    sizes VARCHAR(100) NULL,
    brand VARCHAR(100) NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NULL,
    contact_number VARCHAR(50) NULL,
    email VARCHAR(100) NULL,
    address VARCHAR(255) NULL,
    nit VARCHAR(50) UNIQUE
);

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE sale_details (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE layaway_plans (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_id_doc VARCHAR(50) NULL,
    customer_contact VARCHAR(50) NULL,
    total_value DECIMAL(10, 2) NOT NULL,
    down_payment DECIMAL(10, 2) NOT NULL,
    balance_due DECIMAL(10, 2) NOT NULL,
    deadline DATE NOT NULL,
    status layaway_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE layaway_plan_details (
    id SERIAL PRIMARY KEY,
    layaway_plan_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (layaway_plan_id) REFERENCES layaway_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE financial_ledger (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    income DECIMAL(10, 2) DEFAULT 0.00,
    expense DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--
-- PASO 4: Creación de Funciones y Triggers (La lógica del negocio)
--

CREATE OR REPLACE FUNCTION decrease_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increase_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Creación de los triggers que llaman a las funciones
CREATE TRIGGER after_saledetail_insert
AFTER INSERT ON sale_details
FOR EACH ROW
EXECUTE FUNCTION decrease_stock();

CREATE TRIGGER after_layawaydetail_insert
AFTER INSERT ON layaway_plan_details
FOR EACH ROW
EXECUTE FUNCTION decrease_stock();

CREATE TRIGGER after_layawaydetail_delete
AFTER DELETE ON layaway_plan_details
FOR EACH ROW
EXECUTE FUNCTION increase_stock();

--
-- PASO 5: Insertar los datos base (Roles y Admin)
--

-- Se insertan los roles que el sistema necesita para funcionar
INSERT INTO roles (id, name) VALUES (1, 'admin'), (2, 'normal');

-- Se inserta el ÚNICO usuario administrador para el cliente
INSERT INTO users (full_name, username, email, password, role_id, is_active)
VALUES (
    'Diana Ruiz', 
    'DianaAdmin@gmail.com', 
    'DianaAdmin@gmail.com', 
    '$2a$10$B59J.jQksSyeYEAqCCear.uMXDBagNagNSoryC', -- Hash de Bcypt para "Diana1234"
    1, -- '1' es el ID para el rol 'admin'
    TRUE
);

/*
===================================================================
 INSTALACIÓN LIMPIA COMPLETADA.
===================================================================
*/