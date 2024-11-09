import { Request, Response, NextFunction } from 'express';

export const validateAuthRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username} = req.body;
  if (!username) {
    return res.status(400).json({
      message: 'Username and password are required'
    });
  }
  next();
};