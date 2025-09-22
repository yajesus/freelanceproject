import { motion } from "framer-motion";

interface EverySecondEnergyProps {
  leftPosition: number;
}

export const EverySecondEnergy: React.FC<EverySecondEnergyProps> = ({
  leftPosition,
}) => {
  return (
    <motion.div
      className="absolute flex items-center justify-center gap-[10px]"
      style={{ left: `${leftPosition}%`, top: "50%" }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -400, opacity: 0 }}
      transition={{ duration: 4, ease: "easeOut" }}
    >
      <h1 className="text-[32px]">+0.2</h1>
      <svg
        width="16"
        height="23"
        viewBox="0 0 16 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.1248 0.25L10.1654 8.12498H15.7904L2.02634 22.75L5.10545 10.375H0.605469L3.12475 0.25H12.1248Z"
          fill="white"
        />
      </svg>
    </motion.div>
  );
};
