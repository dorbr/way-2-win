const axios = require('axios');
require('dotenv').config();

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const TICKER = 'AAPL';
// Use a date that likely has data, or just fetch without date to see if we hit limit
// But user is using date now. Let's try to find a valid date or just use next Friday.
// We can just fetch without date to guarantee hitting the limit of 250.
const BASE_URL = `https://api.polygon.io/v3/snapshot/options/${TICKER}`;

async function checkPagination() {
    try {
        console.log(`Fetching options for ${TICKER}...`);
        const response = await axios.get(BASE_URL, {
            params: {
                apiKey: POLYGON_API_KEY,
                limit: 250
            }
        });

        console.log('Response Status:', response.status);
        console.log('Results count:', response.data.results ? response.data.results.length : 0);

        if (response.data.next_url) {
            console.log('Pagination detected! next_url exists.');
            console.log('next_url:', response.data.next_url);
        } else {
            console.log('No pagination detected (next_url is missing).');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
    }
}

checkPagination();
