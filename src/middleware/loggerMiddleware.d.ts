import type { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}
export declare const structuredLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=loggerMiddleware.d.ts.map