// Packages
import React from 'react';

// Local Imports
import ConvertSVG from '../general/ConvertSVG';
import { NOW_PLAYING_CSS } from './config';
import Text from '../general/Text';

// Types
import {
  IAudioFeaturesResponse,
  IConvertedTrackObject,
} from '../../types/spotify';

export interface IPlayerProps {
  audioFeatures: IAudioFeaturesResponse;
  duration: number;
  isPlaying: boolean;
  progress: number;
  track: IConvertedTrackObject;
}

/**
 * Displays currently playing track.
 *
 * @param {IAudioFeaturesResponse} audioFeatures Audio features of currently playing track.
 * @param {number} duration Duration of currently playing track in milliseconds.
 * @param {boolean} isPlaying Whether or not the player is currently playing.
 * @param {number} progress Progress of currently playing track in milliseconds.
 * @param {IConvertedTrackObject} track Converted track object.
 * @returns {React.FC} Functional React component.
 */
export const Player: React.FC<IPlayerProps> = ({
  audioFeatures,
  duration,
  isPlaying,
  progress,
  track,
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
            src={ track.image ?? null }
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
              { `${track.name ?? ''} `.trim() }
            </Text>

            <Text
              color={ !track ? 'gray' : undefined }
              id="artist"
              size="small">
              { track.artist || 'Nothing Currently' }
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
        { NOW_PLAYING_CSS(audioFeatures, duration, progress) }
      </style>
    </ConvertSVG>
  );
};
