const pool = require('../db/database');

// Esta función es un helper para no repetir el código de buscar notificaciones
const fetchAllNotifications = async () => {
    const notifications = [];
    
    // --- CORRECCIÓN: Se usa { rows } y se ajusta la sintaxis ---
    const { rows: lowStockProducts } = await pool.query('SELECT name, quantity FROM products WHERE quantity < 3 AND is_active = TRUE');
    lowStockProducts.forEach(p => {
        notifications.push({
            id: `stock-${p.name.replace(/\s/g, '-')}`,
            type: 'stock_alert',
            message: `Reponer stock de '${p.name}', quedan solo ${p.quantity} unidades.`
        });
    });

    // --- CORRECCIÓN: Se usa CURRENT_DATE para PostgreSQL ---
    const { rows: overduePlans } = await pool.query(
        "SELECT id, customer_name FROM layaway_plans WHERE deadline < CURRENT_DATE AND status = 'active'"
    );
    overduePlans.forEach(p => {
        notifications.push({
            id: `overdue-${p.id}`,
            type: 'payment_due',
            message: `¡El plan separe del cliente ${p.customer_name} está VENCIDO!`
        });
    });

    // --- CORRECCIÓN: Se usa la sintaxis de intervalos de PostgreSQL ---
    const { rows: dueSoonPlans } = await pool.query(
        "SELECT id, customer_name, deadline FROM layaway_plans WHERE deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 day' AND status = 'active'"
    );
    dueSoonPlans.forEach(p => {
        const formattedDate = new Date(p.deadline);
        formattedDate.setDate(formattedDate.getDate() + 1);
        notifications.push({
            id: `duesoon-${p.id}`,
            type: 'payment_soon',
            message: `El plazo de ${p.customer_name} vence pronto (${formattedDate.toLocaleDateString('es-CO', {day: 'numeric', month: 'long'})}).`
        });
    });
    return notifications;
};

const getNotifications = async (req, res) => {
    try {
        const notifications = await fetchAllNotifications();
        res.json(notifications);
    } catch (error) {
        console.error("Error al obtener las notificaciones:", error);
        res.status(500).json({ msg: 'Error al obtener las notificaciones' });
    }
};

const getNotificationStatus = async (req, res) => {
    try {
        const notifications = await fetchAllNotifications();
        res.json({ hasUnread: notifications.length > 0 });
    } catch (error) {
        console.error("Error al verificar estado de notificaciones:", error);
        res.status(500).json({ msg: 'Error al verificar estado de notificaciones' });
    }
};

const markNotificationsAsRead = (req, res) => {
    res.status(200).json({ msg: 'Notificaciones marcadas como leídas.' });
};

module.exports = { 
    getNotifications,
    getNotificationStatus,
    markNotificationsAsRead
};