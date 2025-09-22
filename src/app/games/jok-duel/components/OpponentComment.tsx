"use client";
import { useState, useEffect } from "react";
import { opponentComment, opponentCommentLoadingBg } from "../images";
import { motion } from "framer-motion";

export const OpponentComment = ({
  comment,
  reaction,
  containerClassname,
  load,
}: {
  comment: string;
  reaction?: string;
  containerClassname?: string;
  load?: boolean;
}) => {
  const [loading, setLoading] = useState(load != undefined ? load : true);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const time = load != undefined ? 0 : Math.floor(Math.random() * 3) + 2;

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
      setIsTyping(true);
      let i = 0;

      const interval = setInterval(() => {
        setTypedText(comment.slice(0, i + 1));
        i++;
        if (i === comment.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 50);

      return () => clearInterval(interval);
    }, time * 100);
  }, [comment]);

  return (
    <div
      className={`${
        loading ? "w-[120px]" : "w-[200px]"
      } h-[65px] p-1 ${containerClassname}`}
    >
      <div
        className={"w-full h-full flex items-center justify-center p-2"}
        style={{
          backgroundImage: `url(${
            loading ? opponentCommentLoadingBg.src : opponentComment.src
          })`,
          backgroundPosition: "center",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      >
        {loading ? (
          <div className=" w-full h-full flex gap-3 mr-2 justify-center items-center">
            <motion.div
              className="border rounded-full border-[#004989] w-4 h-4"
              animate={{
                backgroundColor: ["#FFFFFF", "#D9D9D966", "#D9D9D966"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                times: [0, 0.33, 0.66],
              }}
            />
            <motion.div
              className="border rounded-full border-[#004989] w-4 h-4"
              animate={{
                backgroundColor: ["#D9D9D966", "#FFFFFF", "#D9D9D966"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                times: [0, 0.33, 0.66],
              }}
            />
            <motion.div
              className="border rounded-full border-[#004989] w-4 h-4"
              animate={{
                backgroundColor: ["#D9D9D966", "#D9D9D966", "#FFFFFF"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                times: [0, 0.33, 0.66],
              }}
            />
          </div>
        ) : (
          <p className="font-[Roboto] p-1 text-[12px]">
            {typedText}
            {isTyping && (
              <span className="border-r-2 border-black animate-blink">
                &nbsp;
              </span>
            )}
          </p>
        )}
      </div>
      {reaction && (
        <div
          className="w-[50px] mt-[-2px] rounded-[8px] flex items-center justify-center h-[25px]"
          style={{
            background: "linear-gradient(to right, #004989, #001323)",
          }}
        >
          <div className="bg-[#102439] flex items-center justify-center rounded-[8px] h-[94%] w-[96%]">
            {reaction}
          </div>
        </div>
      )}
    </div>
  );
};
