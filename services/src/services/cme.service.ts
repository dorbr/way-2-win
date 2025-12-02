import axios from 'axios';

interface CMEData {
    meetingDate: string;
    currentTargetRange: string;
    cutProbability: number;
    noChangeProbability: number;
    hikeProbability: number;
    lastUpdatedUtc: string;
    history?: any[];
    isMock?: boolean;
}

export async function fetchCMEData(): Promise<CMEData> {
    try {
        const token = process.env.CME_FEDWATCH_TOKEN;
        if (!token) {
            console.warn("CME_FEDWATCH_TOKEN is missing. Returning mock data.");
            return getMockCMEData();
        }

        // Note: This is a hypothetical endpoint structure based on standard REST practices.
        // The actual endpoint is https://markets.api.cmegroup.com/fedwatch/v1
        // We are requesting forecasts.
        const response = await axios.get('https://markets.api.cmegroup.com/fedwatch/v1/forecasts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = response.data;

        // Logic to parse the specific response structure would go here.
        // Since we don't have the exact schema, we'll implement a generic parser 
        // that looks for the next meeting and probabilities.

        // Assuming the API returns a list of meetings
        const nextMeeting = data.find((m: any) => new Date(m.meetingDate) > new Date());

        if (!nextMeeting) {
            throw new Error("No upcoming meeting found in CME data");
        }

        return {
            meetingDate: nextMeeting.meetingDate,
            currentTargetRange: nextMeeting.currentTargetRange, // e.g., "425-450"
            cutProbability: calculateProbability(nextMeeting.probabilities, 'cut'),
            noChangeProbability: calculateProbability(nextMeeting.probabilities, 'no_change'),
            hikeProbability: calculateProbability(nextMeeting.probabilities, 'hike'),
            lastUpdatedUtc: new Date().toISOString(), // Or from response if available
            isMock: false
        };

    } catch (error: any) {
        console.error("Error fetching CME data:", error.message);
        return getMockCMEData(); // Fallback to mock for stability
    }
}

function calculateProbability(probs: any, type: string): number {
    // Placeholder logic - depends on how 'probs' is structured
    // Assuming probs is an array of { targetRate: "400-425", probability: 0.15 }
    // and we know the current target.
    // For now, returning mock values if real parsing fails or for the mock function.
    return 0;
}

function getMockCMEData(): CMEData {
    return {
        meetingDate: "2025-12-18",
        currentTargetRange: "4.25–4.50%",
        cutProbability: 0.65,
        noChangeProbability: 0.35,
        hikeProbability: 0.0,
        lastUpdatedUtc: new Date().toISOString(),
        history: [
            { date: "2025-11-28", cutProbability: 0.65 },
            { date: "2025-11-27", cutProbability: 0.62 },
            { date: "2025-11-26", cutProbability: 0.60 },
            { date: "2025-11-25", cutProbability: 0.58 },
            { date: "2025-11-24", cutProbability: 0.55 },
            { date: "2025-11-24", cutProbability: 0.55 }
        ],
        isMock: true
    };
}
