import pool from '../config/db.js';
export const createOrderInTransaction = async (userId, items, totalAmount) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderQuery = `
      INSERT INTO orders (user_id, total_amount, status, created_at)
      VALUES ($1, $2, 'Pending', NOW())
      RETURNING id, user_id, total_amount, status, created_at;
    `;
        const orderResult = await client.query(orderQuery, [userId, totalAmount]);
        const orderId = orderResult.rows[0].id;
        for (const item of items) {
            const itemQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4);
      `;
            await client.query(itemQuery, [orderId, item.productId, item.quantity, item.price]);
            const stockQuery = `
        UPDATE products 
        SET stock = stock - $1 
        WHERE id = $2 AND stock >= $1;
      `;
            const stockResult = await client.query(stockQuery, [item.quantity, item.productId]);
            if (stockResult.rowCount === 0) {
                throw new Error(`Insufficient stock for product ID ${item.productId}`);
            }
        }
        await client.query('COMMIT');
        return orderResult.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
export const getOrdersByUserId = async (userId) => {
    const query = `
    SELECT id, user_id, total_amount, status, created_at
    FROM orders 
    WHERE user_id = $1 
    ORDER BY created_at DESC;
  `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};
export const getOrderDetailsById = async (orderId, userId, isAdmin) => {
    let orderQuery = `SELECT * FROM orders WHERE id = $1`;
    const queryParams = [orderId];
    if (!isAdmin) {
        orderQuery += ` AND user_id = $2`;
        queryParams.push(userId);
    }
    const orderResult = await pool.query(orderQuery, queryParams);
    if (orderResult.rows.length === 0)
        return null;
    const order = orderResult.rows[0];
    const itemsQuery = `
    SELECT oi.product_id, p.name, oi.quantity, oi.price 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1;
  `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    return {
        ...order,
        items: itemsResult.rows,
    };
};
//# sourceMappingURL=orderModel.js.map