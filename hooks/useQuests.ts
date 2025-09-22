// hooks/useQuests.ts

import { useCallback } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { Task } from '@/utils/types';

export const useQuests = () => {
  const {
    tasks,
    completedTasks,
    completedTasksCount,
    isTasksLoading,
    userTelegramInitData,
    setTasks,
    setCompletedTasks,
    setIsTasksLoading,
    updateTask,
    getTonDailyTask,
    setCompletedTasksCount
  } = useGameStore();

  const fetchTasks = useCallback(
    async (force = false) => {
      // Skip if already loading or tasks are already loaded (unless forced)
      if (isTasksLoading || (!force && tasks?.length)) return;

      console.log('Fetching tasks from API');
      setIsTasksLoading(true);

      try {
        const response = await fetch(`/api/tasks?initData=${encodeURIComponent(userTelegramInitData)}`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        setTasks(data.tasks);
        setCompletedTasks(data.completedTasks);

        if (data.completedTasks.length !== completedTasksCount) {
          setCompletedTasksCount(data.completedTasks.length);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsTasksLoading(false);
      }
    },
    [isTasksLoading, tasks?.length, userTelegramInitData, setTasks, setCompletedTasks, setIsTasksLoading]
  );

  const handleTaskUpdate = useCallback(
    (taskToUpdate: Task) => {
      updateTask(taskToUpdate);
    },
    [updateTask]
  );

  const tonDailyTask = getTonDailyTask();

  return {
    tasks,
    completedTasks,
    isLoading: isTasksLoading,
    fetchTasks,
    handleTaskUpdate,
    tonDailyTask
  };
};
