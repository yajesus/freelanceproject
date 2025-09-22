"use client";
import { GameItemBg, GameItemInfoBg } from "@/images";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
interface GameItemProps {
  game: {
    id: number;
    name: string;
    smallDescription: string;
    image: StaticImageData;
    rate: number;
    link: string;
  };
}

const GameItem: React.FC<GameItemProps> = ({ game }) => {
  return (
    <Link
      className="w-[160px] h-[220px] flex rounded-[11px] justify-center items-center flex-col pt-[20px]"
      style={{ backgroundImage: `url(${GameItemBg.src})` }}
      href={`${game.link}`}
    >
      <p className="text-white text-[20px]" style={{ opacity: 0.06 }}>
        {game.name}
      </p>
      <Image
        priority={false}
        src={game.image}
        alt={game.name}
        width={100}
        height={100}
      />
      <div
        className="w-[90%] h-[100%] flex rounded-[11px] justify-center items-center flex-col"
        style={{
          backgroundImage: `url(${GameItemInfoBg.src})`,
          backgroundSize: "contain",
        }}
      >
        <p className="text-black text-[14px] text-center translate-y-3">
          {game.rate}
        </p>
        <p className="text-white text-[11px] text-center mt-[20px]">
          {game.name}
        </p>
        <p
          className="text-white text-[11px] text-center font-light"
          style={{ opacity: 0.65 }}
        >
          {game.smallDescription}
        </p>
      </div>
    </Link>
  );
};

export default GameItem;
