// Local Imports
import {
  CHESS_COLORS,
  CHESS_PIECES,
  EMPTY_CHESS_BOARD_FEN,
  GITHUB_CHESS_IMAGES_DIRECTORY_URL,
} from '../config';
import { Environment } from '../helpers/environment';
import { getImageData } from './image';

// Types
import {
  IConvertedGameObject,
  ICurrentDailyGame,
} from '../types/chess';

/**
 * Converts recieved game objects to simplified objects.
 *
 * @param {ICurrentDailyGame} game Recieved game object.
 * @returns {IConvertedGameObject} Converted game object.
 */
export const convertGameObject = (game: ICurrentDailyGame): IConvertedGameObject => {
  const isWhite: boolean = game.white.includes(Environment.getChessUsername());
  const white: string = (game.white.split('/').reverse())[0];
  const black: string = (game.black.split('/').reverse())[0];

  return {
    black,
    isWhite,
    noGame: false,
    position: convertFenToArray(isWhite, game.fen),
    white,
  };
};

/**
 * Creates an empty game object.
 *
 * @returns {IConvertedGameObject} Empty game object.
 */
export const createEmptyGameObject = (): IConvertedGameObject => ({
  black: null,
  isWhite: true,
  noGame: true,
  position: convertFenToArray(true, EMPTY_CHESS_BOARD_FEN),
  white: null,
});

/**
 * Returns an nice lil' array of the position.
 *
 * @param {boolean} isWhite Is main player playing the white pieces?
 * @param {string} fen The FEN string.
 * @returns {(string | null)[][]} Array of positon.
 */
export const convertFenToArray = (isWhite: boolean, fen: string): (string | null)[][] => {
  const finalPosition: (string | null)[][] = [];

  const position: string = fen.slice(0, fen.indexOf(' '));
  const rows: string[] = position.split('/');

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
 * Loads the images into a buffer, only does this once per image.
 */
export const getPieces = async (): Promise<object> => {
  const pieceImages = {};

  for (const color of CHESS_COLORS) {
    for (const piece of CHESS_PIECES) {
      pieceImages[`${color}-${piece}`] = await getImageData(`${GITHUB_CHESS_IMAGES_DIRECTORY_URL}${color}-${piece}.png`);
    }
  }

  return pieceImages;
};
