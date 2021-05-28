
import React from "react";

interface IconParameters {
  height: string,
  name: string,
  skill: Array<ISkillPath>,
  width: string,
}

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
