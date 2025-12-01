import React from 'react';

const AIInsight = ({ insight }) => {
    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 shadow-lg border border-blue-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
            <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <h2 className="text-xl font-semibold text-blue-100">AI Market Insight</h2>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed italic">
                {insight || "Generating analysis..."}
            </p>
            <div className="mt-4 text-xs text-slate-500">
                Powered by OpenAI
            </div>
        </div>
    );
};

export default AIInsight;
