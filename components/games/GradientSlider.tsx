import { Slider } from "radix-ui";
import { Star } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react";
import "./CustomSlider.css";

interface GradientSliderProps {
    value: number;
    onchange: (value: number[]) => void;
}

const GradientSlider: React.FC<GradientSliderProps> = ({ value, onchange }: GradientSliderProps) => {
    // const [value, setValue] = useState(30);

    return <form>
        <Slider.Root
            className="SliderRoot"
            defaultValue={[0]}
            value={[value]}
            onValueChange={onchange}
            max={10000} // Adjust max value as needed
            step={100}
            aria-label="Volume"
        >
            <Slider.Track className="SliderTrack">
                <div className="SliderTrackBackgroundGradient" />
                <Slider.Range
                    className="SliderRange"
                    style={
                        {
                            ["--range-margin" as any]:
                                (value / 10000) * 100 <= 30
                                    ? "-17px"
                                    : (value / 10000) * 100 >= 90
                                        ? "10px"
                                        : "0px",
                        } as React.CSSProperties
                    }
                />
            </Slider.Track>
            <Slider.Thumb className="SliderThumb">
                <div className="SliderIndicator">{value}</div>
            </Slider.Thumb>
        </Slider.Root>
    </form>
}

export default GradientSlider