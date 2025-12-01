import React from 'react';

const VixCard = ({ data }) => {
    if (!data) return null;

    return (
        <div className="bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700 hover:border-purple-500 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-200">VIX Index</h2>
                <span className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded">Volatility</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Open</div>
                    <div className="text-xl font-bold">{data.todayOpen.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Close/Latest</div>
                    <div className="text-xl font-bold text-purple-400">{data.todayClose.toFixed(2)}</div>
                </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-slate-400">Previous Close</span>
                <span className="font-medium">{data.previousClose.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default VixCard;
