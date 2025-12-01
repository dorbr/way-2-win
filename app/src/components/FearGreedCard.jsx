import React from 'react';

const FearGreedCard = ({ data }) => {
    if (!data) return null;

    let valueClass = "text-5xl font-bold mb-2 ";
    if (data.value < 25) valueClass += "text-red-600";
    else if (data.value < 45) valueClass += "text-red-400";
    else if (data.value < 55) valueClass += "text-yellow-400";
    else if (data.value < 75) valueClass += "text-green-400";
    else valueClass += "text-green-600";

    return (
        <div className="bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700 hover:border-orange-500 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Fear & Greed</h2>
                <span className="bg-orange-900 text-orange-200 text-xs px-2 py-1 rounded">Sentiment</span>
            </div>
            <div className="flex flex-col items-center justify-center py-2">
                <div className={valueClass}>{data.value}</div>
                <div className="text-lg font-medium text-slate-300">{data.label}</div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mt-4 relative">
                <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${data.value}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Fear</span>
                <span>Greed</span>
            </div>
        </div>
    );
};

export default FearGreedCard;
