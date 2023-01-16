// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

// Local Imports
import spotifyNowPlayingHandler from '../src/handlers/spotify/now-playing';
import { ERROR_MESSAGE_500 } from '../src/config';

/**
 * Returns an image displaying my current playback state, with nice music bars.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    return await spotifyNowPlayingHandler(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).send(ERROR_MESSAGE_500);
  }
}
