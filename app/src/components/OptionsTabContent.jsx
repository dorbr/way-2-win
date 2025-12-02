import React, { useState } from 'react';
import debounce from 'lodash.debounce';
import OptionsSection from './OptionsSection';
import OptionsHistorySection from './OptionsHistorySection';

const OptionsTabContent = () => {
    const [inputValue, setInputValue] = useState('SPY');
    const [submittedTicker, setSubmittedTicker] = useState('SPY');

    const debouncedSetSubmittedTicker = React.useCallback(
        debounce((val) => {
            setSubmittedTicker(val);
        }, 1000),
        []
    );

    const handleInputChange = (e) => {
        const val = e.target.value.toUpperCase();
        setInputValue(val);
        debouncedSetSubmittedTicker(val);
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
                    onChange={handleInputChange}
                />
            </div>

            <OptionsSection ticker={submittedTicker} />
            <OptionsHistorySection ticker={submittedTicker} />
        </div>
    );
};

export default OptionsTabContent;
