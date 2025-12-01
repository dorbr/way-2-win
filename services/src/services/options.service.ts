import axios from 'axios';
import { fetchCurrentPrice } from './sp500.service';
import { prisma } from '../config/db';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io/v3/snapshot/options';

/**
 * Fetches options open interest data for a given ticker from Polygon.io.
 * @param {string} ticker - The underlying asset ticker (e.g., 'AAPL').
 * @param {string} [expirationDate] - Optional expiration date (YYYY-MM-DD).
 * @returns {Promise<Object>} - The options data.
 */
export async function fetchOptionsOpenInterest(ticker: string, expirationDate?: string): Promise<any[]> {
    if (!POLYGON_API_KEY) {
        console.error('POLYGON_API_KEY is not defined in environment variables.');
        throw new Error('API key missing');
    }

    try {
        const url = `${BASE_URL}/${ticker}`;
        const params: any = {
            apiKey: POLYGON_API_KEY,
            limit: 250 // Reverted to 250 as 1000 caused 400 Bad Request
        };

        if (expirationDate) {
            params.expiration_date = expirationDate;
        }

        console.log(`[Options] Fetching data from: ${url} with params:`, { ...params, apiKey: 'REDACTED' });

        let allResults: any[] = [];
        let nextUrl: string | null = url;
        let fetchParams: any = params;

        while (nextUrl) {
            // Fetch snapshot
            // Note: If nextUrl is the full URL from 'next_url', it might already have params encoded.
            // Polygon's next_url usually includes the cursor and other params.
            // However, we need to append the apiKey if it's not in the next_url (usually it's not for security, or we need to add it).
            // Let's check if we are using the initial URL or a next_url.

            // If it's a next_url (cursor based), we might need to handle it differently.
            // But axios.get(nextUrl, { params }) might double encode if nextUrl has query params.
            // Let's handle the loop carefully.

            let response;
            if (nextUrl === url) {
                response = await axios.get(nextUrl, { params: fetchParams });
            } else {
                // For next_url, simply append apiKey if missing, or pass as param
                // Polygon next_url usually implies a direct GET.
                // We need to attach apiKey.
                const separator = nextUrl.includes('?') ? '&' : '?';
                const fullNextUrl: string = `${nextUrl}${separator}apiKey=${POLYGON_API_KEY}`;
                response = await axios.get(fullNextUrl);
            }

            if (response.data && response.data.results) {
                const results = response.data.results;
                allResults = allResults.concat(results);
                console.log(`[Options] Fetched ${results.length} records. Total: ${allResults.length}`);

                if (response.data.next_url) {
                    nextUrl = response.data.next_url;
                    fetchParams = {}; // Clear params for next requests as they are in the URL
                } else {
                    nextUrl = null;
                }
            } else {
                console.warn(`[Options] No results in page. Response:`, response.data);
                nextUrl = null;
            }
        }

        if (allResults.length > 0) {
            console.log(`[Options] Total received ${allResults.length} option contracts for ${ticker}`);
            return allResults;
        } else {
            console.warn(`[Options] No options data found for ${ticker}`);
            return [];
        }
    } catch (error: any) {
        if (error.response) {
            console.error(`[Options] API Error for ${ticker}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`[Options] Error fetching options data for ${ticker}:`, error.message);
        }
        throw error;
    }
}

/**
 * Calculates the Call/Put OI ratio for 5 strikes above and 5 below current price,
 * and saves it to history.
 */
export async function calculateAndSaveOptionsRatio(ticker: string = 'AAPL', dataFile: any = null, shouldSave: boolean = true): Promise<any> {
    try {
        // 1. Get Current Price
        const currentPrice = await fetchCurrentPrice(ticker);
        if (!currentPrice) throw new Error('Could not fetch current price');

        // 2. Get Options Data
        // We want ALL expirations to get a comprehensive view, or maybe just the nearest?
        // The user didn't specify expiration, so let's fetch ALL (no date param).
        // This might be a lot of data.
        // Optimization: Maybe fetch for a specific near-term expiration?
        // But "options chain" usually implies the whole chain.
        // Let's try fetching all. If too slow, we might need to optimize.
        const options = await fetchOptionsOpenInterest(ticker);

        if (!options || options.length === 0) return null;

        // 3. Group by Strike
        const strikeMap = new Map();
        options.forEach(opt => {
            const strike = opt.details.strike_price;
            const type = opt.details.contract_type; // 'call' or 'put'
            const oi = opt.open_interest || 0;

            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { call: 0, put: 0 });
            }
            if (type === 'call') strikeMap.get(strike).call += oi;
            if (type === 'put') strikeMap.get(strike).put += oi;
        });

        // 4. Sort Strikes
        const sortedStrikes = Array.from(strikeMap.keys()).sort((a: any, b: any) => a - b);

        // 5. Find strikes around current price
        // Find index of first strike >= current price
        let closestIndex = -1;
        for (let i = 0; i < sortedStrikes.length; i++) {
            if (sortedStrikes[i] >= currentPrice) {
                closestIndex = i;
                break;
            }
        }

        if (closestIndex === -1) closestIndex = sortedStrikes.length - 1; // Price above all strikes?

        // We want 5 below and 5 above.
        // "Above" starts at closestIndex (inclusive? usually "above" means > price).
        // Let's take 5 strikes strictly < price and 5 strikes strictly > price.
        // Or just 10 strikes centered around price.

        // Let's try to get 5 indices before closestIndex and 5 indices starting from closestIndex.
        const startIdx = Math.max(0, closestIndex - 5);
        const endIdx = Math.min(sortedStrikes.length, closestIndex + 5);

        const selectedStrikes = sortedStrikes.slice(startIdx, endIdx);

        if (selectedStrikes.length === 0) return null;

        // 6. Calculate Average Ratio
        let totalRatio = 0;
        let count = 0;

        selectedStrikes.forEach(strike => {
            const data = strikeMap.get(strike);
            if (data.put > 0) {
                const ratio = data.call / data.put;
                totalRatio += ratio;
                count++;
            } else if (data.call > 0) {
                // Put is 0 but Call is > 0. Ratio is infinite.
                // How to handle? Maybe cap it or exclude?
                // Let's exclude for now to avoid skewing average with Infinity.
            }
        });

        /**
         * Helper to find the latest timestamp from a list of options.
         * Checks day bar, last quote, and last trade.
         */
        function getLatestOptionTimestamp(options: any[]): string | null {
            let maxTs = 0;
            for (const opt of options) {
                let ts = 0;
                // Check day bar (milliseconds)
                if (opt.day && opt.day.t) {
                    ts = opt.day.t;
                }
                // Check last quote (nanoseconds)
                else if (opt.last_quote && opt.last_quote.sip_timestamp) {
                    ts = opt.last_quote.sip_timestamp / 1000000;
                }
                // Check last trade (nanoseconds)
                else if (opt.last_trade && opt.last_trade.sip_timestamp) {
                    ts = opt.last_trade.sip_timestamp / 1000000;
                }

                if (ts > maxTs) {
                    maxTs = ts;
                }
            }

            if (maxTs > 0) {
                return new Date(maxTs).toISOString();
            }
            return null;
        }

        const avgRatio = count > 0 ? totalRatio / count : 0;

        // 7. Save to DB (if requested)
        // Use the latest timestamp from the data if available, otherwise use current time.
        const dataTimestamp = getLatestOptionTimestamp(options);
        const record = {
            timestamp: dataTimestamp || new Date().toISOString(),
            ticker,
            price: currentPrice,
            ratio: avgRatio,
            strikesCount: count
        };

        if (shouldSave) {
            try {
                await prisma.optionsRatioHistory.create({
                    data: {
                        timestamp: record.timestamp,
                        ticker: record.ticker, // Keep the string field for legacy/redundancy if needed, or just rely on relation
                        price: record.price,
                        ratio: record.ratio,
                        strikesCount: record.strikesCount,
                        tickerRel: {
                            connect: { symbol: ticker }
                        }
                    }
                });
                console.log(`[Options] Saved ratio for ${ticker} to DB.`);
            } catch (err) {
                console.error(`[Options] Error saving to DB for ${ticker}:`, err);
            }
        }

        return record;

    } catch (error) {
        console.error('Error calculating options ratio:', error);
        throw error;
    }
}

export async function getOptionsRatioHistory(): Promise<any[]> {
    try {
        const result = await prisma.optionsRatioHistory.findMany({
            orderBy: {
                timestamp: 'asc'
            }
        });

        return result.map(row => ({
            timestamp: row.timestamp.toISOString(), // Ensure ISO string for frontend
            ticker: row.ticker,
            price: parseFloat(row.price.toString()),
            ratio: parseFloat(row.ratio.toString()),
            strikesCount: row.strikesCount
        }));
    } catch (error) {
        console.error('Error fetching options ratio history from DB:', error);
        return [];
    }
}
