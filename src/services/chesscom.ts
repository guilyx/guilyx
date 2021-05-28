import ChessWebAPI from 'chess-web-api';
import fetch from 'node-fetch';

const chessAPI = new ChessWebAPI();

/**
 * Requests current daily games from chess.com
 *
 * @returns {Promise<ICurrentDailyGames>} Object with array of game objects
 */
export async function currentGames(): Promise<ICurrentDailyGames> {
  let response: ICurrentDailyGamesResponse = await chessAPI.getPlayerCurrentDailyChess('andyruwruw');
  const { statusCode } = response;

  if (statusCode === 200) {
    return response.body;
  } else {
    return {
      games: [],
    };
  }
};

/**
 * Returns an nice lil' array of the position
 *
 * @param {boolean} isWhite Is andyruwruw playing the white pieces?
 * @param {string} fen The FEN string
 * @returns {Array<string | null>} Array of positon
 */
export function convertFen(isWhite: boolean, fen: string): Array<Array<string | null>> {
  let finalPosition: Array<Array<string | null>> = [];

  let position: string = fen.slice(0, fen.indexOf(' '));
  let rows: Array<string> = position.split("/");

  if (!isWhite) {
    rows.reverse();
  }

  for (let i = 0; i < rows.length; i++) {
    finalPosition.push([]);
    for (let j = 0; j < rows[i].length; j++) {
      if (rows[i][j] >= '1' && rows[i][j] <= '9') {
        for (let k = 0; k < parseInt(rows[i][j], 10); k++) {
          finalPosition[i].push(null);
        }
      } else {
        finalPosition[i].push(rows[i][j]);
      }
    }
    if (!isWhite) {
      finalPosition[i].reverse();
    }
  }

  return finalPosition;
}

/**
 * Loads the images into a buffer
 * Only does this once
 */
export async function getPieces(): Promise<object> {
  let pieceImages = {};
  let pieces: Array<string> = [ 'b', 'k', 'n', 'p', 'q', 'r' ];
  let colors: Array<string> = ['white', 'black'];

  for (const color of colors) {
    for (const piece of pieces) {
      const buff = await ( await fetch(`https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/src/assets/${color}-${piece}.png`) ).arrayBuffer();
      pieceImages[`${color}-${piece}`] = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
    }
  }

  return pieceImages;
}; 