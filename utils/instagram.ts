


const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;

export async function getInstagramUserMediaList() {
    const allPosts = [];
    let url = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_USER_ID}/media?fields=id,caption,permalink&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`;
  
    try {
      while (url) {
        const res = await fetch(url);
        const json = await res.json();
  
        if (!res.ok) {
          console.error(`Instagram API error: ${res.status}`, json);
          throw new Error('Failed to fetch Instagram media');
        }
  
        if (json.data && json.data.length > 0) {
          allPosts.push(...json.data);
        }
  
        url = json.paging?.next || null; 
      }
  
      return allPosts;
    } catch (error) {
      console.error('Error fetching Instagram media list:', error);
      throw error;
    }
  }
  
export async function getInstagramPostInsights(mediaId: string) {
    const metrics = 'likes,comments';
    const url = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${FACEBOOK_ACCESS_TOKEN}`;
  try {
    const response = await fetch(url);
    const json = await response.json();
    console.log('[Instagram Post Insights] Response:', json); // Log full response
    if (!response.ok) {
      console.error(`[Instagram Post Insights] API error: ${response.status} - ${JSON.stringify(json)}`);
      throw new Error('Failed to fetch Instagram insights');
    }

    const insights: Record<string, any> = {};
    for (const item of json.data) {
      insights[item.name] = item.values[0].value;
    }
    console.log('[Instagram Post Insights] Parsed insights:', insights);
    return insights;
  } catch (error) {
    console.error('[Instagram Post Insights] Fetch failed:', error);
    throw error;
  }
}

export async function getInstagramUserDetails() {
  const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}?fields=username,followers_count,profile_picture_url&access_token=${FACEBOOK_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('[Instagram User Details] Response:', json); // Log full response
    if (!res.ok) {
      console.error(`[Instagram User Details] API error: ${res.status} - ${JSON.stringify(json)}`);
      throw new Error('Failed to fetch Instagram user details');
    }
    return json;
  } catch (error) {
    console.error('[Instagram User Details] Fetch failed:', error);
    throw error;
  }
}
