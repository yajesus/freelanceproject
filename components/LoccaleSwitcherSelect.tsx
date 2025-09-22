'use client';

import * as Select from '@radix-ui/react-select';
import clsx from 'clsx';
import { useTransition } from 'react';
import { Locale } from '@/src/i18n/config';
import { setUserLocale } from '@/src/services/locale';
import Image from 'next/image';
import { ArrowUp } from '@/icons/ArrowUp';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({ defaultValue, items, label }: Props) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }
  const selectedItem = items.find((item) => item.value === defaultValue);

  return (
    <div className='relative'>
      <Select.Root defaultValue={defaultValue} onValueChange={onChange}>
        <Select.Trigger
          aria-label={label}
          className={clsx(
            'min-w-[116px] flex items-center justify-between gap-[9px] text-white border border-[#FFFFFF4D] hover:border-[#FFFFFF96] bg-[#0B1111] transition px-1 py-1 rounded-[35px] group',
            isPending && 'pointer-events-none opacity-60'
          )}
        >
          <div className='w-[24px] h-[24px] rounded-full'>
            <Image
              priority={false}
              src={'/lang/' + selectedItem?.value + '.png'}
              alt={selectedItem?.label!}
              width={24}
              height={24}
              className='rounded-full'
            />
          </div>
          <p className='text-xs font-normal text-white'>{selectedItem?.label}</p>
          <div className='group-hover:rotate-180 transition flex justify-center items-center w-[24px] h-[24px] rounded-full bg-[#000000] text-white'>
            <ArrowUp />
          </div>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            align='center'
            className='min-w-[116px] mt-[2px] overflow-hidden max-h-[40vh] bg-[#0B1111] border border-[#FFFFFF38] py-[6px] px-[7px] rounded-[10px]'
            position='popper'
          >
            <Select.Viewport>
              {items.map((item) => {
                if (item.value === defaultValue) return null;
                return (
                  <Select.Item
                    key={item.value}
                    className={'flex items-center gap-[9px] text-white mb-1'}
                    value={item.value}
                  >
                    <div className='w-[24px] h-[24px] rounded-full'>
                      <Image
                        priority={false}
                        src={'/lang/' + item.value + '.png'}
                        alt={item.label}
                        width={24}
                        height={24}
                        className='rounded-full'
                      />
                    </div>
                    <p className='text-xs font-normal text-white'>{item.label}</p>
                  </Select.Item>
                );
              })}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
