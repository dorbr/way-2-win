import React from 'react';

const MacroSummaryCard = ({ title, tag, data, type, color }) => {
    if (!data) return null;

    let mainValue, subValue, dateLabel, dateValue;
    let mainLabel = "Headline YoY";
    let subLabel = "Headline MoM";

    if (type === 'cpi' || type === 'ppi') {
        mainValue = `${data.headlineYoY}%`;
        subValue = `${data.headlineMoM}%`;
        dateLabel = "Released";
        dateValue = data.releaseDate;
    } else if (type === 'claims') {
        mainLabel = "Initial Claims";
        subLabel = "4-Week Avg";
        mainValue = data.initialClaims.toLocaleString();
        subValue = data.fourWeekAvg.toLocaleString();
        dateLabel = "Ref Week";
        dateValue = data.referenceWeekEndDate;
    }

    return (
        <div className={`bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700 hover:border-${color}-500 transition-colors`}>
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
                <div className="flex gap-2">
                    {data.isMock && <span className="bg-yellow-900 text-yellow-200 text-xs px-2 py-1 rounded">Mock Data</span>}
                    <span className={`bg-${color}-900 text-${color}-200 text-xs px-2 py-1 rounded`}>{tag}</span>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span className="text-slate-400">{mainLabel}</span>
                    <span className={`text-2xl font-bold text-${color}-400`}>{mainValue}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">{subLabel}</span>
                    <span className="font-medium">{subValue}</span>
                </div>
                <div className="text-xs text-slate-500 text-right mt-2">
                    {dateLabel}: <span>{dateValue}</span>
                </div>
            </div>
        </div>
    );
};

export default MacroSummaryCard;
