import { type Request, type Response, type NextFunction } from 'express';
export declare const lockoutMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const checkAccountLockout: (identifier: string) => Promise<boolean>;
export declare const handleFailedLogin: (identifier: string) => Promise<void>;
export declare const resetFailedLogins: (identifier: string) => Promise<void>;
//# sourceMappingURL=lockoutMiddleware.d.ts.map