export interface ICurrentDailyGame {
  white: string;
  black: string;
  url: string;
  fen: string;
  pgn: string;
  turn: string;
  move_by: number;
  draw_offer?: string | null;
  last_activity: number;
  start_time: number;
  time_control: string;
  time_class: string;
  rules: string;    
  tournament?: string; 
  match?: string;
}

export interface ICurrentDailyGames {
  games: ICurrentDailyGame[];
}

export interface ICurrentDailyGamesResponse {
  body: ICurrentDailyGames;
  statusCode: number;
}

export interface IConvertedGameObject {
  black: string;
  isWhite: boolean;
  noGame: boolean;
  position: Array<Array<string>>;
  white: string;
}
