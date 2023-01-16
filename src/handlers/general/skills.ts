// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

// Local Imports
import { convertToImageResponse } from '../../helpers/image';
import { SKILL_KEYS } from '../../config';
import { Skills } from '../../components/skills/Skills';

/**
 * Returns an image displaying icons of skills and languages.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (
  req: VercelRequest,
  res: VercelResponse,
) {
  // Hey! I'm returning an image!
  convertToImageResponse(res);
  
  // Generating the component and rendering it
  const text: string = renderToString(
    Skills({ skills: SKILL_KEYS }),
  );

  return res.send(text);
}
