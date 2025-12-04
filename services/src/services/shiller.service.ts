
import axios from 'axios';
import { fetchStockData } from './sp500.service';
import { fetchMacroData } from './macro.service';

const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

interface ShillerDataPoint {
    date: string;
    value: number;
}

interface EarningsDataPoint {
    date: Date;
    value: number;
}

let cachedShillerData: ShillerDataPoint[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function fetchShillerPEHistory(symbol: string = '^GSPC'): Promise<ShillerDataPoint[]> {
    const isSP500 = symbol === '^GSPC' || symbol === 'SPY';
    const now = Date.now();

    // Cache only for S&P 500 default
    if (isSP500 && cachedShillerData && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return cachedShillerData;
    }

    try {
        let earnings: EarningsDataPoint[] = [];
        let prices: any[] = [];
        let cpiHistory: any[] = [];

        if (isSP500) {
            console.log('[Shiller] Fetching S&P 500 data (multpl + ^GSPC)');
            // 1. Fetch Real Earnings from multpl (already inflation adjusted)
            earnings = await fetchRealEarnings();
            console.log(`[Shiller] Fetched ${earnings.length} earnings records from multpl`);

            // 2. Fetch S&P 500 Price History (20 years)
            const sp500Data = await fetchStockData('^GSPC', '1mo', '20y');
            prices = sp500Data.history;
            console.log(`[Shiller] Fetched ${prices.length} price records for ^GSPC`);
        } else {
            console.log(`[Shiller] Fetching data for stock: ${symbol}`);
            // Stock Specific Logic
            // 1. Fetch Earnings History from Yahoo Finance
            earnings = await fetchStockEarningsHistory(symbol);
            console.log(`[Shiller] Fetched ${earnings.length} earnings records for ${symbol}`);

            // 2. Fetch CPI Data for Inflation Adjustment
            const macroData = await fetchMacroData();
            cpiHistory = macroData.cpi.indexHistory || [];
            console.log(`[Shiller] Fetched ${cpiHistory.length} CPI records`);

            // 3. Fetch Stock Price History (Max available, monthly)
            const stockData = await fetchStockData(symbol, '1mo', 'max');
            prices = stockData.history;

            // Deduplicate prices by month (keep the latest entry for each month)
            const uniquePrices = new Map<string, any>();
            for (const p of prices) {
                const d = new Date(p.date);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                // Since prices are sorted by date, later entries will overwrite earlier ones
                // But wait, fetchStockData sorts by date.
                // If we have Dec 1 and Dec 3, Dec 3 comes later.
                // We want to keep Dec 3? Or Dec 1?
                // Yahoo 1mo candle usually starts at the 1st.
                // The "current" candle might be dated today.
                // Let's keep the one that looks like a month start if possible, or just the last one?
                // Actually, for a history chart, we usually want the month close.
                // So the latest date in the month is better if it represents the update.
                uniquePrices.set(key, p);
            }
            prices = Array.from(uniquePrices.values());
            // Sort again just in case
            prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            console.log(`[Shiller] Fetched ${prices.length} price records for ${symbol} (after dedupe)`);
        }

        // 3. Calculate CAPE
        const capeData: ShillerDataPoint[] = [];

        // Sort earnings by date ascending
        earnings.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Helper to adjust for inflation (only for individual stocks, multpl data is already real)
        const getCPI = (date: Date): number => {
            if (!cpiHistory || cpiHistory.length === 0) return 1;
            // Find closest CPI record
            // CPI history is sorted desc usually in macro service, let's ensure
            // Actually macro service returns history sorted desc? Let's check macro service.
            // macro service sorts desc.
            const dateStr = date.toISOString().split('T')[0];
            const record = cpiHistory.find(c => c.date <= dateStr); // Approximation
            return record ? record.value : cpiHistory[cpiHistory.length - 1].value;
        };

        const latestCPI = cpiHistory.length > 0 ? cpiHistory[0].value : 1;

        // Helper to find earnings window
        const getAverageEarnings = (endDate: Date): number | null => {
            // For S&P 500, we want 10 years.
            // For individual stocks, we take what we have, up to 10 years.
            const targetYears = 10;
            const startDate = new Date(endDate);
            startDate.setFullYear(endDate.getFullYear() - targetYears);

            // Filter earnings before or at endDate
            // For CAPE, we need earnings *prior* to the price date.
            // Usually it's the average of the last 10 years of earnings.
            const window = earnings.filter(e => e.date <= endDate && e.date >= startDate);

            // If we have annual data, we might have fewer points (e.g. 4 points for 4 years).
            // If we have quarterly, 16 points.
            // Let's require at least 3 years of data?
            // If we have 3 annual points, that's 3 years.
            // If we have 12 quarterly points, that's 3 years.

            // Check time span covered
            if (window.length < 2) {
                console.log(`[Shiller] Window too short: ${window.length}`);
                return null;
            }

            const first = window[0].date;
            const last = window[window.length - 1].date;
            const yearsCovered = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 365);

            // Relaxed constraint: Allow ~1 year of history (e.g. 4 quarters)
            if (yearsCovered < 0.7) {
                console.log(`[Shiller] Years covered too short: ${yearsCovered.toFixed(2)}`);
                return null;
            }

            let sumRealEarnings = 0;

            if (isSP500) {
                // Multpl earnings are already "Real" (inflation adjusted)
                sumRealEarnings = window.reduce((a, b) => a + b.value, 0);
            } else {
                // Adjust for inflation
                // Real Earning = Nominal Earning * (CPI_current / CPI_historical)
                // But "Current" means the date of the Price we are calculating CAPE for?
                // Standard Shiller PE adjusts all past earnings to the "Current" price date dollars.
                // So we use CPI at endDate (Price Date) as the numerator.

                // However, usually we adjust everything to *Today's* dollars or a fixed base.
                // Shiller's data is "Constant Dollars".
                // Let's adjust everything to the CPI of the Price Date we are calculating for.
                // So for a Price in 2020, we adjust 2010-2020 earnings to 2020 dollars.

                // Wait, efficient way:
                // Real Earning (at time t) = Nominal(t) * (CPI(now) / CPI(t))
                // Then Average Real Earnings.
                // Then Price(now) / Avg Real Earnings.
                // Yes.

                const cpiAtPriceDate = getCPI(endDate);

                for (const e of window) {
                    const cpiAtEarningDate = getCPI(e.date);
                    const realEarning = e.value * (cpiAtPriceDate / cpiAtEarningDate);
                    sumRealEarnings += realEarning;
                }
            }

            // Normalize for number of years available
            // If we have quarterly data, we have 4 points per year.
            // If we have monthly data (multpl), we have 12 points per year.
            // We want "Average Annual Earnings".

            // Multpl data is "Earnings Per Share" (Annualized? usually TTM or similar).
            // Multpl says "12-month real earnings per share". So each data point is already an annual figure.
            // So we just average the data points.

            // For Yahoo Finance, we get Quarterly Earnings.
            // We need to sum 4 quarters to get Annual Earnings?
            // Or if we just average the quarterly earnings and multiply by 4?
            // Better: Calculate TTM earnings for each quarter, then average those TTMs?
            // Shiller uses: "Average of the last 10 years of real earnings".
            // If we have quarterly data: E1, E2 ... E40.
            // Average = (Sum(E1..E40) / 40) * 4 ? 
            // Yes, average quarterly earning * 4 = Average Annual Earning.

            let averageAnnualEarnings = 0;
            if (isSP500) {
                averageAnnualEarnings = sumRealEarnings / window.length;
            } else {
                // We might have a mix of annual and quarterly data?
                // Or just annual.
                // If we have annual data (from 'earnings' module), each point is an annual earning.
                // So Average = Sum / Count.
                // If we have quarterly data (from 'earningsHistory'), each point is quarterly.
                // We need to distinguish.
                // For now, let's assume if we have < 20 points it might be annual? No, 4 years quarterly is 16 points.
                // Let's look at the gap between points.

                // Simple heuristic:
                // Calculate average interval.
                const avgInterval = (last.getTime() - first.getTime()) / (window.length - 1);
                const isQuarterly = avgInterval < (1000 * 60 * 60 * 24 * 100); // < 100 days

                if (isQuarterly) {
                    const averageQuarterly = sumRealEarnings / window.length;
                    averageAnnualEarnings = averageQuarterly * 4;
                } else {
                    // Annual
                    averageAnnualEarnings = sumRealEarnings / window.length;
                }
            }

            return averageAnnualEarnings;
        };

        for (const pricePoint of prices) {
            const date = new Date(pricePoint.date);
            const avgEarnings = getAverageEarnings(date);

            if (avgEarnings && avgEarnings > 0) {
                const cape = pricePoint.close / avgEarnings;
                capeData.push({
                    date: pricePoint.date,
                    value: cape
                });
            }
        }

        // Sort descending for display (newest first)
        capeData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (isSP500 && capeData.length > 0) {
            cachedShillerData = capeData;
            lastFetchTime = now;
        }

        return capeData;

    } catch (error: any) {
        console.error('Error calculating Shiller PE:', error.message);
        if (isSP500 && cachedShillerData) return cachedShillerData;
        return [];
    }
}

async function fetchRealEarnings(): Promise<EarningsDataPoint[]> {
    try {
        const response = await axios.get('https://www.multpl.com/s-p-500-earnings/table/by-month', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const html = response.data;
        const rowRegex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gs;
        let match;
        const data: EarningsDataPoint[] = [];

        while ((match = rowRegex.exec(html)) !== null) {
            let dateStr = match[1].trim();
            let valueStr = match[2].trim();
            valueStr = valueStr.replace(/&nbsp;/g, ' ').replace(/&#x2002;/g, '').replace(/\s+/g, ' ').trim();
            if (dateStr.toLowerCase().includes('date')) continue;
            const value = parseFloat(valueStr);
            const date = new Date(dateStr);
            if (!isNaN(value) && !isNaN(date.getTime())) {
                data.push({ date, value });
            }
        }
        return data;
    } catch (error) {
        console.error('Error fetching earnings:', error);
        return [];
    }
}

async function fetchStockEarningsHistory(symbol: string): Promise<EarningsDataPoint[]> {
    try {
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: ['earningsHistory', 'earnings', 'defaultKeyStatistics']
        });

        let data: EarningsDataPoint[] = [];
        const sharesOutstanding = result.defaultKeyStatistics?.sharesOutstanding;

        // 1. Fetch Quarterly EPS History (usually last 4 quarters)
        // This contains 'epsActual' which is the correct historical EPS.
        const quarterlyHistory = result.earningsHistory?.history || [];
        const quarterlyEPS = quarterlyHistory.map((h: any) => ({
            date: new Date(h.quarter),
            value: h.epsActual
        })).filter((d: any) => !isNaN(d.value) && !isNaN(d.date.getTime()));

        // 2. Fetch Annual Earnings (Net Income) -> EPS Approximation
        // This gives us ~4 years of history usually.
        let annualEPS: EarningsDataPoint[] = [];
        if (sharesOutstanding && result.earnings && result.earnings.financialsChart && result.earnings.financialsChart.yearly) {
            const annual = result.earnings.financialsChart.yearly;
            annualEPS = annual.map((h: any) => ({
                date: new Date(h.date, 11, 31), // Year end (Approx)
                value: h.earnings / sharesOutstanding // Approx EPS
            })).filter((d: any) => !isNaN(d.value));
        }

        // 3. Merge Strategies
        // Use Quarterly for recent data (more accurate).
        // Use Annual for older data (more history).
        // Filter out Annual points that are covered by Quarterly points.
        // We assume Quarterly covers the most recent year(s).

        // Find the earliest date in Quarterly data
        let earliestQuarterly = new Date(8640000000000000); // Max date
        if (quarterlyEPS.length > 0) {
            earliestQuarterly = quarterlyEPS.reduce((min: Date, p: any) => p.date < min ? p.date : min, quarterlyEPS[0].date);
        }

        // Filter Annual: Keep only those strictly before the earliest Quarterly date (minus some buffer?)
        // Actually, Annual date is set to Dec 31.
        // If Quarterly starts Jan 2025. Annual 2024 (Dec 31 2024) is before Jan 2025.
        // So we keep Annual 2024.
        // But Annual 2024 covers 2024. Quarterly starts 2025. No overlap. Good.
        // If Quarterly starts Oct 2024. Annual 2024 (Dec 31) is after Oct 2024.
        // But Annual 2024 covers the whole year 2024.
        // If we have partial quarterly for 2024, should we use Annual 2024 instead?
        // Or mix them?
        // Mixing is hard because Annual is a sum.
        // Simple heuristic: If we have ANY quarterly data for a year, ignore the Annual data for that year.

        const quarterlyYears = new Set(quarterlyEPS.map((d: any) => d.date.getFullYear()));
        const filteredAnnual = annualEPS.filter((d: any) => !quarterlyYears.has(d.date.getFullYear()));

        const combined = [...filteredAnnual, ...quarterlyEPS];

        // Sort by date
        combined.sort((a, b) => a.date.getTime() - b.date.getTime());

        if (combined.length > 0) {
            console.log(`[Shiller] Using hybrid earnings: ${filteredAnnual.length} annual + ${quarterlyEPS.length} quarterly for ${symbol}`);
            return combined;
        }

        console.log(`[Shiller] No earnings found for ${symbol}`);
        return [];

    } catch (error) {
        console.error(`Error fetching earnings history for ${symbol}:`, error);
        return [];
    }
}
