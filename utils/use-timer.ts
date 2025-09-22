import { create } from "zustand";

interface CooldownState {
  cooldowns: Record<string, { isCooldown: boolean; endTime: number }>;
  setCooldown: (id: string, isCooldown: boolean, endTime: number) => void;
  clearCooldown: (id: string) => void;
}

const useTimer = create<CooldownState>((set) => ({
  cooldowns: {},
  setCooldown: (id, isCooldown, endTime) => {
    set((state) => ({
      cooldowns: {
        ...state.cooldowns,
        [id]: { isCooldown, endTime },
      },
    }));
  },
  clearCooldown: (id) => {
    set((state) => ({
      cooldowns: {
        ...state.cooldowns,
        [id]: { isCooldown: false, endTime: 0 },
      },
    }));
  },
}));

export default useTimer;
