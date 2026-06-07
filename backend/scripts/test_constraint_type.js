const db = require('./src/config/db');

async function testConstraint() {
    try {
        const res = await db.raw(`
            SELECT pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE conname = 'orders_type_check';
        `);
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testConstraint();
