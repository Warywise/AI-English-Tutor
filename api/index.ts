import type { Request, Response } from 'express';
import app from '../src/server/app';

// Vercel Serverless Function entry point
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
