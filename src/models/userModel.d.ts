export interface User {
    id?: number;
    name: string;
    email: string;
    password_hash: string;
    role?: string;
    created_at?: Date;
}
export declare const createUser: (name: string, email: string, passwordHash: string, role?: string) => Promise<User>;
export declare const findUserByEmail: (email: string) => Promise<User | null>;
//# sourceMappingURL=userModel.d.ts.map