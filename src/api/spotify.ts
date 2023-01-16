// Packages
import fetch from 'node-fetch';
import { stringify } from 'querystring';

// Local Imports
import {
  MOCKED_SPOTIFY_AUDIO_FEATURES,
  MOCKED_SPOTIFY_LAST_PLAYED,
  MOCKED_SPOTIFY_TOP_PLAYED,
} from '../data/spotify';
import {
  SPOTIFY_AUTHORIZATION,
  SPOTIFY_AUTHORIZATION_URL,
  SPOTIFY_CURRENT_PLAYING_URL,
  SPOTIFY_GET_TRACK_AUDIO_FEATURES_URL,
  SPOTIFY_GET_TRACK_URL,
  SPOTIFY_GET_TOP_PLAYED_URL,
  SPOTIFY_RECENTLY_PLAYED_URL,
} from '../config';
import { defaultCurrentlyPlayingResponse } from '../helpers/spotify';
import { Environment } from '../helpers/environment';

// Types
import {
  IAudioFeaturesResponse,
  IAuthorizationTokenResponse,
  ICurrentlyPlayingResponse,
  ICursorBasedPagingObject,
  IPagingObject,
  IPlayHistoryObject,
  ITrackObject,
} from '../types/spotify';

let AuthorizationToken: null | string = null;

/**
 * Uses my refresh token to get a brand new spotify auth token!
 *
 * @returns {Promise<string>} Authorization header for Spotify requests.
 */
const getAuthorizationToken = async (): Promise<string> => {
  if (AuthorizationToken !== null) {
    return AuthorizationToken;
  }

  const GRANT_TYPE = 'refresh_token';
  const CONTENT_TYPE = 'application/x-www-form-urlencoded';

  const body: string = stringify({
    grant_type: GRANT_TYPE,
    refresh_token: Environment.getSpotifyRefreshToken(),
  });

  const response: IAuthorizationTokenResponse = await fetch(`${SPOTIFY_AUTHORIZATION_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': SPOTIFY_AUTHORIZATION,
      'Content-Type': CONTENT_TYPE,
    },
    body,
  }).then((r) => r.json());

  AuthorizationToken = `Bearer ${response.access_token}`

  return AuthorizationToken;
}

/**
 * Requests last played track from Spotify
 *
 * @returns {Promise<ICurrentlyPlayingResponse>} Currently Playing Spotify Object
 */
const getLastPlayed = async (): Promise<ICurrentlyPlayingResponse> => {
  if (Environment.useMockData()) {
    return MOCKED_SPOTIFY_LAST_PLAYED;
  }

  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: ICursorBasedPagingObject<IPlayHistoryObject> = await response.json();

    const trackResponse: Response = await fetch(`${SPOTIFY_GET_TRACK_URL}/${ data.items[0].track.id }`, {
      headers: {
        Authorization,
      },
    });

    const track: ITrackObject = await trackResponse.json();

    return defaultCurrentlyPlayingResponse(Authorization, track);
  }
  return defaultCurrentlyPlayingResponse(Authorization);
};

/**
 * Requests currently playing track from Spotify.
 *
 * @returns {Promise<ICurrentlyPlayingResponse | object>} Currently Playing Spotify Object.
 */
const getNowPlaying = async (): Promise<ICurrentlyPlayingResponse> => {
  const Authorization: string = await getAuthorizationToken();

  if (Environment.useMockData()) {
    return defaultCurrentlyPlayingResponse(Authorization);
  }

  const response: Response = await fetch(SPOTIFY_CURRENT_PLAYING_URL, {
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
    return defaultCurrentlyPlayingResponse(Authorization);
  }
};

/**
 * Requests a track's audio features from Spotify.
 *
 * @param {string} id Spotify track id.
 * @returns {Promise<IAudioFeaturesResponse | object>} Audio features object.
 */
const getTracksAudioFeatures = async (id: string): Promise<IAudioFeaturesResponse | object> => {
  if (Environment.useMockData()) {
    return MOCKED_SPOTIFY_AUDIO_FEATURES;
  }
  
  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(`${SPOTIFY_GET_TRACK_AUDIO_FEATURES_URL}/${id}`, {
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
 * Requests top played tracks from Spotify.
 *
 * @param {string} timeRange Spotify parameter for top played time range.
 * @returns {Promise<ITrackObject[]>} Array of Spotify track objects.
 */
const getTopPlayed = async (timeRange: string): Promise<ITrackObject[]> => {
  if (Environment.useMockData()) {
    return MOCKED_SPOTIFY_TOP_PLAYED[timeRange];
  }

  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(`${SPOTIFY_GET_TOP_PLAYED_URL}${timeRange}`, {
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

export default {
  getAuthorizationToken,
  getLastPlayed,
  getNowPlaying,
  getTracksAudioFeatures,
  getTopPlayed,
};
