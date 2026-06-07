const db = require('./src/config/db');

async function checkCols() {
    try {
        const res = await db.raw(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'positions';
        `);
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkCols();
