import * as Slider from "@radix-ui/react-slider"
import { Star } from "lucide-react"
import { useState } from "react";

interface GradientSliderProps {

}

const GradientSlider: React.FC<GradientSliderProps> = ({ }) => {
    const [value, setValue] = useState([50]);

    return <div className="flex flex-col items-center w-full max-w-md mx-auto py-10">
        <Slider.Root
            className="relative flex items-center w-full h-5"
            value={value}
            onValueChange={setValue}
            max={100}
            min={1}
            step={1}
        >
            <Slider.Track>
                <div
                    className="absolute h-full rounded-full"
                    style={{
                        width: `${value[0]}%`,
                        background:
                            "linear-gradient(90deg, #C27CBC 0%, #D3FF00 50%, #3BE32D 100%)",
                    }}
                ></div>
            </Slider.Track>

            <Slider.Thumb className="w-8 h-8 bg-white rounded-full border-2 border-green-400 flex items-center justify-center shadow-lg">
                <Star className="text-yellow-400 w-4 h-4" />
            </Slider.Thumb>

        </Slider.Root>

        <div
            className="mt-3 text-sm font-semibold text-white px-3 py-1 rounded-md"
            style={{
                background:
                    "linear-gradient(90deg, #C27CBC, #D3FF00, #3BE32D)",
            }}
        >
            {value[0]}%
        </div>
    </div>
}

export default GradientSlider