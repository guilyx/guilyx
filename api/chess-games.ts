import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

import { CurrentGames } from '../src/components/chess/CurrentGames';
import {
  currentGames,
  convertFen,
  getPieces,
} from '../src/services/chesscom';

/**
 * Returns an image displaying 3 of my current chess games from Chess.com
 *
 * @param {VercelRequest} req Request for image
 * @param {VercelResponse} res Response to request
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  // Using an awesome library called chess-web-api to get our data ;)
  const {
    games = [],
  } = await currentGames();

  let pieceImages: object = await getPieces();

  // Limiting the width of the games.
  games.length = Math.min(
    games.length,
    3,
  );

  // There's a lot of data we don't need! Converting the FEN to an array
  const convertedGames: Array<IConvertedGame> = await Promise.all(games.map(async (game) => {
    const isWhite: boolean = game.white.includes('andyruwruw');
    const white: string = (game.white.split('/').reverse())[0];
    const black: string = (game.black.split('/').reverse())[0];

    return {
      black,
      isWhite,
      noGame: false,
      position: await convertFen(isWhite, game.fen),
      white,
    };
  }));

  // Adding empty spots if there aren't 3!
  for (let i = convertedGames.length; i < 3; i++) {
    convertedGames.push({
      black: null,
      isWhite: true,
      noGame: true,
      position: convertFen(true, '8/8/8/8/8/8/8/8/'),
      white: null,
    });
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

  // Generating the component and rendering it
  const text: string = renderToString(
    CurrentGames({
      games: convertedGames,
      pieceImages,
    }),
  );

  return res.send(text);
}
