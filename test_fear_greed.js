const { fetchFearGreedData } = require('./fetchers/fearGreed');

async function test() {
    console.log("Testing Fear & Greed Fetcher...");
    const result = await fetchFearGreedData();
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
