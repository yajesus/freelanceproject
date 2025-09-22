// hooks/usePartners.ts

import { Partner } from '@prisma/client';
import { useState, useEffect } from 'react';

export const usePartners = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const response = await fetch('/api/admin/partners');
                if (!response.ok) {
                    throw new Error('Failed to fetch partners');
                }
                const data = await response.json();
                setPartners(data || []);
            } catch (error) {
                console.error('Error fetching partners:', error);
                setPartners([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartners();
    }, []);


    return { partners, isLoading };
};