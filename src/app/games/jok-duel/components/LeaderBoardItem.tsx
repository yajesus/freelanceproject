import { useEffect, useState } from "react";
import Image from "next/image";
import { cup, gamePlayerBg, pos1, pos2, pos3 } from "../images";
import { shopImageMap } from "@/images";

export const LeaderBoardItem = ({ item, isMine, isMineTop }: any) => {
  const [avatar, setAvatar] = useState<any>(null);
  if (item == null) return null;
  useEffect(() => {
    if (typeof window !== "undefined" && item.avatar) {
      const allAvatars = JSON.parse(localStorage.getItem("shopItems") || "[]");
      const found = allAvatars.find((i: any) => i.id === item.avatar);
      setAvatar(found);
    }
  }, [item]);

  const truncate = (str: string, max = 8) =>
    typeof str === "string" && str.length > max
      ? str.slice(0, max) + "..."
      : str || "Unknown";
  const AvatarImg = (
    <div
      className="w-[24px] h-[24px] rounded-full"
      style={{
        backgroundImage: `url(${gamePlayerBg.src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {avatar != null ? (
        <Image
          priority={false}
          src={shopImageMap[avatar.image || "character1"]}
          alt="avatar"
          width={24}
          height={24}
        />
      ) : (
        <Image
          priority={false}
          src={shopImageMap["character1"]}
          alt="avatar"
          width={24}
          height={24}
        />
      )}
    </div>
  );

  const Trophy =
    item.rank === 1 ? (
      <Image
        priority={false}
        src={pos1.src}
        alt="pos1"
        width={24}
        height={24}
      />
    ) : item.rank === 2 ? (
      <Image
        priority={false}
        src={pos2.src}
        alt="pos2"
        width={24}
        height={24}
      />
    ) : item.rank === 3 ? (
      <Image
        priority={false}
        src={pos3.src}
        alt="pos3"
        width={24}
        height={24}
      />
    ) : (
      <h1 className="w-[24px] h-[24px] flex items-center justify-center">
        {item.rank == "Not Ranked" ? "" : item.rank}
      </h1>
    );

  const ContainerClasses =
    isMine && isMineTop
      ? "w-full h-[71px] rounded-[10px] flex justify-between items-center p-[1px] bg-gradient-to-b from-[#C27CBC] via-[#D3FF00] to-[#3BE32D]"
      : isMine
      ? "w-full h-[54px] rounded-[10px] flex justify-between items-center p-[1px] bg-gradient-to-b from-[#C27CBC] via-[#D3FF00] to-[#3BE32D]"
      : "w-full h-[54px] border border-[#3B3B3B] rounded-[10px] flex p-[10px] justify-between items-center bg-[#0A0A0A]";

  const InnerContent = (
    <>
      <div className="flex items-center gap-[10px]">
        {Trophy}
        {AvatarImg}
        <h1>{truncate(item.name)}</h1>
      </div>
      <div className="flex items-center">
        <Image
          priority={false}
          src={cup.src}
          alt="cup"
          className="relative right-[-15px]"
          width={29}
          height={34}
        />
        <div className="flex items-center bg-[#3B3B3B] w-[56px] h-[26px] rounded-full justify-center">
          <h1>{item.wins}</h1>
        </div>
      </div>
    </>
  );

  const isMineTopContent = (
    <>
      <div className={ContainerClasses}>
        <div className="w-full h-full flex-col rounded-[10px] flex  justify-between items-center bg-[#0A0A0A] pt-1 pb-1">
          <p className="text-[12px]">Your position : {item.rank}</p>
          <div className="flex items-center gap-[5px] -mt-1">
            <div className="w-[38px] h-[38px] flex items-center justify-center rounded-full bg-[#004989]">
              {avatar != null ? (
                <Image
                  priority={false}
                  src={shopImageMap[avatar.image || "character1"]}
                  alt="avatar"
                  width={35}
                  height={35}
                />
              ) : (
                <Image
                  priority={false}
                  src={shopImageMap["character1"]}
                  alt="avatar"
                  width={35}
                  height={35}
                />
              )}
            </div>
            <h1 className="text-[12px] font-extralight">
              {truncate(item.name)}
            </h1>
            <div className="flex items-center">
              <Image
                priority={false}
                src={cup.src}
                alt="cup"
                className="relative right-[-15px]"
                width={29}
                height={34}
              />
              <div className="flex items-center mt-2 bg-[#3B3B3B] w-[56px] h-[26px] rounded-full justify-center">
                <h1>{item.wins}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return isMine && isMineTop ? (
    isMineTopContent
  ) : isMine ? (
    <div className={ContainerClasses}>
      <div className="w-full h-full rounded-[10px] flex p-[10px] justify-between items-center bg-[#0A0A0A]">
        {InnerContent}
      </div>
    </div>
  ) : (
    <div className={ContainerClasses}>{InnerContent}</div>
  );
};
