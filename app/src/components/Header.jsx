import React, { useEffect, useState } from 'react';
import TickerManager from './TickerManager';

const Header = ({ lastUpdated }) => {
    const [currentDate, setCurrentDate] = useState('');
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    useEffect(() => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setCurrentDate(new Date().toLocaleDateString('en-US', options));
    }, []);

    return (
        <>
            <header className="mb-8 flex justify-between items-center max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-400">Daily Market Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Latest financial & macro indicators</p>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsManagerOpen(true)}
                        className="text-sm bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded transition-colors"
                    >
                        Manage Tickers
                    </button>
                    <div className="text-right">
                        <div className="text-xl font-semibold">{currentDate || 'Loading...'}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Last Updated: <span>{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '--'}</span>
                        </div>
                    </div>
                </div>
            </header>
            <TickerManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
        </>
    );
};

export default Header;
