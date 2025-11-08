import bcrypt from "bcryptjs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

interface ShortTextOptions {
  text: string;
  startLength?: number;
  endLength?: number;
  separator?: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function shortText({
  text,
  startLength = 2,
  endLength = 2,
  separator = "..",
}: ShortTextOptions): string {
  if (text.length <= startLength + endLength) {
    return text;
  }
  return (
    text.slice(0, startLength) + separator + text.slice(text.length - endLength)
  );
}

export const formatTime = (ms: number, skip?: "M" | "S") => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  const timeParts = [hours];
  if (skip !== "M") {
    timeParts.push(minutes);
  }
  if (skip !== "S") {
    timeParts.push(seconds);
  }

  return timeParts.map((num) => String(num).padStart(2, "0")).join(":");
};

export const requestTokenStore = new Map<string, string>();
