import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const SEC_HEADERS = {
    'User-Agent': 'TheWay2Win (dorbaraby@gmail.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'data.sec.gov'
};

const SEC_WWW_HEADERS = {
    'User-Agent': 'TheWay2Win (dorbaraby@gmail.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'www.sec.gov'
};

// Simplified cache for testing
const tickerCikMap: { [ticker: string]: string } = {};

const getCompanyCik = async (ticker: string): Promise<string | null> => {
    const symbol = ticker.toUpperCase();
    if (tickerCikMap[symbol]) return tickerCikMap[symbol];

    try {
        const response = await axios.get('https://www.sec.gov/files/company_tickers.json', { headers: SEC_WWW_HEADERS });
        const data = response.data;
        for (const key in data) {
            const entry = data[key];
            if (entry.ticker === symbol) {
                const cik = entry.cik_str.toString().padStart(10, '0');
                tickerCikMap[symbol] = cik;
                return cik;
            }
        }
    } catch (error) {
        console.error("Error fetching SEC tickers:", error);
    }
    return null;
};

const verifySecData = async (ticker: string) => {
    console.log(`[Verify] Starting verification for ${ticker}...`);
    const cik = await getCompanyCik(ticker);
    if (!cik) {
        console.error("Ticker not found");
        return;
    }
    console.log(`[Verify] CIK for ${ticker}: ${cik}`);

    try {
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        console.log(`[Verify] Fetching submissions from ${url}`);
        const response = await axios.get(url, { headers: SEC_HEADERS });
        const filings = response.data.filings.recent;

        console.log(`[Verify] Found ${filings.accessionNumber.length} filings. Scanning for Form 4...`);

        for (let i = 0; i < filings.accessionNumber.length; i++) {
            const form = filings.form[i];
            if (form !== '4') continue;

            const accessionNumber = filings.accessionNumber[i];
            const primaryDocument = filings.primaryDocument[i];

            if (!primaryDocument.endsWith('.xml')) {
                console.log(`[Verify] Skipping non-xml Form 4: ${primaryDocument}`);
                continue;
            }

            const docUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accessionNumber.replace(/-/g, '')}/${primaryDocument}`;
            console.log(`[Verify] Fetching Form 4 XML from: ${docUrl}`);

            try {
                const docResponse = await axios.get(docUrl, { headers: SEC_WWW_HEADERS, timeout: 5000 });
                const rawXml = docResponse.data;

                // console.log(`[Verify] RAW XML Preview (first 500 chars):\n${rawXml.substring(0, 500)}...`);

                const result = await parseStringPromise(rawXml, { strict: false, trim: true });
                console.log(`[Verify] Parsed XML Keys: ${Object.keys(result).join(', ')}`);

                const validXml = result.OWNERSHIPDOCUMENT;
                if (!validXml) {
                    console.error("Invalid XML structure (missing OWNERSHIPDOCUMENT)");
                    console.log("Full Parsed Result:", JSON.stringify(result, null, 2));
                    continue;
                }

                console.log(`[Verify] OWNERSHIPDOCUMENT Keys: ${Object.keys(validXml).join(', ')}`);

                const reportingOwner = validXml.REPORTINGOWNER?.[0]?.REPORTINGOWNERID?.[0]?.RPTOWNERNAME?.[0];
                console.log(`[Verify] Reporting Owner: ${reportingOwner}`);

                // Check Transactions
                const ndTransactions = validXml.NONDERIVATIVETABLE?.[0]?.NONDERIVATIVETRANSACTION || [];
                console.log(`[Verify] Non-Derivative Transactions Found: ${ndTransactions.length}`);

                if (ndTransactions.length > 0) {
                    const tx = ndTransactions[0];
                    console.log(`[Verify] First Transaction Sample:`, JSON.stringify(tx, null, 2));

                    const txCode = tx.TRANSACTIONCODING?.[0]?.TRANSACTIONCODE?.[0];
                    const shares = tx.TRANSACTIONAMOUNTS?.[0]?.TRANSACTIONSHARES?.[0]?.VALUE?.[0];
                    const price = tx.TRANSACTIONAMOUNTS?.[0]?.TRANSACTIONPRICEPERSHARE?.[0]?.VALUE?.[0];
                    const acqDisp = tx.TRANSACTIONAMOUNTS?.[0]?.TRANSACTIONACQUIREDDISPOSEDCODE?.[0]?.VALUE?.[0];

                    console.log(`[Verify] Interpreted -> Code: ${txCode}, Shares: ${shares}, Price: ${price}, A/D: ${acqDisp}`);
                }

                // Stop after one successful Form 4 for verification
                break;

            } catch (err: any) {
                console.error(`Error processing doc: ${err.message}`);
            }
        }

    } catch (error: any) {
        console.error("Error in verification:", error.message);
    }
};

verifySecData('AAPL');
