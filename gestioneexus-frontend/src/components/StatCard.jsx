// src/components/StatCard.jsx
import React from 'react';

const StatCard = ({ title, value }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center">
            <div className="w-12 h-12 bg-[#5D1227] rounded-full flex items-center justify-center mr-4 text-white font-bold text-xl">
                {title.charAt(0)}
            </div>
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;