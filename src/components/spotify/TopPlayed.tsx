import React from 'react';

import ConvertSVG from '../ConvertSVG';
import Text from '../Text';

export interface ITopPlayedProps {
  trackLists: Array<Array<IConvertedTrack>>,
}

/**
 * Top Played
 * Displays three lists of tracks.
 * @param trackLists 
 */
export const TopPlayed: React.FC<ITopPlayedProps> = ({
  trackLists,
}: ITopPlayedProps) => {
  return (
    <ConvertSVG
      width="800"
      height="493">
      <div className="top-played-wrapper">
        {trackLists.map((list, term) => (
          <div
            key={term}
            className="top-played-container">
            <Text
              className="title"
              weight="bold"
              size="title"
              color="standard">
              {term === 0 ? 'all time favorites' : term === 1 ? 'monthly favorites' : 'current favorites'}
            </Text>

            {list.map((track, trackIndex) => (
              <a
                key={`${term}-${trackIndex}`}
                className="track"
                href={track.href}>
                <img
                  className="cover"
                  src={track.cover ?? null}
                  width="48"
                  height="48" />
                <div className="details">
                  <Text 
                    className="name"
                    weight="bold">
                    {`${track.track ?? ""} `.trim()}
                  </Text>

                  <Text
                    className="artist"
                    color="grey">
                    {track.artist}
                  </Text>  
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
      
      <style>
        {`
          .top-played-wrapper {
            display: flex;
            justify-content: space-around;
          }
          
          a {
            color: inherit;
            cursor: pointer;
            text-decoration: none;
          }
          
          p {
            display: block;
            opacity: 0;
          }
          
          img:not([src]) {
            content: url("data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
            border-radius: 6px;
            background: #FFF;
            border: 1px solid #e1e4e8;
          }
          
          .track {
            display: flex;
            align-items: center;
            max-width: 250px;
            background: rgb(255,255,255,.6);
            border-radius: .3rem;
            margin: 0rem .5rem 1rem;
            padding: .7rem;
            border: 1px solid rgb(0,0,0,.1);
          }
          
          .track .details {
            display: flex;
            flex: 1;
            flex-direction: column;
            margin-top: -4px;
            margin-left: 8px;
          }
          
          .name,
          .artist,
          .cover,
          .title {
            opacity: 0;
            animation: appear 300ms ease-out forwards;
          }
          
          .title {
            animation-delay: 0ms;
            text-align: center;
            margin: .5rem .5rem 1rem;
          }
          
          .name,
          .artist {
            width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .name {
            animation-delay: 400ms;
          }
          
          .artist {
            animation-delay: 500ms;
          }
          
          .cover {
            animation-name: cover-appear;
            animation-delay: 300ms;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 3px 10px rgba(0,0,0,0.05);
          }
          
          .cover:not([src]) {
            box-shadow: none;
          }
          
          @keyframes appear {
            from {
              opacity: 0;
              transform: translateX(-8px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes cover-appear {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </ConvertSVG>
  );
};
