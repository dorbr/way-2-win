const { fetchOptionsOpenInterest } = require('./fetchers/options');
require('dotenv').config();

async function test() {
    try {
        console.log('Testing fetchOptionsOpenInterest with AAPL...');
        const data = await fetchOptionsOpenInterest('AAPL');
        console.log('Data fetched:', data.length, 'records');
        if (data.length > 0) {
            console.log('Sample record:', data[0]);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
