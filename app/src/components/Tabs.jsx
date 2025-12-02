import React, { useState } from 'react';

const Tabs = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="w-full">
            <div className="flex border-b border-slate-700 mb-6 overflow-x-auto">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        className={`py-2 px-4 text-sm font-medium focus:outline-none whitespace-nowrap ${activeTab === index
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                        onClick={() => setActiveTab(index)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="mt-4">
                {tabs[activeTab].content}
            </div>
        </div>
    );
};

export default Tabs;
