// Packages
import { VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// Local Imports
import {
  IMAGE_RESPONSE_HEADERS,
  CACHE_CONTROL_RESPONSE_HEADERS,
} from '../config';

/**
 * Sets headers for Response object to return an image.
 *
 * @param {VercelResponse} res Response to request.
 */
export const convertToImageResponse = (res: VercelResponse) =>{
  res.setHeader(...IMAGE_RESPONSE_HEADERS);
  res.setHeader(...CACHE_CONTROL_RESPONSE_HEADERS);
}

/**
 * Converts an image URL to base64 string.
 *
 * @param {string} imageUrl URL to image to convert.
 * @returns {string} Base64 string of image.
 */
export const getImageData = async (imageUrl: string) => {
  if (imageUrl) {
    const buff: ArrayBuffer = await (await fetch(imageUrl)).arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
  }
};