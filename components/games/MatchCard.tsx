import {
  textShape,
  naruto,
  clashIcon,
  starGlow,
  timerIcon,
  sword,
  diamond,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";

interface MatchCardProps {
  isPremium: boolean;
  amount: number;
  minLeft: number;
}

const MatchCard: React.FC<MatchCardProps> = ({
  isPremium,
  amount,
  minLeft,
}) => {
  return (
    <div
      className={`rounded-2xl p-[1px]  ${
        isPremium
          ? "bg-gradient-to-b from-fuchsia-500/25 to-fuchsia-800/25 border border-fuchsia-500"
          : "bg-gradient-to-b from-green-950/60 to-green-600/60 border border-green-400"
      }`}
    >
      <div
        className={`flex justify-around items-center w-full h-[151px] relative rounded-2xl py-2 px-2.5 overflow-hidden`}
      >
        <Image
          priority={false}
          src={textShape}
          alt="Text"
          className="absolute left-1.5 top-5"
        />
        <Image
          priority={false}
          src={naruto}
          alt="Naruto"
          className="absolute left-9 bottom-[40px]"
        />
        <p className="uppercase font-normal text-[16px] absolute left-4 bottom-[12px]">
          Maskmyth
        </p>

        <div
          className={`z-10 absolute left-1/2 -translate-x-1/2 top-1 flex-wrap h-[32px] flex gap-1 py-2 px-3 outline outline-1 outline-offset-[-1px] rounded-[20px] ${
            isPremium ? "outline-fuchsia-500" : "outline-green-400"
          } `}
        >
          <Image
            priority={false}
            src={isPremium ? diamond : clashIcon}
            alt={"Icon"}
            className=""
          />
          <p className="leading-[14px] font-normal">
            {isPremium ? "Premium" : "Standard"}
          </p>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image
            priority={false}
            src={starGlow}
            alt="star"
            className="h-[109px] w-[109px]"
          />
        </div>

        <p
          className="absolute top-[95px] left-1/2 -translate-x-1/2 text-[32px] z-10 font-normal"
          style={{
            color: "white",
            WebkitTextStroke: "3px transparent",
            background: "linear-gradient(to right, #C27CBC, #D3FF00, #3BE32D)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            letterSpacing: "6px",
          }}
        >
          {amount}
        </p>

        <p className="absolute top-2 right-[5px] flex gap-1 items-center font-normal text-[16px]">
          <Image
            priority={false}
            src={timerIcon}
            alt="Timer"
            className="w-[18px] h-[18px]"
          />
          {minLeft} min left
        </p>

        <div className="absolute bottom-2 right-[11px]">
          <div className="relative">
            <Image
              priority={false}
              src={sword}
              alt="sword"
              className="z-10 absolute -top-2 left-1/2 -translate-x-1/2 w-[17px] h-[17px]"
            />
            <div className="w-24 h-[5px] left-[3px] top-[41px] absolute bg-gradient-to-r from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] blur-[5px] z-10" />
            <div className="relative inline-block">
              <div className="px-3 py-2.5 uppercase text-[16px] font-normal bg-white/30 rounded-[10px]">
                start Duel
              </div>
              <div
                className="absolute inset-0 rounded-[10px] border-[1.8px] border-white pointer-events-none"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "100% 100%",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;
