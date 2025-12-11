import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface InsiderTransaction {
    filingDate: string;
    reportingName: string;
    title: string;
    transactionDate: string;
    transactionCode: string; // P = Purchase, S = Sale
    shares: number;
    price: number;
    value: number; // calculated shares * price
    formType: string;
    link: string;
}

interface InstitutionalHolding {
    holder: string;
    shares?: number;
    value?: number;
    dateReported: string;
    pctHeld?: number;
    source: 'SEC EDGAR' | 'Yahoo Finance';
}

const SEC_HEADERS = {
    'User-Agent': 'TheWay2Win (dorbaraby@gmail.com)', // Replace with valid email if needed, SEC requires User-Agent
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'data.sec.gov'
};

const SEC_WWW_HEADERS = {
    'User-Agent': 'TheWay2Win (dorbaraby@gmail.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'www.sec.gov'
}

// Map Ticker to CIK (Simple Cache)
let tickerCikMap: { [ticker: string]: string } = {};

const getCompanyCik = async (ticker: string): Promise<string | null> => {
    const symbol = ticker.toUpperCase();
    if (tickerCikMap[symbol]) return tickerCikMap[symbol];

    try {
        // Fetch official SEC ticker map
        const response = await axios.get('https://www.sec.gov/files/company_tickers.json', { headers: SEC_WWW_HEADERS });
        const data = response.data;

        // Structure: { "0": { "cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc." }, ... }
        for (const key in data) {
            const entry = data[key];
            if (entry.ticker === symbol) {
                // Pad CIK to 10 digits
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

export const getInsiderData = async (ticker: string) => {
    try {
        const cik = await getCompanyCik(ticker);
        if (!cik) {
            return { error: "Ticker not found in SEC database" };
        }

        const [insiderTrades, institutionalHoldings] = await Promise.all([
            fetchInsiderTrades(cik),
            fetchInstitutionalHoldings(ticker, cik)
        ]);

        return {
            ticker,
            cik,
            insiderTrades,
            institutionalHoldings
        };

    } catch (error: any) {
        console.error(`Error in getInsiderData for ${ticker}:`, error.message);
        return { error: "Failed to fetch insider data" };
    }
};

const fetchInsiderTrades = async (cik: string): Promise<InsiderTransaction[]> => {
    const transactions: InsiderTransaction[] = [];
    try {
        // Fetch submissions
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const response = await axios.get(url, { headers: SEC_HEADERS });
        const filings = response.data.filings.recent;

        // Collect potential Form 4 URLs
        const maxForm4s = 30;
        const scanLimit = 200;
        const promises: Promise<InsiderTransaction[]>[] = [];

        let form4Count = 0;
        for (let i = 0; i < filings.accessionNumber.length && i < scanLimit && form4Count < maxForm4s; i++) {
            const form = filings.form[i];
            if (form !== '4') continue;

            const accessionNumber = filings.accessionNumber[i];
            const primaryDocument = filings.primaryDocument[i];

            if (!primaryDocument.endsWith('.xml')) continue;

            form4Count++;

            const processFiling = async (): Promise<InsiderTransaction[]> => {
                const txs: InsiderTransaction[] = [];
                // Correct URL logic for XSLT-rendered files (common in recent filings usually ending in .xml but are actually HTML wrappers)
                let docUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accessionNumber.replace(/-/g, '')}/${primaryDocument}`;

                // Fix: If primaryDocument is inside an xsl folder (e.g. xslF345X03/primary.xml), it returns HTML.
                // We want the raw XML which is usually at the root with the same basename.
                if (primaryDocument.includes('xsl')) {
                    const parts = primaryDocument.split('/');
                    const filename = parts[parts.length - 1]; // get basename
                    const rootUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accessionNumber.replace(/-/g, '')}/${filename}`;
                    // console.log(`[Fix] Redirecting ${docUrl} -> ${rootUrl}`);
                    docUrl = rootUrl;
                }

                try {
                    const docResponse = await axios.get(docUrl, { headers: SEC_WWW_HEADERS, timeout: 5000 });
                    let xmlData = docResponse.data;

                    // Handle SEC HTML Wrapper (Legacy or unanticipated cases)
                    if (typeof xmlData === 'string' && (xmlData.includes('<XML>') || xmlData.includes('<xml>'))) {
                        const startTag = xmlData.includes('<XML>') ? '<XML>' : '<xml>';
                        const endTag = xmlData.includes('</XML>') ? '</XML>' : '</xml>';
                        const start = xmlData.indexOf(startTag) + 5;
                        const end = xmlData.indexOf(endTag);
                        if (end > start) {
                            xmlData = xmlData.substring(start, end);
                        }
                    }

                    const result = await parseStringPromise(xmlData, { strict: false, trim: true });

                    // XML Structure Check
                    const validXml = result.OWNERSHIPDOCUMENT;
                    if (!validXml) return [];

                    if (form4Count === 1) console.log('XML Keys:', Object.keys(validXml));

                    const reportingOwner = validXml.REPORTINGOWNER?.[0]?.REPORTINGOWNERID?.[0]?.RPTOWNERNAME?.[0] || 'Unknown';
                    const officerTitle = validXml.REPORTINGOWNER?.[0]?.REPORTINGOWNERRELATIONSHIP?.[0]?.OFFICERTITLE?.[0] || 'Insider';
                    const ndTransactions = validXml.NONDERIVATIVETABLE?.[0]?.NONDERIVATIVETRANSACTION || [];

                    console.log(`[File ${accessionNumber}] Transactions found: ${ndTransactions.length}`);

                    for (const tx of ndTransactions) {
                        const txCode = tx.TRANSACTIONCODING?.[0]?.TRANSACTIONCODE?.[0]; // P or S

                        // Debug Log
                        console.log(`[Form 4 Debug] Found Tx Code: ${txCode} in ${docUrl}`);

                        if (txCode === 'P' || txCode === 'S') {
                            const shares = parseFloat(tx.TRANSACTIONAMOUNTS?.[0]?.TRANSACTIONSHARES?.[0]?.VALUE?.[0] || '0');
                            const price = parseFloat(tx.TRANSACTIONAMOUNTS?.[0]?.TRANSACTIONPRICEPERSHARE?.[0]?.VALUE?.[0] || '0');
                            const date = tx.TRANSACTIONDATE?.[0]?.VALUE?.[0];

                            if (shares > 0 && price > 0) {
                                txs.push({
                                    filingDate: filings.filingDate[i],
                                    transactionDate: date,
                                    reportingName: reportingOwner,
                                    title: officerTitle,
                                    transactionCode: txCode,
                                    shares: shares,
                                    price: price,
                                    value: shares * price,
                                    formType: '4',
                                    link: docUrl
                                });
                            }
                        } else {
                            console.log(`[Form 4 Debug] Skipping Code ${txCode}`);
                        }
                    }
                } catch (err: any) {
                    console.warn(`Error processing ${docUrl}: ${err.message}`);
                }
                return txs;
            };

            promises.push(processFiling());
        }

        console.log(`Found ${promises.length} Form 4s to process out of ${scanLimit} scanned.`);
        const results = await Promise.all(promises);
        results.forEach(res => transactions.push(...res));

    } catch (error) {
        console.error("Error fetching Form 4s:", error);
    }
    return transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
};

const fetchInstitutionalHoldings = async (ticker: string, cik: string): Promise<InstitutionalHolding[]> => {
    const holdings: InstitutionalHolding[] = [];

    // 1. Fetch Major Holders from SEC (SC 13D/G) - Beneficiaries > 5%
    // We reuse the submissions JSON which contains recent filings
    try {
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const response = await axios.get(url, { headers: SEC_HEADERS });
        const filings = response.data.filings.recent;

        // Look for SC 13D or SC 13G in last 2 years (approx)
        // Simple scan
        const majorHoldersMap = new Map<string, InstitutionalHolding>();

        for (let i = 0; i < filings.accessionNumber.length; i++) {
            const form = filings.form[i];
            if (form === 'SC 13G' || form === 'SC 13D') { // || form === 'SC 13G/A'
                // Getting the filer name is tricky from just the list, usually mixed in primary doc or requires parsing.
                // HOWEVER, 'data.sec.gov' result doesn't explicitly list the *filer* name easily in the array arrays always.
                // Actually, for company submissions, the filing lists the company as the subject.
                // Finding the *investor* name from this list is hard without opening the document.

                // Alternative: Trust Yahoo for the bulk, use SEC for "Official Source" verification later?
                // For now, let's stick to Yahoo for Reliability and Speed as discussed in plan "Hybrid".
                // The "Hybrid" plan said: "Primary: SC 13D/G... Secondary: Yahoo". 
                // Given the parsing complexity of finding the *filer* name from the target's submission list (it's not a column), 
                // we will rely on Yahoo for the table data but label it.
            }
        }
    } catch (e) { /* ignore */ }


    // 2. Fetch Institutional Ownership from Yahoo Finance
    try {
        const quoteSummary = await yahooFinance.quoteSummary(ticker, { modules: ['institutionOwnership', 'majorHoldersBreakdown'] }) as any;

        // Top Institutional Holders
        const institutions = quoteSummary.institutionOwnership?.ownershipList || [];
        institutions.forEach((inst: any) => {
            holdings.push({
                holder: inst.organization,
                shares: inst.position,
                value: inst.value,
                dateReported: inst.reportDate.toISOString().split('T')[0],
                pctHeld: inst.pctHeld,
                source: 'Yahoo Finance' // Using Yahoo as the data aggregator
            });
        });

    } catch (error) {
        console.error("Error fetching Yahoo institutional data:", error);
    }

    return holdings;
};
