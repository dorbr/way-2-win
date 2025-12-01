import axios from 'axios';

const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredObservation {
    value: number;
    date: string;
}

interface MacroData {
    cpi: {
        headlineYoY: number;
        headlineMoM: number;
        releaseDate: string;
        history: FredObservation[];
    };
    ppi: {
        headlineYoY: number;
        headlineMoM: number;
        releaseDate: string;
        history: FredObservation[];
    };
    joblessClaims: {
        initialClaims: number;
        fourWeekAvg: number;
        referenceWeekEndDate: string;
        history: FredObservation[];
    };
}

async function fetchFredSeries(seriesId: string, units: string = 'lin', apiKey: string, limit: number = 1): Promise<FredObservation[]> {
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
            return response.data.observations.map((obs: any) => ({
                value: parseFloat(obs.value),
                date: obs.date
            }));
        }
        return [];
    } catch (error: any) {
        console.error(`Error fetching FRED series ${seriesId}:`, error.message);
        return [];
    }
}

let cachedMacroData: MacroData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

export async function fetchMacroData(): Promise<MacroData> {
    const now = Date.now();
    if (cachedMacroData && (now - lastFetchTime < CACHE_DURATION_MS)) {
        console.log("Returning cached macro data");
        return cachedMacroData;
    }

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
        const getLatest = (arr: FredObservation[]) => arr && arr.length > 0 ? arr[0] : { value: 0, date: new Date().toISOString().split('T')[0] };

        const cpiYoY = getLatest(cpiYoYHist);
        const cpiMoM = getLatest(cpiMoMHist);
        const ppiYoY = getLatest(ppiYoYHist);
        const ppiMoM = getLatest(ppiMoMHist);
        const claims = getLatest(claimsHist);
        const claimsAvg = getLatest(claimsAvgHist);

        cachedMacroData = {
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
        lastFetchTime = now;
        return cachedMacroData;

    } catch (error: any) {
        console.error("Error fetching Macro data:", error.message);
        // If we have stale cache, return it? Or mock?
        if (cachedMacroData) return cachedMacroData;
        return getMockMacroData();
    }
}

function getMockMacroData(): MacroData {
    // Generate mock history
    const generateHistory = (startVal: number, count: number, dateStepDays: number): FredObservation[] => {
        const arr: FredObservation[] = [];
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
