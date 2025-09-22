// components/quests/SocialMediaTasks

import { memo, useMemo } from 'react';
import { Task } from '@/utils/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
import { imageMap } from '@/images';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import TaskCard from './TaskCard';
import { capitalizeFirstLetter } from '@/utils/ui';

interface SocialMediaTasksProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
}

const SocialMediaTasks = memo(({ tasks, onTaskSelect }: SocialMediaTasksProps) => {
  const t = useTranslations('Quests');

  const socialMediaTasks = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.isCompleted && task.taskAction.name !== 'REFERRAL') {
        const key = task.taskAction.name === 'VISIT' ? task.image : task.taskAction.name;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks]);

  return (
    <div>
      <h2 className='text-base mt-8 mb-4'>{t('socialQuests')}</h2>
      <div className='space-y-2 mb-4'>
        {Object.entries(socialMediaTasks).map(([socialMedia, mediaTasks]) => (
          <Accordion type='single' collapsible key={socialMedia}>
            <AccordionItem value={socialMedia}>
              <AccordionTrigger>
                <div className='w-full flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4 cursor-pointer'>
                  <Image
                    priority={false}
                    src={
                      mediaTasks[0].partnerImage?.includes('http')
                        ? mediaTasks[0].partnerImage
                        : imageMap[mediaTasks[0].partnerImage]
                    }
                    alt={socialMedia}
                    width={40}
                    height={40}
                    className='rounded-lg mr-2'
                  />
                  <div className='flex flex-col'>
                    <span className='font-medium'>
                      {capitalizeFirstLetter(socialMedia)} {t('title')}
                    </span>
                  </div>
                  <ChevronDown className='h-4 w-4 shrink-0 transition-transform duration-200' />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className='space-y-2'>
                  {mediaTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onSelect={onTaskSelect} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </div>
  );
});

export default SocialMediaTasks;
