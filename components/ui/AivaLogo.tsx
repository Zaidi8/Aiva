export function AivaLogo({ className = "w-10 h-10", version }: { className?: string; version?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circular background with gradient */}
      <defs>
        <linearGradient id="aivaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      
      {/* Main circle */}
      <circle cx="50" cy="50" r="48" fill="url(#aivaGradient)" />
      
      {/* AI Receptionist headset representation */}
      {/* Head circle */}
      <circle cx="50" cy="45" r="16" fill="white" opacity="0.9" />
      
      {/* Headset band */}
      <path
        d="M 34 45 Q 34 30, 50 30 Q 66 30, 66 45"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Left ear piece */}
      <rect x="30" y="42" width="6" height="10" rx="2" fill="white" />
      
      {/* Right ear piece */}
      <rect x="64" y="42" width="6" height="10" rx="2" fill="white" />
      
      {/* Microphone boom */}
      <path
        d="M 36 48 Q 38 60, 45 62"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Microphone end */}
      <circle cx="46" cy="63" r="3" fill="white" />
    </svg>
  );
}