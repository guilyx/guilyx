// Packages
import {
    VercelRequest,
    VercelResponse,
  } from '@vercel/node';
  
  // Local Imports
  import skillsHandler from '../src/handlers/general/skills';
  import { ERROR_MESSAGE_500 } from '../src/config';
  
  /**
   * Returns an image displaying icons of skills and languages.
   *
   * @param {VercelRequest} req Request for image.
   * @param {VercelResponse} res Response to request.
   */
  export default async function (req: VercelRequest, res: VercelResponse) {
    try {
      return await skillsHandler(req, res);
    } catch (error) {
      console.error(error);
      return res.status(500).send(ERROR_MESSAGE_500);
    }
  }
  