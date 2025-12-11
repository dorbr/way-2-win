
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

const testTmx = async () => {
    if (!API_KEY) {
        console.error('POLYGON_API_KEY is missing');
        return;
    }

    console.log('Testing Polygon TMX Corporate Events endpoint...');
    try {
        // Checking for AAPL earnings or just general events
        const url = `${BASE_URL}/v1/marketstatus/upcoming?apiKey=${API_KEY}`; // Fallback check
        // The user suggested /tmx/v1/corporate-events. Let's try to find the exact signature or just try it.
        // Documentation often uses /v1/reference/dividends etc. 
        // Let's try searching or guessing the path if exact doc isn't known, but user gave a specific path.

        // Note: The user said "/tmx/v1/corporate-events". 
        // Let's try that.
        const tmxUrl = `${BASE_URL}/v1/reference/sec/filings?apiKey=${API_KEY}`; // This isn't it.

        // Correct guess based on typical Polygon experimental paths or user input:
        // Attempt 1: As user specified
        try {
            const userPath = `${BASE_URL}/tmx/v1/corporate-events?apiKey=${API_KEY}&tickers=AAPL`;
            console.log(`Requesting: ${userPath.replace(API_KEY, '***')}`);
            const res = await axios.get(userPath);
            console.log('TMX Status:', res.status);
            console.log('TMX Data:', JSON.stringify(res.data, null, 2));
        } catch (e: any) {
            console.log('TMX Attempt 1 Failed:', e.response?.status, e.response?.statusText, e.message);
            if (e.response?.data) console.log('Response Body:', JSON.stringify(e.response.data));
        }

    } catch (e: any) {
        console.error('Global Error:', e.message);
    }
};

testTmx();
