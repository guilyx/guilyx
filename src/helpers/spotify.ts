// Local Imports
import { getImageData } from './image';

// Types
import {
  IConvertedTrackObject,
  ICurrentlyPlayingResponse,
  ITrackObject,
} from '../types/spotify';


/**
 * Removes data and simplifies track object.
 *
 * @param {ITrackObject} track Track object to be converted.
 * @returns {Promise<IConvertedTrackObject>} Converted track object.
 */
 export const convertTrackToMinimumData = async (track: ITrackObject): Promise<IConvertedTrackObject> => {
  let albumArtUrl = 'https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/src/assets/images/default-album-art.png';
  if ('album' in track
    && 'images' in track.album
    && track.album.images.length) {
    albumArtUrl = track.album.images[0].url;
  }
  const image = await getImageData(albumArtUrl);

  let artist = 'Unknown Artist';
  if ('artists' in track && track.artists.length) {
    artist = track.artists.map((artist) => artist.name).join(', ');
  }

  let name = 'Unknown Track';
  if ('name' in track) {
    name = track.name;
  }

  let href = '#';
  if ('external_urls' in track && 'spotify' in track.external_urls) {
    href = track.external_urls.spotify;
  }

  return {
    image,
    artist,
    name,
    href,
  };
};

/**
 * Generates a Currently Playing response for edge cases.
 *
 * @param {string} Authorization Authorization header for Spotify requests.
 * @param {ITrackObject | null} [track = null] Track object to use for response.
 * @returns {ICurrentlyPlayingResponse} Currently playing response.
 */
export const defaultCurrentlyPlayingResponse = (Authorization: string, track: ITrackObject = null): ICurrentlyPlayingResponse => ({
  context: null,
  timestamp: 0,
  progress_ms: 0,
  is_playing: false,
  item: track,
  currently_playing_type: '',
  actions: {},
  Authorization,
});
