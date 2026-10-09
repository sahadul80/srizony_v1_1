export const BangladeshFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" width="24" height="16" role="img" aria-label="Bangladesh flag">
    <rect width="300" height="180" fill="#006a4e"/>
    <circle cx="135" cy="90" r="60" fill="#f42a41"/>
  </svg>
);

export const BritishFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="24" height="16" role="img" aria-label="British flag">
    <clipPath id="uk-clip">
      <rect width="600" height="300"/>
    </clipPath>
    <g clipPath="url(#uk-clip)">
      <rect width="600" height="300" fill="#012169"/>
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#ffffff" strokeWidth="60"/>
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#C8102E" strokeWidth="40" strokeDasharray="120 120"/>
      <path d="M300,0 V300 M0,150 H600" stroke="#ffffff" strokeWidth="120"/>
      <path d="M300,0 V300 M0,150 H600" stroke="#C8102E" strokeWidth="80"/>
    </g>
  </svg>
);