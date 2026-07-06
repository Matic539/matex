import type { NextFunction, Request, Response } from 'express';

// Envuelve controladores async para que sus errores lleguen al
// middleware de errores (Express 4 no los captura por sí solo).
type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncController) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
