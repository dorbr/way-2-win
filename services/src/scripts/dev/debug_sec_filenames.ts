import axios from 'axios';

const SEC_WWW_HEADERS = {
    'User-Agent': 'TheWay2Win (dorbaraby@gmail.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'www.sec.gov'
};

const cik = '320193'; // Apple
const accession = '000032019324000126'; // Recent filing
const originalPrimary = 'xslF345X05/wk-form4_1731022209.xml';

const filenames = [
    'form4.xml',
    'primary_doc.xml',
    'wk-form4_1731022209.xml', // Moved to root
    'wf-form4_1731022209.xml', // Typo check?
    originalPrimary // Baseline (should work but return HTML)
];

const test = async () => {
    for (const name of filenames) {
        const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accession}/${name}`;
        console.log(`Testing ${url}...`);
        try {
            const res = await axios.head(url, { headers: SEC_WWW_HEADERS });
            console.log(`[SUCCESS] ${name} exists! Status: ${res.status}, Type: ${res.headers['content-type']}`);

            // If success, peek content
            if (name !== originalPrimary) {
                const contentRes = await axios.get(url, { headers: SEC_WWW_HEADERS });
                const start = contentRes.data.substring(0, 200);
                console.log(`[CONTENT] ${start}`);
            }

        } catch (e: any) {
            console.log(`[FAIL] ${name}: ${e.message}`);
        }
    }
};

test();
