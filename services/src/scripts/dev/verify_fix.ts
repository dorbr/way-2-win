import { getInsiderData } from '../../services/insiders.service';

const verify = async () => {
    console.log('Testing getInsiderData for AAPL...');
    try {
        const result = await getInsiderData('AAPL');

        if (result.error || !result.insiderTrades) {
            console.error('Error returned:', result.error || 'No insider trades returned');
            return;
        }

        console.log(`Fetched ${result.insiderTrades.length} trades.`);

        if (result.insiderTrades.length > 0) {
            console.log('First trade sample:');
            console.log(result.insiderTrades[0]);
        } else {
            console.warn('No trades found! Fix might not be working.');
        }

    } catch (error) {
        console.error('Test failed with exception:', error);
    }
};

verify();
