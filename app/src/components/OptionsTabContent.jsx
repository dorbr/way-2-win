import React, { useState } from 'react';
import OptionsSection from './OptionsSection';
import OptionsHistorySection from './OptionsHistorySection';

const OptionsTabContent = () => {
    const [inputValue, setInputValue] = useState('SPY');
    const [submittedTicker, setSubmittedTicker] = useState('SPY');

    const handleRefresh = () => {
        setSubmittedTicker(inputValue);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-card-bg p-4 rounded-xl border border-slate-700 shadow-lg">
                <label className="text-slate-200 font-medium">Ticker:</label>
                <input
                    type="text"
                    placeholder="Ticker (e.g. SPY)"
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                />
                <button
                    onClick={handleRefresh}
                    className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none"
                >
                    Refresh
                </button>
            </div>

            <OptionsSection ticker={submittedTicker} />
            <OptionsHistorySection ticker={submittedTicker} />
        </div>
    );
};

export default OptionsTabContent;
