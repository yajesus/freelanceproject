// components/quests/CompletedTasks

import { memo } from 'react';
import { Task } from '@/utils/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CompletedTaskCard from './CompletedTaskCard';

interface CompletedTasksProps {
  tasks: Task[];
}

const CompletedTasks = memo(({ tasks }: CompletedTasksProps) => {
  const t = useTranslations('Quests');

  if (tasks.length === 0) return null;

  return (
    <div className='space-y-2 mt-8 mb-4'>
      <Accordion type='single' collapsible>
        <AccordionItem value='completed'>
          <AccordionTrigger>
            <div className='w-full flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4 cursor-pointer'>
              <div>
                <svg className='w-6 h-6 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <div className='flex flex-col'>
                <span className='font-medium'>{t('completedQuests')}</span>
              </div>
              <ChevronDown className='h-4 w-4 shrink-0 transition-transform duration-200' />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className='space-y-2'>
              {tasks.map((task) => (
                <CompletedTaskCard key={task.id} task={task} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});

export default CompletedTasks;
