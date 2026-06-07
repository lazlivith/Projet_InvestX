const axios = require('axios');

async function testTrade() {
    try {
        // 1. Create a user
        const email = `test_${Date.now()}@test.com`;
        const regRes = await axios.post('http://localhost:5000/api/v1/auth/register', {
            name: 'Test User',
            email,
            password: 'password123'
        });
        
        const token = regRes.data.accessToken;

        // 2. Place a market order
        const orderRes = await axios.post('http://localhost:5000/api/v1/trade/market-order', {
            ticker: 'AAPL',
            type: 'BUY',
            quantity: 100
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('SUCCESS:', orderRes.data);
    } catch (error) {
        console.error('ERROR DATA:', error.response?.data);
        console.error('ERROR MSG:', error.message);
    }
}

testTrade();
