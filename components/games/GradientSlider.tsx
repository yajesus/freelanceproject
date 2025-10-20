import * as Slider from "@radix-ui/react-slider"
import { Star } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react";
import "./CustomSlider.css";

interface GradientSliderProps {

}

const GradientSlider: React.FC<GradientSliderProps> = ({ }) => {
    const [value, setValue] = useState(30);
    const [percentage, setPercentage] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    const displayValue = Math.max(1, Math.round((percentage / 100) * 100));
    const updateProgress = useCallback((clientX: any) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let rawX = clientX - rect.left;
        let constrainedX = Math.max(0, Math.min(rawX, rect.width));
        let newPercentage = (constrainedX / rect.width) * 100;

        setPercentage(newPercentage);
    }, []);


    const handleMouseMove = useCallback((e: any) => {
        if (isDragging) {
            updateProgress(e.clientX);
        }
    }, [isDragging, updateProgress]);

    // Handler for stopping drag
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (thumbRef.current != null) {
            thumbRef.current.classList.remove('dragging');
        }
    }, []);

    // Start drag handler
    const handleMouseDown = (e: any) => {
        // Allow dragging from the thumb or the track
        e.preventDefault();
        setIsDragging(true);
        if (thumbRef.current != null) {
            thumbRef.current.classList.add('dragging');
        }
        // If click is on the track, update position immediately
        if (e.target === containerRef.current || e.target.classList.contains('progress-fill')) {
            updateProgress(e.clientX);
        }
    };


    // Set up and tear down global event listeners for dragging
    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return <div
        className="progress-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
    >
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
        <div
            className="star-thumb"
            ref={thumbRef}
            style={{ left: `${percentage}%` }}
        >
            <div className="value-bubble">{displayValue}</div>
            <div className="star-icon" />
        </div>

        <style jsx>{`
        /* CSS from the previous section goes here */
        /* Use CSS variables for easy theming */
        .progress-container {
            /* ... (copy all .progress-container styles here) */
            width: 600px; height: 25px; background-color: #333333; border-radius: 12.5px; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); cursor: pointer; border: 1px solid #000000;
        }

        .progress-fill {
            /* ... (copy all .progress-fill styles here) */
            height: 100%; background: linear-gradient(to right, #DD51CE, #7FC664, #BBDF14); transition: width 0.1s ease-out; box-sizing: border-box; background-clip: padding-box; border: 1px solid transparent; border-image: linear-gradient(to right, #DD51CE, #7FC664, #BBDF14) 1; 
        }

        .star-thumb {
            /* ... (copy all .star-thumb styles here) */
            position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 10; cursor: grab; padding: 5px; border-radius: 50%; border: 3px solid #555852; background-color: #555852; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); 
        }
        
        .star-thumb.dragging {
            cursor: grabbing;
        }

        .star-icon {
            /* ... (copy all .star-icon styles here) */
            width: 40px; height: 40px; background-image: url('/star2.png'); /* IMPORTANT: Use /star2.png assuming it's in the public folder */
            background-size: contain; background-repeat: no-repeat; background-position: center; border-radius: 50%; transform: rotate(43deg); 
        }

        .value-bubble {
            /* ... (copy all .value-bubble styles here) */
            position: absolute; top: -20px; left: 50%; transform: translate(-50%, -100%); background-color: black; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold; font-size: 16px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        }

        .value-bubble::after {
            /* ... (copy all .value-bubble::after styles here) */
            content: ''; position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%) rotate(45deg); width: 10px; height: 10px; background-color: black;
        }
      `}</style>
    </div>
}

export default GradientSlider