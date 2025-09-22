export const BackButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="w-[43px] h-[43px] rounded-[12px] border border-[#FFFFFF4D] flex justify-center items-center z-10"
    >
      <svg
        width="11"
        height="18"
        viewBox="0 0 11 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.34347 9.00014L10.4145 16.0711L9.00047 17.4851L1.22247 9.70714C1.035 9.51961 0.929688 9.2653 0.929688 9.00014C0.929687 8.73497 1.035 8.48066 1.22247 8.29314L9.00047 0.515137L10.4145 1.92914L3.34347 9.00014Z"
          fill="white"
        />
      </svg>
    </button>
  );
};
