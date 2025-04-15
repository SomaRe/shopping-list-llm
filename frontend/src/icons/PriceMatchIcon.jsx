// src/icons/PriceMatchIcon.jsx
import { RiPriceTag3Fill, RiPriceTag3Line } from 'react-icons/ri';

function PriceMatchIcon({ active = false, className = "" }) {
    return active ? (
        <RiPriceTag3Fill className={`text-red-200 h-4 w-4 ${className}`} />
    ) : (
        <RiPriceTag3Line className={`text-current h-4 w-4 ${className}`} />
    );
}

export default PriceMatchIcon;
