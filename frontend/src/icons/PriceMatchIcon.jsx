// src/icons/PriceMatchIcon.jsx
import React from 'react';

function PriceMatchIcon({ active = false, className = "" }) {
    const fill = active ? 'rgb(239 68 68)' : 'none'; // DaisyUI `fill-error` could also work
    const stroke = active ? 'rgb(239 68 68)' : 'currentColor'; // DaisyUI `stroke-error`
    const textFill = active ? 'white' : 'currentColor'; // DaisyUI `fill-error-content` or `stroke-current`

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            className={`w-5 h-5 inline-block ${className}`} // Standard classes
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            {/* Simple placeholder 'P' - replace with a better icon if desired */}
            <text x="50%" y="63%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="bold"
                fill={textFill}
                stroke="none" // Ensure text P isn't stroked oddly
            >
                P
            </text>
        </svg>
    );
}

export default PriceMatchIcon;