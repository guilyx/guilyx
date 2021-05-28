import React from 'react';

interface IConvertSVGParameters {
  children: React.ReactNode,
  height: string,
  width: string,
}

/**
 * Most important component here. Allows us to send components as images back to Github
 * Everything we make will be inside
 *
 * @param {string} width
 * @param {string} height
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
          {`
            * {
              margin: 0;
              box-sizing: border-box;
            }
          `}
        </style>
        { children }
      </div>
    </foreignObject>
  </svg>
);

export default ConvertSVG;
