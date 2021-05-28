import axios, { AxiosResponse } from 'axios';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

const redirectURL: string = 'http://localhost:3000/api/auth';

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  STATE,
} = process.env;

interface IAuthResponse {
  refresh_token: string,
  access_token: string,
}

/**
 * Retrieves access token, for repo owner only
 *
 * @param {VercelRequest} req
 * @param {VercelResponse} res
 * @returns {IAuthResponse}
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  const {
    code,
    state,
  } = req.query;

  if (code && state && state === STATE) {
    const url: string = 'https://accounts.spotify.com/api/token';
    const data: ParsedUrlQueryInput = {
      code,
      redirect_uri: redirectURL,
      grant_type: 'authorization_code',
    };

    const options: object = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      },
    };

    const response: AxiosResponse<any> = await axios.post(
      url,
      querystring.stringify(data),
      options,
    );

    const result: IAuthResponse = {
      refresh_token: response.data.refresh_token,
      access_token: response.data.access_token,
    };

    return res.send(result);
  }

  return res.send(false);
};
