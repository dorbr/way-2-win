const axios = require('axios');

const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

async function fetchFredSeries(seriesId, units = 'lin', apiKey, limit = 1) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                series_id: seriesId,
                api_key: apiKey,
                file_type: 'json',
                units: units,
                sort_order: 'desc',
                limit: limit
            }
        });

        if (response.data.observations && response.data.observations.length > 0) {
            // If limit is 1, return single object (backward compatibility if needed, but better to standardize)
            // Actually, let's return the array and let the caller handle it.
            // But wait, the existing code expects a single object { value, date } if limit was 1 (implied).
            // Let's change this to always return an array of { value, date }.

            return response.data.observations.map(obs => ({
                value: parseFloat(obs.value),
                date: obs.date
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching FRED series ${seriesId}:`, error.message);
        return [];
    }
}

async function fetchMacroData() {
    const apiKey = process.env.MACRO_API_KEY;
    if (!apiKey) {
        console.warn("MACRO_API_KEY is missing. Returning mock macro data.");
        return getMockMacroData();
    }

    try {
        // Fetch all in parallel
        // We need history for graphs:
        // CPI/PPI: Last 13 months (to show 1 year trend + 1 for calc if needed, but 13 points is good for graph)
        // Claims: Last 12 weeks

        const [
            cpiYoYHist, cpiMoMHist,
            ppiYoYHist, ppiMoMHist,
            claimsHist, claimsAvgHist
        ] = await Promise.all([
            fetchFredSeries('CPIAUCSL', 'pc1', apiKey, 25), // YoY (Percent Change from Year Ago) - 2 Years
            fetchFredSeries('CPIAUCSL', 'pch', apiKey, 25), // MoM (Percent Change)
            fetchFredSeries('PPIFIS', 'pc1', apiKey, 25),   // YoY (Percent Change from Year Ago) - 2 Years
            fetchFredSeries('PPIFIS', 'pch', apiKey, 25),   // MoM (Percent Change)
            fetchFredSeries('ICSA', 'lin', apiKey, 104),    // Initial Claims (2 years)
            fetchFredSeries('IC4WSA', 'lin', apiKey, 104)   // 4-Week Avg (2 years)
        ]);

        // Helper to get latest
        const getLatest = (arr) => arr && arr.length > 0 ? arr[0] : { value: 0, date: new Date().toISOString().split('T')[0] };

        const cpiYoY = getLatest(cpiYoYHist);
        const cpiMoM = getLatest(cpiMoMHist);
        const ppiYoY = getLatest(ppiYoYHist);
        const ppiMoM = getLatest(ppiMoMHist);
        const claims = getLatest(claimsHist);
        const claimsAvg = getLatest(claimsAvgHist);

        return {
            cpi: {
                headlineYoY: cpiYoY.value,
                headlineMoM: cpiMoM.value,
                releaseDate: cpiYoY.date,
                history: cpiYoYHist // Array of { value, date }
            },
            ppi: {
                headlineYoY: ppiYoY.value,
                headlineMoM: ppiMoM.value,
                releaseDate: ppiYoY.date,
                history: ppiYoYHist
            },
            joblessClaims: {
                initialClaims: claims.value,
                fourWeekAvg: claimsAvg.value,
                referenceWeekEndDate: claims.date,
                history: claimsHist
            }
        };

    } catch (error) {
        console.error("Error fetching Macro data:", error.message);
        return getMockMacroData();
    }
}

function getMockMacroData() {
    // Generate mock history
    const generateHistory = (startVal, count, dateStepDays) => {
        const arr = [];
        let currentVal = startVal;
        let date = new Date();
        for (let i = 0; i < count; i++) {
            arr.push({
                value: parseFloat(currentVal.toFixed(2)),
                date: date.toISOString().split('T')[0]
            });
            currentVal += (Math.random() - 0.5) * 0.5; // Random walk
            date.setDate(date.getDate() - dateStepDays);
        }
        return arr;
    };

    return {
        cpi: {
            headlineYoY: 3.2,
            headlineMoM: 0.2,
            releaseDate: "2025-10-14",
            history: generateHistory(3.2, 13, 30)
        },
        ppi: {
            headlineYoY: 2.1,
            headlineMoM: 0.1,
            releaseDate: "2025-10-15",
            history: generateHistory(2.1, 13, 30)
        },
        joblessClaims: {
            initialClaims: 220000,
            fourWeekAvg: 215000,
            referenceWeekEndDate: "2025-11-22",
            history: generateHistory(220000, 52, 7)
        }
    };
}

module.exports = { fetchMacroData };
