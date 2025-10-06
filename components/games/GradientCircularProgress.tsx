interface GradientCircularProgressProps {
    radius: number;
    value: number;
}

const GradientCircularProgress: React.FC<GradientCircularProgressProps> = ({ radius, value }) => {
    const stroke = 5;
    const normalizedRadius = radius - stroke * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = (value > 0) ?
        circumference - ((3 - value) / 2) * circumference : circumference;

    return <div className="flex items-center justify-center w-40 h-40 relative">
        <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
        >
            {/* Background Circle */}
            <circle
                stroke="#1f2937"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            {/* Gradient Definition */}
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C27CBC" />
                    <stop offset="50%" stopColor="#D3FF00" />
                    <stop offset="100%" stopColor="#3BE32D" />
                </linearGradient>
            </defs>
            {/* Progress Circle */}
            <circle
                stroke="url(#grad)"
                fill="transparent"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference + " " + circumference}
                style={{
                    strokeDashoffset,
                    transition: "stroke-dashoffset 0.35s ease",
                }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>

        {/* Centered Value */}
        <div className="absolute text-2xl font-semibold text-white">
            {(value > 0) ? value : 0}
        </div>
    </div>
}

export default GradientCircularProgress