// hooks/useTaskGroups.ts

import { useMemo } from 'react';
import { Task } from '@/utils/types';

export const useTaskGroups = (tasks: Task[]) => {
  const groupedTasks = useMemo(() => {
    const groups = tasks.reduce((acc, task) => {
      if (!acc[task.type]) {
        acc[task.type] = [];
      }
      if (!task.isCompleted) {
        acc[task.type].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);

    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [tasks]);

  const socialMediaTasks = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.isCompleted && task.taskAction.name !== 'REFERRAL' && task.taskAction.name !== 'VISIT') {
        if (!acc[task.taskAction.name]) {
          acc[task.taskAction.name] = [];
        }
        acc[task.taskAction.name].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks]);

  return { groupedTasks, socialMediaTasks };
};
