import OpenAI from 'openai';

export async function generateMarketInsight(macroData: any, stockData: any): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;

    // Fallback if no key provided
    if (!apiKey || apiKey === 'your_openai_key_here') {
        console.warn("OPENAI_API_KEY is missing. Returning mock insight.");
        return `AI Insight: Market data suggests a mixed signal environment. While CPI shows steady trends, the volatility in Jobless Claims warrants close monitoring. (Mock Insight - Add API Key for real analysis of ${stockData ? stockData.symbol : 'stocks'})`;
    }

    try {
        const openai = new OpenAI({ apiKey: apiKey });

        let stockInfo = "";
        if (stockData) {
            stockInfo = `
            Stock: ${stockData.symbol}
            - Latest Close: $${stockData.close}
            - Recent Trend (5 days): ${JSON.stringify(stockData.history.slice(-5).map((h: any) => h.close))}
            `;
        }

        // Construct a prompt with the data
        const prompt = `
        You are a financial analyst. Analyze the relationship between the following US economic data and the performance of ${stockData ? stockData.symbol : "the market"}.
        
        Economic Data:
        - CPI YoY: ${macroData.cpi.headlineYoY}%
        - PPI YoY: ${macroData.ppi.headlineYoY}%
        - Jobless Claims (Latest): ${macroData.joblessClaims.initialClaims.toLocaleString()}
        - Jobless Claims (4-Week Avg): ${macroData.joblessClaims.fourWeekAvg.toLocaleString()}
        
        ${stockInfo}

        Provide a concise 2-3 sentence insight. Focus specifically on how the economic indicators (inflation and labor market) might be influencing or correlating with the recent performance of ${stockData ? stockData.symbol : "the stock market"}. Mention if the stock seems sensitive to these macro factors.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful financial analyst." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150
        });

        return response.choices[0].message.content?.trim() || "No insight generated.";

    } catch (error: any) {
        console.error("Error generating AI insight:", error.message);
        return "AI Insight: Unable to generate real-time analysis at the moment. Please check the system logs.";
    }
}
