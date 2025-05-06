import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
console.log(JWT_SECRET)
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables');
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log(token)
    if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return; // Explicitly return to stop further execution
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            res.status(401).json({ message: 'Unauthorized' });
            return; // Explicitly return to stop further execution
        }

        // If you want to attach the decoded token to the request object:
        // req.user = decoded;

        next(); // Call next without arguments
    });
};