import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/utils/prisma';

interface ComboSharePageProps {
  params: {
    comboId: string;
  };
}

export async function generateMetadata({ params }: ComboSharePageProps): Promise<Metadata> {
  try {
    const comboOfTheDay = await prisma.comboOfTheDay.findUnique({
      where: { id: params.comboId }
    });

    if (!comboOfTheDay || comboOfTheDay.endsAt < new Date()) {
      return {
        title: 'Combo Not Found',
        description: 'This combo has expired or does not exist.'
      };
    }

    // Generate banner URL by calling the API
    let imageUrl = 'https://quests.jokinthebox.com/jok_logo.webp'; // fallback
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/combo-of-the-day/generate-banner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.bannerUrl) {
          imageUrl = result.bannerUrl;
        }
      }
    } catch (error) {
      console.error('Error fetching banner URL:', error);
    }

    const title = 'JOK Combo of the Day - Amazing Combo Discovered!';
    const description = 'Check out this incredible combo I discovered in JOK! Double your rewards and join the fun!';

    // Add cache-busting parameter for Twitter Cards
    // Use combo ID + timestamp for unique cache key
    const cacheBuster = `?combo=${params.comboId}&v=${Date.now()}`;
    const imageUrlWithCacheBuster = imageUrl + cacheBuster;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrlWithCacheBuster,
            width: 600,
            height: 200,
            alt: 'JOK Combo Banner',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrlWithCacheBuster],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'JOK Combo Share',
      description: 'Share your amazing JOK combo!'
    };
  }
}

export default async function ComboSharePage({ params }: ComboSharePageProps) {
  try {
    const comboOfTheDay = await prisma.comboOfTheDay.findUnique({
      where: { id: params.comboId }
    });

    if (!comboOfTheDay || comboOfTheDay.endsAt < new Date()) {
      notFound();
    }

    // Generate banner URL by calling the API
    let bannerUrl = 'https://quests.jokinthebox.com/jok_logo.webp'; // fallback
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/combo-of-the-day/generate-banner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.bannerUrl) {
          bannerUrl = result.bannerUrl;
        }
      }
    } catch (error) {
      console.error('Error fetching banner URL:', error);
    }

    // Add cache-busting parameter for the displayed image too
    const cacheBuster = `?combo=${params.comboId}&v=${Date.now()}`;
    const bannerUrlWithCacheBuster = bannerUrl + cacheBuster;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            🃏 Combo Cracked!
          </h1>
          
          <div className="mb-6">
            <img 
              src={bannerUrlWithCacheBuster} 
              alt="JOK Combo Banner"
              className="w-full max-w-md mx-auto rounded-lg shadow-lg"
            />
          </div>
          
          <p className="text-white/80 mb-6">
            I discovered an amazing combo in JOK and doubled my rewards! 
            Don't miss your chance to find yours and share it too!
          </p>
          
          <div className="space-y-3">
            <a 
              href="https://t.me/JokInTheBox_bot/JokInTheBox?startapp"
              className="block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              🎯 Play JOK Now
            </a>
            
            <p className="text-white/60 text-sm">
              Share this page to show your combo on Twitter!
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading combo share:', error);
    notFound();
  }
}
