// Packages
import React from 'react';

// Local Imports
import {
  PATHS,
  SKILLS_CSS,
} from './config';
import ConvertSVG from '../general/ConvertSVG';
import Icon from './Icon';

export interface ISkillsParameters {
  skills: string[];
}

/**
 * Component for various SVG icons.
 * 
 * @param {string[]} skills List of skills to display.
 * @returns {React.FC} Functional React component.
 */
export const Skills: React.FC<ISkillsParameters> = ({ skills }: ISkillsParameters) => {
  return (
    <ConvertSVG
      width="800"
      height="212">
      <div id="icon-wrapper">
        {skills.map((skillName) => (
          <Icon
            key={ `icon-${ skillName }` }
            name={ skillName }
            skill={ PATHS[skillName] } />
        ))}
      </div>
      
      <style>
        { SKILLS_CSS }
      </style>
    </ConvertSVG>
  );
};
