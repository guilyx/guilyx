// Types
import { IAudioFeaturesResponse } from '../../../types/spotify';

/**
 * Style for NowPlaying component.
 *
 * @param {IAudioFeaturesResponse} audioFeatures 
 * @param {number} duration Duration of track in milliseconds.
 * @param {number} progress Current playback progress in milliseconds.
 * @returns {string} CSS for Component.
 */
export const NOW_PLAYING_CSS = (
  audioFeatures: IAudioFeaturesResponse,
  duration: number,
  progress: number,
) => (`
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
`);

export const TOP_PLAYED_CSS = `
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
`;

/**
 * Titles for TopPlayed lists.
 */
export const TOP_PLAYED_LIST_TITLES = [
  'all time favorites',
  'monthly favorites',
  'current favorites',
];
