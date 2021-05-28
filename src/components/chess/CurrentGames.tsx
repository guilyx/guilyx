import React from 'react';

import ConvertSVG from '../ConvertSVG';
import Text from '../Text';

export interface ICurrentGamesParameters {
  games: Array<IConvertedGame>;
  pieceImages: object;
};

/**
 * Returns image of 3 chess game positions
 *
 * @param {Array<ICurrentDailyGames>} games
 * @param {object} pieceImages
 */
export const CurrentGames: React.FC<ICurrentGamesParameters> = ({
  games,
  pieceImages,
}: ICurrentGamesParameters) => {
  return (
    <ConvertSVG
      height="246"
      width="600">
      <Text
        id="title"
        size="title"
        weight="bold">
        { !games[0].noGame ? 'current games' : 'no active games' }
      </Text>
      
      <div className="games-wrapper">
        {games.map((game, gameIndex) => (
          <div
            key={ `chess-game-${gameIndex}` }
            className="game">
            <div className="board">
              {game.position.map((row, rowIndex) => (
              <div
                key={`chess-game-${ gameIndex }-row-${ rowIndex }`}
                className="row">
                {row.map((col, colIndex) => (
                <div
                  key={`chess-game-${ gameIndex }=row-${ rowIndex }-col-${ colIndex }`}
                  className={`col ${(rowIndex + colIndex) % 2 === (game.isWhite ? 0 : 1) ? 'light' : ''} ${game.noGame ? 'empty' : ''}`}>
                  {col && 
                    <img src={ pieceImages[`${col === col.toUpperCase() ? 'white' : 'black' }-${ col.toLowerCase() }`]}></img>
                  }
                </div>
                ))}
              </div>
              ))}
            </div>

            {!game.noGame && 
              <Text
                className="username"
                color="grey-lighter">
                vs. { game.isWhite ? game.black : game.white }
              </Text>
            }
          </div>
        ))}
      </div>
      
      <style>
        {`
          .games-wrapper {
            display: flex;
            justify-content: space-around;
          }
          
          #title {
            margin: .5rem;
            text-align: center;
          }
          
          .board {
            border-radius: .5rem;
            overflow: hidden;
          }
          
          .row {
            display: flex;
          }
          
          .col {
            align-items: center;
            background: #B58863;
            display: flex;
            height: 22px;
            justify-content: center;
            width: 22px;
          }

          .col.empty {
            background: #DDDDDDAA;
          }
          
          .col.light {
            background: #F0D9B5;
          }

          .col.light.empty {
            background: #EEEEEEAA;
          }
          
          .col img {
            width: 90%;
          }
          
          .username {
            text-align: center;
            margin-top: 6px;
          }
        `}
      </style>
    </ConvertSVG>
  );
};
