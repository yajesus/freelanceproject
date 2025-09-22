// utils/twitter.ts

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

interface TweetData {
  id: string;
  text: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
}

// Configuration
const config = {
  TWITTER_IO_KEY: process.env.TWITTER_IO_KEY,
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 2,
  CACHE_TTL: 300000 // 5 minutes
} as const;

// Simple cache
const cache = new Map<string, { data: any; timestamp: number }>();

// Validation
const isValidHandle = (handle: string): boolean => /^[a-zA-Z0-9_]{1,15}$/.test(handle);
const isValidTweetId = (id: string): boolean => /^\d+$/.test(id);

// Cache utilities
function getFromCache<T>(key: string): T | null {
  console.log(`[Twitter Cache] Attempting to get from cache: ${key}`);
  const cached = cache.get(`twitter_${key}`);
  if (cached && Date.now() - cached.timestamp < config.CACHE_TTL) {
    console.log(`[Twitter Cache] Cache HIT for: ${key}`);
    return cached.data as T;
  }
  if (cached) {
    console.log(`[Twitter Cache] Cache EXPIRED for: ${key}`);
    cache.delete(`twitter_${key}`);
  } else {
    console.log(`[Twitter Cache] Cache MISS for: ${key}`);
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  console.log(`[Twitter Cache] Setting cache for: ${key}`);
  cache.set(`twitter_${key}`, { data, timestamp: Date.now() });
}

// HTTP utilities
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  console.log(`[Twitter API] Making request to: ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`[Twitter API] Response status: ${response.status} for ${url}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Twitter API] Request timeout for: ${url}`);
      throw new Error('Request timeout');
    }
    console.error(`[Twitter API] Request failed for: ${url}`, error);
    throw error;
  }
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.MAX_RETRIES; attempt++) {
    try {
      console.log(`[Twitter Retry] Attempt ${attempt + 1}/${config.MAX_RETRIES + 1}`);
      const result = await operation();
      console.log(`[Twitter Retry] Success on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Twitter Retry] Attempt ${attempt + 1} failed:`, error);
      if (attempt === config.MAX_RETRIES) break;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`[Twitter Retry] Waiting ${delay}ms before retry`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error(`[Twitter Retry] All attempts failed, throwing error`);
  throw lastError!;
}

async function fetchTwitterIO(endpoint: string): Promise<any> {
  console.log(`[TwitterIO] Fetching endpoint: ${endpoint}`);
  
  if (!config.TWITTER_IO_KEY) {
    console.error(`[TwitterIO] TWITTER_IO_KEY not configured`);
    throw new Error('TWITTER_IO_KEY not configured');
  }

  const response = await fetchWithTimeout(`https://api.twitterapi.io/twitter/${endpoint}`, {
    headers: {
      'X-API-Key': config.TWITTER_IO_KEY,
      'User-Agent': 'TwitterBot/1.0'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.log(`[TwitterIO] 404 Not Found for endpoint: ${endpoint}`);
      return null;
    }
    if (response.status === 401) {
      const errorData = await response.json();
      console.error(`[TwitterIO] 401 Unauthorized for endpoint: ${endpoint}`, errorData);
      throw new Error(`TwitterIO API unauthorized: ${errorData.message || 'API key is invalid'}`);
    }
    console.error(`[TwitterIO] HTTP ${response.status} error for endpoint: ${endpoint}`);
    throw new Error(`TwitterIO API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[TwitterIO] Response received for endpoint: ${endpoint}`, { status: data.status, hasData: !!data.data });

  // Handle different response formats
  if (data.status === 'success') {
    console.log(`[TwitterIO] Success response for endpoint: ${endpoint}`);
    return data;
  } else if (data.status === 'error') {
    console.log(`[TwitterIO] Error response for endpoint: ${endpoint}`, data);
    // User not found or other error cases
    return null;
  } else if (data.error) {
    console.error(`[TwitterIO] Error in response for endpoint: ${endpoint}`, data);
    // Handle error responses like 401
    throw new Error(`TwitterIO API error: ${data.message || data.error}`);
  }

  console.log(`[TwitterIO] Unexpected response format for endpoint: ${endpoint}`, data);
  return null;
}

// Public functions
export async function twitterHandleExists(handle: string): Promise<boolean> {
  console.log(`[Twitter] Checking if handle exists: @${handle}`);
  
  if (!isValidHandle(handle)) {
    console.log(`[Twitter] Invalid handle format: @${handle}`);
    return false;
  }

  const cacheKey = `handle_exists_${handle}`;
  const cached = getFromCache<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await withRetry(async () => {
      const data = await fetchTwitterIO(`user/info?userName=${handle}`);
      // If data exists and has user information, the handle exists
      const exists = data?.data && data.data.id;
      console.log(`[Twitter] Handle @${handle} exists: ${exists}`);
      return exists;
    });

    setCache(cacheKey, result);
    console.log(`[Twitter] Final result for handle @${handle} exists: ${result}`);
    return result;
  } catch (error) {
    console.error(`[Twitter] Failed to check handle existence: @${handle}`, error);
    return false;
  }
}

export async function getTwitterUserFollowersCount(handle: string): Promise<number> {
  console.log(`[Twitter] Getting follower count for: @${handle}`);
  
  if (!isValidHandle(handle)) {
    console.error(`[Twitter] Invalid Twitter handle: @${handle}`);
    throw new Error('Invalid Twitter handle');
  }

  const cacheKey = `followers_${handle}`;
  const cached = getFromCache<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await withRetry(async () => {
      const data = await fetchTwitterIO(`user/info?userName=${handle}`);
      const followers = data?.data?.followers ?? 0;
      console.log(`[Twitter] Follower count for @${handle}: ${followers}`);
      return followers;
    });

    setCache(cacheKey, result);
    console.log(`[Twitter] Final follower count for @${handle}: ${result}`);
    return result;
  } catch (error) {
    console.error(`[Twitter] Failed to get follower count: @${handle}`, error);
    throw new Error(`Unable to retrieve follower count for @${handle}`);
  }
}

export async function getTweetData(tweetId: string): Promise<TweetData | null> {
  console.log(`[Twitter] Getting tweet data for ID: ${tweetId}`);
  
  if (!isValidTweetId(tweetId)) {
    console.error(`[Twitter] Invalid tweet ID format: ${tweetId}`);
    throw new Error('Invalid tweet ID format');
  }

  const cacheKey = `tweet_${tweetId}`;
  const cached = getFromCache<TweetData>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await withRetry(async () => {
      const data = await fetchTwitterIO(`tweets?tweet_ids=${tweetId}`);
      if (data?.tweets?.[0]) {
        const tweet = data.tweets[0];
        const tweetData = {
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author?.id,
          public_metrics: {
            retweet_count: tweet.retweetCount || 0,
            like_count: tweet.likeCount || 0,
            reply_count: tweet.replyCount || 0,
            quote_count: tweet.quoteCount || 0
          }
        };
        console.log(`[Twitter] Tweet data retrieved for ID ${tweetId}:`, {
          id: tweetData.id,
          author_id: tweetData.author_id,
          metrics: tweetData.public_metrics
        });
        return tweetData;
      }
      console.log(`[Twitter] No tweet found for ID: ${tweetId}`);
      return null;
    });

    if (result) setCache(cacheKey, result);
    console.log(`[Twitter] Final tweet data result for ID ${tweetId}:`, result ? 'Found' : 'Not found');
    return result;
  } catch (error) {
    console.error(`[Twitter] Failed to get tweet data: ${tweetId}`, error);
    throw new Error('Unable to retrieve tweet data');
  }
}

export async function getTwitterUserId(handle: string): Promise<string | null> {
  console.log(`[Twitter] Getting user ID for handle: @${handle}`);
  
  if (!isValidHandle(handle)) {
    console.log(`[Twitter] Invalid handle format: @${handle}`);
    return null;
  }

  const cacheKey = `user_id_${handle}`;
  const cached = getFromCache<string>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await withRetry(async () => {
      const data = await fetchTwitterIO(`user/info?userName=${handle}`);
      const userId = data?.data?.id || null;
      console.log(`[Twitter] User ID for @${handle}: ${userId}`);
      return userId;
    });

    if (result) setCache(cacheKey, result);
    console.log(`[Twitter] Final user ID for @${handle}: ${result}`);
    return result;
  } catch (error) {
    console.error(`[Twitter] Failed to get user ID: @${handle}`, error);
    return null;
  }
}

export async function checkUserFollowsTwitterChannel(userHandle: string, channelHandle: string): Promise<boolean> {
  console.log(`[Twitter] Checking if @${userHandle} follows @${channelHandle}`);
  
  if (!isValidHandle(userHandle) || !isValidHandle(channelHandle)) {
    console.log(`[Twitter] Invalid handle format: @${userHandle} or @${channelHandle}`);
    return false;
  }

  const cacheKey = `follows_${userHandle}_${channelHandle}`;
  const cached = getFromCache<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await withRetry(async () => {
      const data = await fetchTwitterIO(
        `user/check_follow_relationship?source_user_name=${userHandle}&target_user_name=${channelHandle}`
      );
      const follows = data?.data?.following === true;
      console.log(`[Twitter] Follow relationship @${userHandle} -> @${channelHandle}: ${follows}`);
      return follows;
    });

    setCache(cacheKey, result);
    console.log(`[Twitter] Final follow relationship @${userHandle} -> @${channelHandle}: ${result}`);
    return result;
  } catch (error) {
    console.error(`[Twitter] Failed to check follow relationship: @${userHandle} -> @${channelHandle}`, error);
    return false;
  }
}

// Cache utilities
export function clearTwitterCache(): void {
  console.log(`[Twitter Cache] Clearing all Twitter cache entries`);
  const deletedCount = Array.from(cache.keys())
    .filter((key) => key.startsWith('twitter_'))
    .reduce((count, key) => {
      cache.delete(key);
      return count + 1;
    }, 0);
  console.log(`[Twitter Cache] Cleared ${deletedCount} cache entries`);
}

export function getTwitterCacheStats(): { size: number; keys: string[] } {
  const twitterKeys = Array.from(cache.keys()).filter((key) => key.startsWith('twitter_'));
  const stats = { size: twitterKeys.length, keys: twitterKeys };
  console.log(`[Twitter Cache] Cache stats:`, stats);
  return stats;
}

export async function uploadImageToTwitter(imageUrl: string, accessToken: string, accessSecret: string): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  console.log(`[Twitter] Uploading image to Twitter: ${imageUrl}`);
  
  if (!config.TWITTER_IO_KEY) {
    console.error(`[TwitterIO] TWITTER_IO_KEY not configured`);
    return { success: false, error: 'Twitter API key not configured' };
  }

  try {
    const response = await fetchWithTimeout('https://api.twitterapi.io/twitter/upload_image', {
      method: 'POST',
      headers: {
        'X-API-Key': config.TWITTER_IO_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'TwitterBot/1.0'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        access_token: accessToken,
        access_token_secret: accessSecret
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[TwitterIO] Failed to upload image:`, errorData);
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}: Failed to upload image` 
      };
    }

    const data = await response.json();
    console.log(`[TwitterIO] Image uploaded successfully:`, data);

    if (data.status === 'success' && data.data && data.data.media_id) {
      return {
        success: true,
        mediaId: data.data.media_id
      };
    } else {
      return {
        success: false,
        error: data.message || 'Unknown error occurred while uploading image'
      };
    }

  } catch (error) {
    console.error(`[Twitter] Failed to upload image:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function postTweet(text: string, accessToken: string, accessSecret: string, mediaIds?: string[]): Promise<{ success: boolean; tweetId?: string; tweetUrl?: string; error?: string }> {
  console.log(`[Twitter] Posting tweet with text: ${text.substring(0, 50)}...`);
  
  if (!config.TWITTER_IO_KEY) {
    console.error(`[TwitterIO] TWITTER_IO_KEY not configured`);
    return { success: false, error: 'Twitter API key not configured' };
  }

  try {
    const payload: any = {
      text: text,
      access_token: accessToken,
      access_token_secret: accessSecret
    };

    // Add media if provided
    if (mediaIds && mediaIds.length > 0) {
      payload.media = {
        media_ids: mediaIds
      };
    }

    const response = await fetchWithTimeout('https://api.twitterapi.io/twitter/create_tweet', {
      method: 'POST',
      headers: {
        'X-API-Key': config.TWITTER_IO_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'TwitterBot/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[TwitterIO] Failed to post tweet:`, errorData);
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}: Failed to post tweet` 
      };
    }

    const data = await response.json();
    console.log(`[TwitterIO] Tweet posted successfully:`, data);

    if (data.status === 'success' && data.data) {
      const tweetId = data.data.id;
      const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
      
      return {
        success: true,
        tweetId: tweetId,
        tweetUrl: tweetUrl
      };
    } else {
      return {
        success: false,
        error: data.message || 'Unknown error occurred while posting tweet'
      };
    }

  } catch (error) {
    console.error(`[Twitter] Failed to post tweet:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
