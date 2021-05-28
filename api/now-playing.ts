import {
  decode,
  ParsedUrlQuery,
} from 'querystring';
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

import {
  nowPlaying,
  lastPlayed,
  trackAudioFeatures,
} from '../src/services/spotify';
import { Player } from '../src/components/spotify/NowPlaying';

/**
 * Returns an image displaying my current playback state, with nice music bars
 *
 * @param {VercelRequest} req Request for image
 * @param {VercelResponse} res Response to request
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    let {
      Authorization,
      item,
      is_playing: isPlaying = false,
      progress_ms: progress = 0,
    } = await nowPlaying();

    if (!item) {
      const response = await lastPlayed(Authorization);
      item = response.item;
    }

    // If the link was clicked, reroute them to the href
    const params: ParsedUrlQuery = decode(req.url.split('?')[1]);

    if (params && typeof params.open !== 'undefined') {
      if (item && item.external_urls) {
        res.writeHead(302, {
          Location: item.external_urls.spotify,
        });
        return res.end();
      }
      return res.status(200).end();
    }

    // The music bars are colored based on the songs danceability, energy and happiness
    // And they move to the beat of the song :)
    let audioFeatures: IAudioFeaturesResponse | object = null;
    if (Object.keys(item).length) {
      audioFeatures = await trackAudioFeatures(item.id, Authorization);
    }

    // Hey! I'm returning an image!
    res.setHeader(
      'Content-Type',
      'image/svg+xml',
    );
    res.setHeader(
      'Cache-Control',
      's-maxage=1, stale-while-revalidate',
    );

    // Cleaning up some data
    const {
      duration_ms: duration,
      name: track,
    } = item;
    const { images = [] } = item.album || {};

    const cover: string = images[images.length - 1]?.url;
    let coverImg: string | null = null;
    if (cover) {
      const buff: ArrayBuffer = await (await fetch(cover)).arrayBuffer();
      coverImg = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
    }

    const artist: string = (item.artists || []).map(({ name }) => name)
      .join(', ');

    // Generating the component and rendering it
    const text: string = renderToString( Player({
      artist,
      audioFeatures,
      cover: coverImg,
      duration,
      isPlaying,
      progress,
      track,
    }));

    return res.send(text);
  } catch (error) {
    console.log(error);
    return res.send('Authentication Errors!');
  }
}
