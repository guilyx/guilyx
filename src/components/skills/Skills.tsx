import React from 'react';

import ConvertSVG from '../ConvertSVG';
import Icon from './Icon';
import { paths } from './config';


export interface ISkillsParameters {
  skills: Array<string>
};

/**
 * Displays various SVG icons
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
            skill={ paths[skillName] } />
        ))}
      </div>
      
      <style>
        {`
          #icon-wrapper {
            display: flex;
            flex-wrap: wrap;
          }
          
          #icon-wrapper svg {
            background: rgba(250, 250, 250, .2);
            border: 1px solid rgba(0,0,0,.01);
            border-radius: 12px;
            box-shadow: 2px 2px 2px rgba(0,0,0,.2), -1px -1px 1px rgba(0,0,0,.05);
            margin: 12px;
            padding: 8px;
          }
        `}
      </style>
    </ConvertSVG>
  );
};
