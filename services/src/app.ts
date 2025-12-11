import express from 'express';
import cors from 'cors';
import path from 'path';
import dashboardRoutes from './routes/dashboard.routes';
import stockRoutes from './routes/stock.routes';
import optionsRoutes from './routes/options.routes';
import analysisRoutes from './routes/analysis.routes';
import tickerRoutes from './routes/ticker.routes';
import macroRoutes from './routes/macro.routes';
import shillerRoutes from './routes/shiller.routes';
import earningsRoutes from './routes/earnings.routes';
import insidersRoutes from './routes/insiders.routes';

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../../app/dist')));
app.use(express.json());

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/tickers', tickerRoutes);
app.use('/api/macro', macroRoutes);
app.use('/api/shiller', shillerRoutes);
app.use('/api/earnings', earningsRoutes);
// app.use('/api/sp500', sp500Routes); // Not implemented yet
// app.use('/api/vix', vixRoutes); // Not implemented yet
// app.use('/api/stocks', stocksRoutes); // Not implemented yet
app.use('/api/insiders', insidersRoutes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../app/dist/index.html'));
});

export default app;
