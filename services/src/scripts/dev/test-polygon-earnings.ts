import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

const testEndpoints = async () => {
    if (!API_KEY) {
        console.error('POLYGON_API_KEY is missing');
        return;
    }

    const endpoints = [
        // Experimental or potential endpoints for earnings
        `/vX/reference/financials?limit=1`, // We know this works for statements
        // `/v1/indicators/earnings-surprises?limit=5`, // Past earnings?
        // `/v2/reference/dividends?ticker=AAPL&limit=1`, // Dividends
    ];

    // Try to find correct endpoint for "Upcoming Earnings"
    // Some sources suggest checking Tickers API for next_earnings_date
    // `/v3/reference/tickers/AAPL`

    console.log('Testing specific ticker details for AAPL (looking for next earnings date)...');
    try {
        const res = await axios.get(`${BASE_URL}/v3/reference/tickers/AAPL?apiKey=${API_KEY}`);
        console.log('Ticker Details Status:', res.status);
        // console.log('Ticker Details Data:', JSON.stringify(res.data.results, null, 2));
        if (res.data.results) {
            console.log('Next Earnings Date field?');
            // Check for any field related to earnings
            // This is just a guess, I need to see the output
            // But for safety I won't print the whole thing if it's huge, just keys
            console.log(Object.keys(res.data.results));
        }
    } catch (e: any) {
        console.error('Error fetching ticker details:', e.message);
    }
};

testEndpoints();
