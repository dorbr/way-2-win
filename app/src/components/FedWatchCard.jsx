import React from 'react';

const FedWatchCard = ({ data }) => {
    if (!data) return null;

    const cutPct = (data.cutProbability * 100).toFixed(1);
    const holdPct = (data.noChangeProbability * 100).toFixed(1);

    return (
        <div className="bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700 hover:border-blue-500 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Fed Rate Probabilities</h2>
                <div className="flex gap-2">
                    {data.isMock && <span className="bg-yellow-900 text-yellow-200 text-xs px-2 py-1 rounded">Mock Data</span>}
                    <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">CME FedWatch</span>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Meeting Date</span>
                    <span className="font-medium">{data.meetingDate}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Target</span>
                    <span className="font-medium">{data.currentTargetRange}</span>
                </div>
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Cut Probability</span>
                        <span className="text-green-400 font-bold">{cutPct}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${cutPct}%` }}></div>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span>No Change</span>
                        <span className="text-yellow-400 font-bold">{holdPct}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${holdPct}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FedWatchCard;
