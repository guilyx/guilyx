// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

// Local Imports
import {
  ERROR_MESSAGE_500,
  SPOTIFY_TIME_RANGE_KEYS,
} from '../../config';
import { convertToImageResponse } from '../../helpers/image';
import { convertTrackToMinimumData } from '../../helpers/spotify';
import { TopPlayed } from '../../components/spotify/TopPlayed';
import api from '../../api';

// Types
import {
  IConvertedTrackObject,
  ITrackObject,
} from '../../types/spotify';

/**
 * Returns an image displaying my top five played tracks for three various time ranges.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Retrieving top played tracks from spotify.
    const topPlayedTracks: ITrackObject[][] = await Promise.all(SPOTIFY_TIME_RANGE_KEYS.map(async (timeRange) => await api.spotify.getTopPlayed(timeRange)));
    const topPlayedConvertedTracks: IConvertedTrackObject[][] = await Promise.all(topPlayedTracks.map(async (tracks) => await Promise.all(tracks.map(async (track) => await convertTrackToMinimumData(track)))));
    
    // Hey! I'm returning an image!
    convertToImageResponse(res);

    // Generating the component and rendering it
    const text: string = renderToString(
      TopPlayed({ trackLists: topPlayedConvertedTracks })
    );

    return res.send(text);
  } catch (error) {
    res.status(500).send(ERROR_MESSAGE_500);
  }
}
