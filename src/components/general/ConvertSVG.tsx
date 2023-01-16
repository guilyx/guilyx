// Packages
import React from 'react';

// Local Imports
import { CONVERT_SVG_CSS } from './config';

interface IConvertSVGParameters {
  children: React.ReactNode;
  height: string;
  width: string;
}

/**
 * Most important component here. Allows us to send components as images back to Github.
 * Everything we make will be inside.
 *
 * @param {string} width Width of the component.
 * @param {string} height Height of the component.
 * @returns {React.FC} Functional React component.
 */
const ConvertSVG: React.StatelessComponent<{
  height: string,
  width: string,
}> = ({
  children,
  height,
  width,
}: IConvertSVGParameters) => (
  <svg
    height={height}
    width={width}
    viewBox={`0 0 ${width} ${height}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <foreignObject
      width={width}
      height={height}>
      <div {...{ xmlns: "http://www.w3.org/1999/xhtml" }}>
        <style>
          { CONVERT_SVG_CSS }
        </style>
        { children }
      </div>
    </foreignObject>
  </svg>
);

export default ConvertSVG;
