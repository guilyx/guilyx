// Chess.com

interface ICurrentDailyGame {
  white: string;
  black: string;
  url: string;
  fen: string;
  pgn: string;
  turn: string;
  move_by: number;
  draw_offer: string | null;
  last_activity: number;
  start_time: number;
  time_control: string;
  time_class: string;
  rules: string;    
  tournament: string; 
  match: string
}

interface ICurrentDailyGames {
  games: Array<ICurrentDailyGame>;
}

interface ICurrentDailyGamesResponse {
  body: ICurrentDailyGames;
  statusCode: number;
}

interface IAuthorizationTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

interface IConvertedGame {
  black: string;
  isWhite: boolean;
  noGame: boolean;
  position: Array<Array<string>>;
  white: string;
}

// Spotify

interface ICurrentlyPlayingResponse {
  context: object | null;
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: ITrackObject | null;
  currently_playing_type: string;
  actions: object;
  Authorization: string;
}

interface IAudioFeaturesResponse {
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

interface ITrackArtistObject {
  external_urls: object
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface ITrackAlbumImageObject {
  height: number;
  url: string;
  width: number;
}

interface ITrackAlbumObject {
  album_type: string;
  artists: Array<ITrackArtistObject>
  available_markets: Array<string>
  external_urls: object;
  href: string;
  id: string;
  images: Array<ITrackAlbumImageObject>
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

interface ITrackObject {
  album: ITrackAlbumObject;
  artists: Array<ITrackArtistObject>
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

interface IPagingObject<T> {
  href: string;
  items: Array<T>;
  limit: number;
  next: string;
  offest: number;
  previous: string;
  total: number;
}

interface IConvertedTrack {
  cover: string;
  artist: string;
  track: string;
  href: string;
}

interface ICursorBasedPagingObject<T> {
  href: string;
  items: Array<T>;
  limit: number;
  next: string;
  cursors: object;
  total: number;
  Authorization: string;
}

interface ITrackSimplifiedObject {
  id: string;
}

interface IPlayHistoryObject {
  track: ITrackSimplifiedObject;
  played_at: number;
  context: object;
}

// Misc

interface ISkillPath {
  type: string;
  fill: string;
  d: string;
  fillRule: string;
  clipRule: string;
  styles: string;
  transform?: string;
}

