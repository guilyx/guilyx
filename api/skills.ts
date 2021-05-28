import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

import { Skills } from '../src/components/skills/Skills';

const SKILLS = [
  'vue',
  'react',
  'sass',
  'typescript',
  'nuxt',
  'node',
  'mongodb',
  'terraform',
  'csharp',
  'python',
  'java',
  'c',
  'cplusplus',
  'git',
];

/**
 * Returns an image displaying icons of skills and languages
 *
 * @param {VercelRequest} req
 * @param {VercelResponse} res
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  // Hey! I'm returning an image!
  res.setHeader(
    'Content-Type',
    'image/svg+xml',
  );
  res.setHeader(
    'Cache-Control',
    's-maxage=1, stale-while-revalidate',
  );
  
  // Generating the component and rendering it
  const text: string = renderToString(
    Skills({ skills: SKILLS }),
  );

  return res.send(text);
}
