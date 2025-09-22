import React from "react";

export const ArrowUp = ({ width = 8, height = 4, className = "" }) => {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 8 4"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 3.49691e-07L3.49691e-07 4L8 4L4 3.49691e-07Z" fill="white" />
    </svg>
  );
};
