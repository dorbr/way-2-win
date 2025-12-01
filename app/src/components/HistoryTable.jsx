import React from 'react';

const HistoryTable = ({ history }) => {
    const getFgClass = (val) => {
        if (val < 25) return "text-red-500";
        if (val < 45) return "text-red-400";
        if (val < 55) return "text-yellow-400";
        if (val < 75) return "text-green-400";
        return "text-green-500";
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Weekly Market Snapshot</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                            <th className="p-3">Date</th>
                            <th className="p-3">VIX Open</th>
                            <th className="p-3">VIX Close</th>
                            <th className="p-3">F&G Open</th>
                            <th className="p-3">F&G Close</th>
                            <th className="p-3">Fed Cut Open</th>
                            <th className="p-3">Fed Cut Close</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-300">
                        {!history || history.length === 0 ? (
                            <tr><td colSpan="7" className="p-4 text-center text-slate-500">No historical data available</td></tr>
                        ) : (
                            history.map((row, index) => (
                                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-medium text-slate-200">
                                        {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="p-3">{row.vixOpen ? row.vixOpen.toFixed(2) : '-'}</td>
                                    <td className="p-3">{row.vixClose ? row.vixClose.toFixed(2) : '-'}</td>
                                    <td className="p-3">
                                        {row.fgOpen ? <span className={`${getFgClass(row.fgOpen)} font-bold`}>{row.fgOpen}</span> : '-'}
                                    </td>
                                    <td className="p-3">
                                        {row.fgClose ? <span className={`${getFgClass(row.fgClose)} font-bold`}>{row.fgClose}</span> : '-'}
                                    </td>
                                    <td className="p-3">{row.fedOpen ? `${(row.fedOpen * 100).toFixed(1)}%` : '-'}</td>
                                    <td className="p-3">{row.fedClose ? `${(row.fedClose * 100).toFixed(1)}%` : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryTable;
