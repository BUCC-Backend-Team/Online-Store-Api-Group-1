import pool from './db.js';
async function testConnection() {
    try{
        const res = await pool.query('SELECT NOW()');
        console.log('Database connection successful! Current time from DB:', res.rows[0].now);
        process.exit(0);
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}
testConnection();
