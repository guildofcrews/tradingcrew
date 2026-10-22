export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Blue card (back) */}
      <g transform="rotate(-15, 50, 60)">
        <rect
          x="20"
          y="15"
          width="60"
          height="80"
          rx="8"
          fill="#5B8BD4"
          stroke="#3B5998"
          strokeWidth="3"
        />
        {/* Sparkle on blue card */}
        <path
          d="M35 35 L38 30 L41 35 L38 40 Z"
          fill="white"
          opacity="0.8"
        />
      </g>
      
      {/* Yellow card (front) */}
      <g transform="rotate(10, 70, 60)">
        <rect
          x="40"
          y="20"
          width="60"
          height="80"
          rx="8"
          fill="#F5C542"
          stroke="#C49A2C"
          strokeWidth="3"
        />
        {/* Swap icon circle */}
        <circle cx="70" cy="60" r="18" fill="#2B3A67" />
        {/* Swap arrows */}
        <g transform="translate(70, 60)">
          {/* Top arrow (curved) */}
          <path
            d="M-8 -3 A 10 10 0 0 1 8 -3"
            stroke="#F96D3B"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M5 -7 L8 -3 L4 0"
            stroke="#F96D3B"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom arrow (curved) */}
          <path
            d="M8 3 A 10 10 0 0 1 -8 3"
            stroke="#F96D3B"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M-5 7 L-8 3 L-4 0"
            stroke="#F96D3B"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

export function LogoWordmark({ 
  variant = "light",
  className = "" 
}: { 
  variant?: "light" | "dark";
  className?: string;
}) {
  const tradingColor = variant === "light" ? "#2B3A67" : "#FFFFFF";
  const crewColor = variant === "light" ? "#F96D3B" : "#F5C542";
  const suffixColor = variant === "light" ? "#2B3A67" : "#FFFFFF";
  
  return (
    <svg
      viewBox="0 0 280 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="38"
        fontFamily="'Nunito', sans-serif"
        fontWeight="800"
        fontSize="40"
        fill={tradingColor}
      >
        Trading
      </text>
      <text
        x="148"
        y="38"
        fontFamily="'Nunito', sans-serif"
        fontWeight="800"
        fontSize="40"
        fill={crewColor}
      >
        Crew
      </text>
      {variant === "dark" && (
        <text
          x="225"
          y="38"
          fontFamily="'Nunito', sans-serif"
          fontWeight="600"
          fontSize="24"
          fill={suffixColor}
        >
          .ai
        </text>
      )}
    </svg>
  );
}

export function Logo({ 
  variant = "light",
  className = "" 
}: { 
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark className="h-16 w-16 md:h-20 md:w-20" />
      <LogoWordmark variant={variant} className="h-10 md:h-12 w-auto" />
    </div>
  );
}
