import fetch from 'isomorphic-unfetch';
import { stringify } from 'querystring';

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  SPOTIFY_REFRESH_TOKEN: refresh_token,
} = process.env;

const basic: string = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const Authorization: string = `Basic ${basic}`;

/**
 * Uses my refresh token to get a brand new spotify auth token!
 *
 * @returns {Promise<string>} Authorization header for Spotify requests
 */
async function getAuthorizationToken(): Promise<string> {
  const url: URL = new URL('https://accounts.spotify.com/api/token');
  const body: string = stringify({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const response: IAuthorizationTokenResponse = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  }).then((r) => r.json());

  return `Bearer ${response.access_token}`;
}

/**
 * Requests currently playing track from Spotify
 *
 * @returns {Promise<ICurrentlyPlayingResponse | object>} Currently Playing Spotify Object
 */
export async function nowPlaying(): Promise<ICurrentlyPlayingResponse> {
  const Authorization: string = await getAuthorizationToken();
  const response: Response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: ICurrentlyPlayingResponse = await response.json();
    data.Authorization = Authorization;

    return data;
  } else {
    return {
      context: null,
      timestamp: 0,
      progress_ms: 0,
      is_playing: false,
      item: null,
      currently_playing_type: '',
      actions: {},
      Authorization,
    };
  }
};

/**
 * Requests last played track from Spotify
 *
 * @returns {Promise<ICursorBasedPagingObject | object>} Currently Playing Spotify Object
 */
export async function lastPlayed(Authorization: string): Promise<ICurrentlyPlayingResponse> {
  const response: Response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: ICursorBasedPagingObject<IPlayHistoryObject> = await response.json();

    const trackResponse: Response = await fetch(`https://api.spotify.com/v1/tracks/${ data.items[0].track.id }`, {
      headers: {
        Authorization,
      },
    });

    const track: ITrackObject = await trackResponse.json();

    return {
      context: null,
      timestamp: 1,
      progress_ms: 0,
      is_playing: false,
      item: track,
      currently_playing_type: 'track',
      actions: {},
      Authorization,
    }
  }
  return {
    context: null,
    timestamp: 0,
    progress_ms: 0,
    is_playing: false,
    item: null,
    currently_playing_type: '',
    actions: {},
    Authorization,
  };
};

/**
 * Requests a track's audio features from Spotify
 *
 * @returns {Promise<IAudioFeaturesResponse | object>} Audio features object
 */
export async function trackAudioFeatures(id: string, Authorization: string): Promise<IAudioFeaturesResponse | object> {
  const response: Response = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    return await response.json();
  } else {
    return {};
  }
};

/**
 * Requests top played tracks from Spotify
 *
 * @param {string} timeRange Spotify param for top played time range
 * @returns {Promise<Array<ITrackObject>>} Array of Spotify track objects
 */
export async function topPlayed(timeRange: string): Promise<Array<ITrackObject>> {
  const Authorization: string = await getAuthorizationToken();
  const response: Response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=${timeRange}`, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: IPagingObject<ITrackObject> = await response.json();
    return data.items;
  } else {
    return [];
  }
};