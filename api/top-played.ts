// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

// Local Imports
import spotifyTopPlayedHandler from '../src/handlers/spotify/top-played';
import { ERROR_MESSAGE_500 } from '../src/config';

/**
 * Returns an image displaying my top five played tracks for three various time ranges.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    return await spotifyTopPlayedHandler(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).send(ERROR_MESSAGE_500);
  }
}
