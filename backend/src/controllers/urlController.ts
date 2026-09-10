import { Request, Response } from 'express';
import { UrlService } from '../services/urlService';
import { asyncHandler } from '../utils/asyncHandler';
import { ShortenRequestBody } from '../types/url';


export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  shorten = asyncHandler(async (req: Request, res: Response) => {
    const { originalUrl } = req.body as ShortenRequestBody;
    const result = await this.urlService.shorten(originalUrl);
    res.status(201).json(result);
  });

  redirect = asyncHandler(async (req: Request, res: Response) => {
    const originalUrl = await this.urlService.resolveAndTrack(req.params.shortCode);
    res.redirect(302, originalUrl);
  });

  stats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.urlService.getStats(req.params.shortCode);
    res.status(200).json(stats);
  });
}
