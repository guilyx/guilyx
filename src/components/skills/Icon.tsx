// Packages
import React from 'react';

// Types
import { ISVGPath } from '../../types/general';

interface IconParameters {
  height: string;
  name: string;
  skill: ISVGPath[];
  width: string;
}

/**
 * Displays a given icon based on SVG path data.
 *
 * @param {string} height Height of the icon.
 * @param {string} name Name of the icon.
 * @param {ISVGPath[]} skill List of SVG paths to display.
 * @param {string} width Width of the icon.
 * @returns {React.FC} Functional React component.
 */
const Icon: React.StatelessComponent<IconParameters> = ({
  height,
  name,
  skill,
  width,
}: IconParameters) => (
  <svg
    height={ height || '70px' }
    width={ width || '70px' }
    version="1"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg">
    {skill.map((path, index) => (
      <path
        key={ `icon-${name}-path-${index}` }
        fill={ path.fill || 'black' }
        d={ path.d || 'none' }
        fillRule={ path.fillRule || 'nonzero' }
        clipRule={ path.clipRule || 'nonzero' }
        styles={ path.styles || '' }
        transform={ 'transform' in path ? path.transform : '' }/>
    ))}
  </svg>
);

export default Icon;
