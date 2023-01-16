interface IArtistSimplifiedObject {
  external_urls: object
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface IImageObject {
  height: number;
  url: string;
  width: number;
}

interface IAlbumSimplifiedObject {
  album_type: string;
  artists: Array<IArtistSimplifiedObject>
  available_markets: Array<string>
  external_urls: object;
  href: string;
  id: string;
  images: Array<IImageObject>
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

interface IExternalUrls {
  spotify: string;
}

export interface ITrackObject {
  album: IAlbumSimplifiedObject;
  artists: Array<IArtistSimplifiedObject>
  available_markets: Array<string>
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: object;
  external_urls: IExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

export interface ICurrentlyPlayingResponse {
  context: object | null;
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: ITrackObject | null;
  currently_playing_type: string;
  actions: object;
  Authorization: string;
}

export interface IAudioFeaturesResponse {
  duration_ms : number;
  key : number;
  mode : number;
  time_signature : number;
  acousticness : number;
  danceability : number;
  energy : number;
  instrumentalness : number;
  liveness : number;
  loudness : number;
  speechiness : number;
  valence : number;
  tempo : number;
  id : string;
  uri : string;
  track_href : string;
  analysis_url : string;
  type : string;
}

export interface ICursorBasedPagingObject<T> {
  href: string;
  items: Array<T>;
  limit: number;
  next: string;
  cursors: object;
  total: number;
  Authorization: string;
}

export interface IPagingObject<T> {
  href: string;
  items: Array<T>;
  limit: number;
  next: string;
  offest: number;
  previous: string;
  total: number;
}

interface ITrackSimplifiedObject {
  id: string;
}

export interface IPlayHistoryObject {
  track: ITrackSimplifiedObject;
  played_at: number;
  context: object;
}

export interface IAuthorizationTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

export interface IConvertedTrackObject {
  image: string;
  artist: string;
  name: string;
  href: string;
}
