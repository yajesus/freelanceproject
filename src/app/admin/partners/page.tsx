// app/admin/partners/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Partner } from '@prisma/client';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

const partnerSchema = z
    .object({
        name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
        description: z.string().optional(),
        image: z.string().min(1, 'Image is required'),
        link: z.string().url('Link must be a valid URL').optional(),
        isActive: z.boolean(),
    })

type PartnerFormData = z.infer<typeof partnerSchema>;

const DEFAULT_FORM_VALUES: Partial<PartnerFormData> = {
    name: '',
    description: '',
    image: '',
    link: '',
    isActive: true,
};

export default function AdminPartners() {
    const t = useTranslations('AdminPartners');
    const showToast = useToast();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [isLoadingPartners, setIsLoadingPartners] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors }
    } = useForm<PartnerFormData>({
        resolver: zodResolver(partnerSchema),
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const imageValue = watch('image');

    const fetchPartners = useCallback(async () => {
        setIsLoadingPartners(true);
        try {
            const response = await fetch('/api/admin/partners');
            const data = await response.json();
            setPartners(data);
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setIsLoadingPartners(false);
        }
    }, []);


    useEffect(() => {
        fetchPartners();
    }, []);

    const onSubmit = async (data: PartnerFormData) => {
        try {
            if (editingPartner) {
                await fetch(`/api/admin/partners/${editingPartner.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                showToast(t('PartnerUpdated'), 'success');
            } else {
                const newPartner = await fetch('/api/admin/partners', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!newPartner.ok) {
                    const error = await newPartner.json();
                    const errorStatus = newPartner.status;
                    if (errorStatus === 409) {
                        showToast(t('AlreadyExists'), 'error');
                    } else {
                        showToast(error.error, 'error');
                    }
                } else {
                    showToast(t('PartnerCreated'), 'success');
                }
            }
            setEditingPartner(null);
            reset(DEFAULT_FORM_VALUES);
            fetchPartners();
        } catch (error) {
            console.error('Error saving partner:', error);
            showToast('Failed to save partner. Please try again.', 'error');

        }
    };


    const handleEdit = (partner: Partner) => {
        setEditingPartner(partner);
        reset(partner);
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleCancelEdit = () => {
        setEditingPartner(null);
        reset(DEFAULT_FORM_VALUES);
    };

    return (
        <div className='bg-[#1d2025] text-white min-h-screen p-8'>
            <div className='max-w-6xl mx-auto'>
                <h1 className='text-4xl font-bold mb-8 text-customGreen-700'>{t('title')}</h1>

                <form onSubmit={handleSubmit(onSubmit)} className='mb-12 bg-[#272a2f] rounded-lg p-6'>
                    <h2 className='text-2xl font-semibold mb-6'>{editingPartner ? t('editPartner') : t('addNewPartner')}</h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div>
                            <input
                                {...register('name')}
                                placeholder='Name'
                                className='w-full bg-[#3a3d42] p-3 rounded-lg'
                                maxLength={100}
                                autoComplete='off'
                            />
                            {errors.name && <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>}
                        </div>

                        <div>
                            <input
                                {...register('description')}
                                placeholder='Description'
                                className='w-full bg-[#3a3d42] p-3 rounded-lg'
                                maxLength={200}
                                autoComplete='off'
                            />
                            {errors.description && <p className='text-red-500 text-sm mt-1'>{errors.description.message}</p>}
                        </div>

                        <div>
                            <input
                                {...register('image')}
                                placeholder='Logo URL'
                                className='w-full bg-[#3a3d42] p-3 rounded-lg'
                                autoComplete='off'
                            />
                            {errors.image && (
                                <p className='text-red-500 text-sm mt-1'>{errors.image.message}</p>
                            )}
                            {imageValue && (<div className='flex flex-wrap gap-2 mt-2'>
                                <div
                                    className={`p-1 rounded transition-colors bg-[#3a3d42] hover:bg-[#4a4d52]`}
                                >
                                    <img src={imageValue} alt='Logo' className='w-8 h-8 object-contain ' />
                                </div>
                            </div>)}
                        </div>

                        <div>
                            <input
                                {...register('link')}
                                placeholder='Partner Site URL'
                                className='w-full bg-[#3a3d42] p-3 rounded-lg'
                                autoComplete='off'
                            />
                            {errors.link && (
                                <p className='text-red-500 text-sm mt-1'>{errors.link.message}</p>
                            )}
                        </div>


                        <label className='flex items-center space-x-2'>
                            <input
                                type='checkbox'
                                {...register('isActive')}
                                className='form-checkbox h-5 w-5 text-customGreen-700'
                                autoComplete='off'
                            />
                            <span>{t('isActive')}</span>
                        </label>

                        {errors.isActive && <p className='text-red-500 text-sm mt-1'>{errors.isActive.message}</p>}
                    </div>
                    <div className='mt-6 flex justify-end space-x-4'>
                        {editingPartner && (
                            <button
                                type='button'
                                onClick={handleCancelEdit}
                                className='px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors'
                            >
                                {t('cancel')}
                            </button>
                        )}
                        <button
                            type='submit'
                            className='px-6 py-2 bg-customGreen-700 text-white rounded-lg hover:bg-customGreen-800 transition-colors'
                        >
                            {editingPartner ? t('update') : t('add')}
                        </button>
                    </div>
                </form>

                <div className='bg-[#272a2f] rounded-lg p-6'>
                    <div className='flex justify-between items-center mb-6'>
                        <h2 className='text-2xl font-semibold'>
                            {t('existingPartners')} ({partners.length})
                        </h2>
                        <button onClick={fetchPartners} className='p-2 bg-[#3a3d42] rounded-full hover:bg-[#4a4d52] transition-colors'>
                            <svg
                                className='w-6 h-6 text-gray-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                                xmlns='http://www.w3.org/2000/svg'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                />
                            </svg>
                        </button>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {isLoadingPartners ? (
                            [...Array(6)].map((_, index) => (
                                <div key={index} className='bg-[#3a3d42] rounded-lg p-4 animate-pulse'>
                                    <div className='h-6 bg-gray-700 rounded w-3/4 mb-4'></div>
                                    <div className='h-4 bg-gray-700 rounded w-1/2 mb-2'></div>
                                    <div className='h-4 bg-gray-700 rounded w-1/4'></div>
                                </div>
                            ))
                        ) : partners.length > 0 ? (
                            partners.map((partner) => {
                                return (
                                    <div key={partner.id} className='bg-[#3a3d42] rounded-lg p-4 flex flex-col h-full'>
                                        <div className='flex-grow'>
                                            <h3 className='text-xl font-semibold mb-2'>{partner.name}</h3>
                                            <p className='text-gray-400 mb-3'>{partner.description}</p>
                                            <img src={partner.image} alt={partner.name} className='w-full h-24 object-cover mb-3' />
                                            <p className='text-sm text-gray-400'>
                                                {t('active')}: {partner.isActive ? 'Yes' : 'No'}
                                            </p>
                                            <p className='text-sm text-gray-400'>
                                                {t('link')}: {partner.link ? (
                                                    <a
                                                        href={partner.link}
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='text-customGreen-700 hover:underline'
                                                    >
                                                        {t('visit')}
                                                    </a>
                                                ) : (
                                                    <span className='text-gray-400'>{t('notAvailable')}</span>
                                                )
                                                }
                                            </p>

                                        </div>
                                        <button
                                            onClick={() => handleEdit(partner)}
                                            className='w-full mt-4 px-4 py-2 bg-customGreen-700 text-white rounded-lg hover:bg-customGreen-800 transition-colors'
                                        >
                                            {t('edit')}
                                        </button>
                                    </div>
                                )
                            })
                        ) : (
                            <div className='col-span-full text-center text-gray-400 bg-[#3a3d42] rounded-lg p-8'>{t('noPartners')}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}