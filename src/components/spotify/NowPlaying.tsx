import React from 'react';

import ConvertSVG from '../ConvertSVG';
import Text from '../Text';

export interface IPlayerProps {
  cover?: string;
  track: string;
  artist: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  audioFeatures: IAudioFeaturesResponse;
}

/**
 * Displays currently playing track
 *
 * @param {IPlayerProps} nowPlaying Currently playing context
 */
export const Player: React.FC<IPlayerProps> = ({
  cover,
  track,
  artist,
  progress,
  duration,
  isPlaying,
  audioFeatures,
}: IPlayerProps) => {
  return (
    <ConvertSVG
      height="125"
      width="466">
      <Text
        id="title"
        color="standard"
        size="title"
        weight="bold">
        { isPlaying ? 'currently jamming out to' : 'last jammed out to' }
      </Text>

      <div className="now-playing-wrapper">
        {track && <div className="bar-container left">
            {[0, 1, 2].map((bar) => (
              <div
                className="bar"
                key={ `left-bar-${bar}` }
                style={{
                  '--offset': bar,
                }}/>
            ))}
          </div>
        }

        <div
          className={ isPlaying ? 'disabled' : '' }
          style={{
            alignItems: 'center',
            display: 'flex',
            background: 'rgb(255,255,255,.6)',
            border: '1px solid rgba(125, 125, 125, .3)',
            borderRadius: '.3rem',
            margin: '.5rem 0',
            padding: '.6rem',
            paddingLeft: 4,
            paddingTop: 8,
          }}>
          <img
            id="cover"
            height="48"
            src={ cover ?? null }
            width="48" />

          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              marginLeft: 8,
              marginTop: -4,
            }}>
            <Text
              id="track"
              weight="bold">
              { `${track ?? ''} `.trim() }
            </Text>

            <Text
              color={ !track ? 'gray' : undefined }
              id="artist"
              size="small">
              { artist || 'Nothing Currently' }
            </Text>
            {track && (
              <div className="progress-bar">
                <div
                  className={ !isPlaying ? 'paused' : '' }
                  id="progress"/>
              </div>
            )}
          </div>
        </div>

        {track && <div className="bar-container right">
            {[0, 1, 2].map((bar) => (
              <div
                className="bar"
                key={ `right-bar-${bar}` }
                style={{
                  '--offset': bar,
                }}/>
            ))}
          </div>
        }
      </div>

      <style>
        {`
          .now-playing-wrapper {
            display: flex;
            justify-content: center;
            mix-blend-mode: difference;
          }
          
          p {
            display: block;
            opacity: 0;
          }
          
          img:not([src]) {
            background: #FFF;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            content: url("data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
            mix-blend-mode: normal;
          }
          
          .progress-bar,
          #track,
          #artist,
          #cover,
          #title {
            animation: appear 300ms ease-out forwards;
            opacity: 0;
          }
          
          #track,
          #artist {
            overflow: hidden;
            text-overflow: ellipsis;
            width: 170px;
            white-space: nowrap;
          }
          
          #title {
            animation-delay: 0ms;
            margin: .5rem;
            text-align: center;
          }
          
          #track {
            animation-delay: 400ms;
          }
          
          #artist {
            animation-delay: 500ms;
          }
          
          #cover {
            animation-delay: 300ms;
            animation-name: cover-appear;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 3px 10px rgba(0,0,0,0.05);
          }
          
          #cover:not([src]) {
            box-shadow: none;
          }
          
          .bar-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            width: 111px;
          }
          
          .bar-container.right {
            align-items: flex-start;
          }
          
          .bar-container.left {
            align-items: flex-end;
          }
          
          .bar {
            --offset: 0;

            animation: bars ${ audioFeatures ? (audioFeatures.tempo / 60) * 1 : 1 }s ease calc(var(--offset) * -.5s) infinite;
            background: rgba(${ audioFeatures ? audioFeatures.energy * 255 : 255 }, ${ audioFeatures ? audioFeatures.valence * 255 : 255 }, ${ audioFeatures ? audioFeatures.danceability * 255 : 255 }, .7);
            height: 10px;
            margin: 2px 0;
            width: 50px;
          }
          
          .progress-bar {
            animation-delay: 550ms;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            height: 4px;
            margin: -1px;
            margin-top: 4px;
            overflow: hidden;
            padding: 2px;
            position: relative;
            width: 100%;
            z-index: 0;
          }
          
          #progress {
            animation: progress ${duration}ms linear;
            animation-delay: -${progress}ms;
            background-color: #24292e;
            height: 6px;
            left: 0;
            position: absolute;
            top: -1px;
            transform-origin: left center;
            width: 100%;
          }
          
          .paused { 
            animation-play-state: paused !important;
            background: #e1e4e8 !important;
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
          
          @keyframes progress {
            from {
              transform: scaleX(0)
            }
            to {
              transform: scaleX(1)
            }
          }
          
          @keyframes bars {
            0% {
              width: 25%;
            }
            50% {
              width: 90%;
            }
            100% {
              width: 25%;
            }
          }
        `}
      </style>
    </ConvertSVG>
  );
};
