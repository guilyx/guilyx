// Packages
import dotenv from 'dotenv';

dotenv.config();

/**
 * Static methods for retrieving environment variables.
 */
export class Environment {
  /**
   * Retrieves Spotify client Id.
   *
   * @returns {string} Spotify client Id.
   */
  static getSpotifyClientId(): string {
    return process.env.SPOTIFY_CLIENT_ID || '#';
  }

  /**
   * Retrieves Spotify client secret.
   *
   * @returns {string} Spotify client secret.
   */
  static getSpotifyClientSecret(): string {
    return process.env.SPOTIFY_CLIENT_SECRET || '#';
  }

  /**
   * Retrieves Spotify refresh token.
   *
   * @returns {string} Spotify refresh token.
   */
  static getSpotifyRefreshToken(): string {
    return process.env.SPOTIFY_REFRESH_TOKEN || '#';
  }

  /**
   * Retrieves Chess.com username.
   *
   * @returns {string} Chess.com username.
   */
  static getChessUsername(): string {
    return process.env.CHESS_COM_USERNAME || '#';
  }

  /**
   * Retrieves server state.
   *
   * @returns {string} Server state.
   */
  static getState(): string {
    return process.env.STATE || '#';
  }

  /**
   * Retrieves server environment.
   *
   * @returns {string} Server environment.
   */
  static getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Whether to use mock data.
   *
   * @returns {boolean}  Whether to use mock data.
   */
  static useMockData(): boolean {
    return process.env.MOCK_DATA === 'true';
  }
}
