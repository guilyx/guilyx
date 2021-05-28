import React from 'react';

interface ITextParameters {
  children: React.ReactNode | string,
  weight: string,
  family: string,
  color: string,
  size: string,
}

const sizes: object = {
  default: 14,
  small: 12,
  title: 18,
};

const colors: object = {
  default: 'black',
  'grey-lighter': '#999999',
  'gray-light': '#e1e4e8',
  gray: '#586069',
  'gray-dark': '#24292e',
  'standard': 'rgba(115, 115, 115, .8)',
};

const families: object = {
  default: '-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji',
  mono: 'SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
};

const weights: object = {
  default: 400,
  bold: 600,
};

/**
 * Text
 * Simple text line with styles as props.
 * @param weight
 * @param family 
 * @param color
 * @param size 
 */
const Text: React.FC<any> = ({
  children = '',
  weight = 'default',
  family = 'default',
  color = 'default',
  size = 'default',
  ...props
}: ITextParameters) => {
  return (
    <p
      style={{
        color: colors[color],
        fontFamily: families[family],
        fontSize: `${sizes[size]}px`,
        fontWeight: weights[weight],
        lineHeight: 1.5,
        whiteSpace: 'pre',
      }}
      { ...props }>
      { children }
    </p>
  );
};

export default Text;
