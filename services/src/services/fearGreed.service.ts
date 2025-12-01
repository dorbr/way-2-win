import axios from 'axios';

interface FearGreedData {
    value: number;
    label: string;
    lastUpdatedUtc: string;
    history: any[];
}

export async function fetchFearGreedData(): Promise<FearGreedData> {
    try {
        // Unofficial endpoint found in research
        const response = await axios.get('https://production.dataviz.cnn.io/index/fearandgreed/graphdata/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.cnn.com/'
            }
        });

        const data = response.data;

        // The API returns { fear_and_greed: { score: 72, rating: "Greed", ... } }
        // OR it might return a graph data structure.
        // Based on research: "production.dataviz.cnn.io.../graphdata/" returns historical data.
        // Let's assume we get a list and take the last one, or the current score object if available.

        // If the response is the graph data, it usually has 'fear_and_greed_historical' array.
        // But often there is a 'fear_and_greed' object with current data.

        let score = 0;
        let rating = "Neutral";
        let updated = new Date().toISOString();
        let history: any[] = [];

        // Extract history (last 5 days)
        if (data.fear_and_greed_historical && data.fear_and_greed_historical.data) {
            const fullHistory = data.fear_and_greed_historical.data;
            // Get last 5 entries
            history = fullHistory.slice(-5).map((item: any) => ({
                date: new Date(item.x).toISOString().split('T')[0],
                value: Math.round(item.y),
                label: toTitleCase(getLabelForScore(Math.round(item.y)))
            })).reverse(); // Newest first

            // Use latest for current if not found elsewhere
            const lastPoint = fullHistory[fullHistory.length - 1];
            score = Math.round(lastPoint.y);
            updated = new Date(lastPoint.x).toISOString();
            rating = toTitleCase(getLabelForScore(score));
        }

        // Prefer current score object if available and fresher
        if (data.fear_and_greed && data.fear_and_greed.score) {
            score = Math.round(data.fear_and_greed.score);
            rating = toTitleCase(data.fear_and_greed.rating);
            updated = data.fear_and_greed.timestamp;
        }

        return {
            value: score,
            label: rating,
            lastUpdatedUtc: updated,
            history: history
        };

    } catch (error: any) {
        console.error("Error fetching Fear & Greed data:", error.message);
        // Only use mock data as a fallback in case of error
        return getMockFearGreedData();
    }
}

function getLabelForScore(score: number): string {
    if (score <= 25) return "Extreme Fear";
    if (score <= 45) return "Fear";
    if (score <= 55) return "Neutral";
    if (score <= 75) return "Greed";
    return "Extreme Greed";
}

function toTitleCase(str: string): string {
    if (!str) return "Neutral";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getMockFearGreedData(): FearGreedData {
    console.warn("Using MOCK Fear & Greed data due to fetch error.");
    return {
        value: 65,
        label: "Greed",
        lastUpdatedUtc: new Date().toISOString(),
        history: [
            { date: "2025-11-28", value: 65, label: "Greed" },
            { date: "2025-11-27", value: 62, label: "Greed" },
            { date: "2025-11-26", value: 58, label: "Greed" },
            { date: "2025-11-25", value: 55, label: "Greed" },
            { date: "2025-11-24", value: 50, label: "Neutral" }
        ]
    };
}
