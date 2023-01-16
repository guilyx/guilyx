// Packages
import React from 'react';

// Local Imports
import { AUTH_CSS } from './config';
import ConvertSVG from './ConvertSVG';
import Text from './Text';

export interface IAuthParameters {
  refreshToken: string;
}

/**
 * Pretty way to display refresh token in development mode.
 * 
 * @param {string} refreshToken Spotify refresh token.
 * @returns {React.FC} Functional React component.
 */
export const Auth: React.FC<IAuthParameters> = ({ refreshToken }: IAuthParameters) => {
  return (
    <ConvertSVG
      width="800"
      height="212">
      <div id="auth-wrapper">
        <Text
          id="title"
          color="standard"
          size="title"
          weight="bold">
          your spotify refresh token
        </Text>

        <Text
          id="token"
          color="gray">
          { refreshToken }
        </Text>
      </div>
      
      <style>
        { AUTH_CSS }
      </style>
    </ConvertSVG>
  );
};
