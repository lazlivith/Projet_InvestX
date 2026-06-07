const db = require('./src/config/db');

setTimeout(async () => {
    try {
        const r = await db.raw("SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'orders'::regclass");
        console.log('=== CONTRAINTES TABLE ORDERS ===');
        r.rows.forEach(row => console.log(row.conname, ':', row.definition));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}, 3000);
