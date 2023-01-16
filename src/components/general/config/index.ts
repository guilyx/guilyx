/**
 * Style for ConvertSVG component.
 */
export const CONVERT_SVG_CSS = `
* {
  margin: 0;
  box-sizing: border-box;
}

#auth-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

#title {
  text-align: center;
}

#token {
  width: 400px;
  text-align: center;
  overflow-wrap: break-word;
  white-space: normal;
}
`;

/**
 * Style for Auth component.
 */
export const AUTH_CSS = `
* {
  margin: 0;
  box-sizing: border-box;
}
`;

/**
 * Text color options for Text component.
 */
 export const TEXT_COLORS: object = {
  default: 'black',
  'grey-lighter': '#999999',
  'gray-light': '#e1e4e8',
  gray: '#586069',
  'gray-dark': '#24292e',
  'standard': 'rgba(115, 115, 115, .8)',
};

/**
 * Text font families options for Text component.
 */
 export const TEXT_FONT_FAMILIES: object = {
  default: '-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji',
  mono: 'SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
};

/**
 * Text size options for Text component.
 */
export const TEXT_SIZES: object = {
  default: 14,
  small: 12,
  title: 18,
};

/**
 * Text weight options for Text component.
 */
export const TEXT_WEIGHTS: object = {
  default: 400,
  bold: 600,
};