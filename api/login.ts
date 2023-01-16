
// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

// Local Imports
import loginHandler from '../src/handlers/development/login';

/**
 * Returns Spotify authorization link, for author during development only.
 *
 * @param {VercelRequest} req Request for login URL.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  return await loginHandler(req, res);
}
