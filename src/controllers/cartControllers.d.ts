import { type Request, type Response } from 'express';
export declare const getCart: (req: Request, res: Response) => void;
export declare const addToCart: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const removeFromCart: (req: Request, res: Response) => void;
//# sourceMappingURL=cartControllers.d.ts.map