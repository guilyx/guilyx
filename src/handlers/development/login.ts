// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import querystring from 'querystring';

// Local Imports
import {
  CALLBACK_URL,
  ERROR_MESSAGE_405,
  SPOTIFY_AUTHORIZATION_SCOPES,
  SPOTIFY_AUTHORIZE_URL,
} from '../../config';
import { Environment } from '../../helpers/environment';

/**
 * Returns Spotify authorization link, for author during development only.
 *
 * @param {VercelRequest} req Request for login URL.
 * @param {VercelResponse} res Response to request.
 */
export default async function (
  req: VercelRequest,
  res: VercelResponse,
) {
  // Block when not in development environment.
  if (Environment.getEnvironment() !== 'development') {
    return res.status(405).send(ERROR_MESSAGE_405);
  }

  const RESPONESE_TYPE = 'code';

  // Generating the Authorization URL.
  const url = `${SPOTIFY_AUTHORIZE_URL}?${querystring.stringify({
    client_id: Environment.getSpotifyClientId(),
    redirect_uri: CALLBACK_URL,
    response_type: RESPONESE_TYPE,
    scope: SPOTIFY_AUTHORIZATION_SCOPES.join('%20'),
    show_dialog: 'false',
    state: Environment.getState(),
  })}`;

  // Redirect the request to the authorization URL.
  return res.redirect(url);
}
