"use client";

import { useState } from "react";
import { opponentComment } from "../images";

export const MyComment = ({
  containerClassname,
  setMyReaction,
}: {
  containerClassname?: string;
  setMyReaction: (reaction: string) => void;
}) => {
  const [canReaction, setCanReaction] = useState(true);

  const handleReaction = (reaction: string) => {
    if (canReaction) {
      setCanReaction(false);
      setMyReaction(reaction);
    }
  };

  return (
    <div
      className={`w-[200px] h-[65px] ${containerClassname}`}
      style={{
        backgroundImage: `url(${opponentComment.src})`,
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        transform: "scaleX(-1)",
      }}
    >
      <div onClick={() => handleReaction("😂")}>😂</div>
      <div onClick={() => handleReaction("🤔")}>🤔</div>
      <div onClick={() => handleReaction("😈")}>😈</div>
    </div>
  );
};
