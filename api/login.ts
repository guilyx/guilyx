import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import querystring from 'querystring';

const redirectURL: string = 'http://localhost:3000/api/auth';

const {
  SPOTIFY_CLIENT_ID: client_id,
  STATE: state,
} = process.env;

/**
 * Returns Spotify authorization link, for repo owner only
 *
 * @param {VercelRequest} req
 * @param {VercelResponse} res
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  const scopes: Array<string> = [
    'user-read-playback-position',
    'user-read-recently-played',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-top-read',
  ];

  const url: string = `https://accounts.spotify.com/authorize?${querystring.stringify({
    client_id,
    redirect_uri: redirectURL,
    response_type: 'code',
    scope: scopes.join('%20'),
    show_dialog: 'false',
    state,
  })}`;

  return res.send(url);
};
