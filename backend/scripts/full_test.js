const db = require('./src/config/db');
const orderEngine = require('./src/services/orderEngine');

async function fullTest() {
    try {
        // Find a user with > 30000 cash_available
        const wallet = await db('wallets').where('cash_available', '>', 30000).first();
        if (!wallet) {
            console.log("No wallet with enough money found. Please create one.");
            process.exit(1);
        }
        console.log(`Using user_id: ${wallet.user_id} with cash: ${wallet.cash_available}`);

        const result = await orderEngine.executeMarketOrder(wallet.user_id, {
            ticker: 'AAPL',
            type: 'BUY',
            quantity: 10,
            isLimitOrder: false
        });
        
        console.log("Order successful!", result);
    } catch (e) {
        console.error("Order failed:", e);
    } finally {
        process.exit(0);
    }
}
fullTest();
