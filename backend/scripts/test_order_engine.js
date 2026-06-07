const db = require('./src/config/db');
const orderEngine = require('./src/services/orderEngine');

async function testOrder() {
    try {
        const user = await db('users').where({ email: 'superadmin@investx.com' }).first(); // just to get a valid user id, wait, superadmin is NOT a client! But orderEngine doesn't care about roles.
        if (!user) {
            console.log("Superadmin user not found, checking any user");
            const anyUser = await db('users').first();
            if (!anyUser) {
                console.log("No users found");
                return;
            }
            await orderEngine.executeMarketOrder(anyUser.id, {
                ticker: 'AAPL',
                type: 'BUY',
                quantity: 10,
                isLimitOrder: false
            });
            console.log("Order successful");
        } else {
            await orderEngine.executeMarketOrder(user.id, {
                ticker: 'AAPL',
                type: 'BUY',
                quantity: 10,
                isLimitOrder: false
            });
            console.log("Order successful");
        }
    } catch (e) {
        console.error("Order failed:", e);
    } finally {
        process.exit(0);
    }
}
testOrder();
