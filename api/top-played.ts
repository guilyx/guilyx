import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

import { TopPlayed } from '../src/components/spotify/TopPlayed';
import { topPlayed } from '../src/services/spotify';

/**
 * Returns an image displaying top 5 played tracks for 3 various time ranges
 *
 * @param {VercelRequest} req
 * @param {VercelResponse} res
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  // Retrieving top played tracks from spotify.
  const topPlayedTracks: Array<Array<ITrackObject>> = [
    await topPlayed('long_term'),
    await topPlayed('medium_term'),
    await topPlayed('short_term')
  ];

  // There's a lot of data we don't need!
  // Here we run Array.map on the 3 lists to get the objects to what we need.
  const convertedTracks: Array<Array<IConvertedTrack>> = await Promise.all(topPlayedTracks.map(async (trackList) => {
    return Promise.all(trackList.map(async (track) => {
      const { images = [] } = track.album || {};
      const url: string = images[images.length - 1]?.url;

      let cover: string = null;
      if (url) {
        const buff: ArrayBuffer = await (await fetch(url)).arrayBuffer();
        cover = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
      }

      return {
        cover,
        artist: (track.artists || []).map(({ name }) => name).join(', '),
        track: track.name,
        href: track.external_urls.spotify,
      };
    }));
  }));
  
  // Hey! I'm returning an image!
  res.setHeader(
    'Content-Type',
    'image/svg+xml'
  );
  res.setHeader(
    'Cache-Control',
    's-maxage=1, stale-while-revalidate',
  );

  // Generating the component and rendering it
  const text: string = renderToString(
    TopPlayed({ trackLists: convertedTracks })
  );

  return res.send(text);
}
