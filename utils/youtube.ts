const YOUTUBE_API_KEY = process.env.API_KEY_V3_GOOGLE_YOUTUBE!;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID!;

export async function getYouTubeChannelDetails() {
  const url = `https://www.googleapis.com/youtube/v3/channels?` +
    new URLSearchParams({
      part: 'statistics,contentDetails,snippet',
      id: CHANNEL_ID,
      key: YOUTUBE_API_KEY,
    });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch channel details');

    const data = await response.json();
    if (!data.items || !data.items.length) {
      throw new Error('No channel found');
    }

    const channel = data.items[0];
    return {
      title: channel.snippet.title,
      description: channel.snippet.description,
      subscriberCount: channel.statistics.subscriberCount,
      videoCount: channel.statistics.videoCount,
      viewCount: channel.statistics.viewCount,
      uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    };
  } catch (err) {
    console.error('[YouTube Channel Details] Error:', err);
    throw err;
  }
}

export async function getYouTubeUploads(playlistId: string, maxResults = 10) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?` +
    new URLSearchParams({
      part: 'contentDetails',
      playlistId,
      maxResults: maxResults.toString(),
      key: YOUTUBE_API_KEY,
    });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch uploads');
    const data = await response.json();

    return data.items.map((item: any) => item.contentDetails.videoId);
  } catch (err) {
    console.error('[YouTube Uploads] Error:', err);
    throw err;
  }
}

export async function getYouTubeVideoStats(videoIds: string[]) {
  const url = `https://www.googleapis.com/youtube/v3/videos?` +
    new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: YOUTUBE_API_KEY,
    });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch video stats');
    const data = await response.json();

    return data.items.map((video: any) => {
      const duration = parseISODuration(video.contentDetails.duration);
      return {
        id: video.id,
        title: video.snippet.title,
        duration: video.contentDetails.duration,
        seconds: duration,
        isShort: duration <= 60,
        views: video.statistics.viewCount,
        likes: video.statistics.likeCount,
        comments: video.statistics.commentCount,
      };
    });
  } catch (err) {
    console.error('[YouTube Video Stats] Error:', err);
    throw err;
  }
}

function parseISODuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const minutes = match?.[1] ? parseInt(match[1]) : 0;
  const seconds = match?.[2] ? parseInt(match[2]) : 0;
  return minutes * 60 + seconds;
}
