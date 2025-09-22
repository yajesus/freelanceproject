// utils/taskUtils.ts

export const TASK_PARAMS = {
  BITGET: 'bitget',
  GATE: 'gate',
  TON: 'ton'
} as const;

export const TASK_SEARCH_STRINGS = {
  [TASK_PARAMS.BITGET]: 'JokInTheBox X Bitget',
  [TASK_PARAMS.GATE]: 'JokInTheBox X Gate.IO',
  [TASK_PARAMS.TON]: 'TON Daily Check-In'
} as const;

export type TaskParam = keyof typeof TASK_SEARCH_STRINGS;

export function getTaskSearchString(param: string): string | undefined {
  return TASK_SEARCH_STRINGS[param as TaskParam];
}
