import { Privacy, ReactionType } from "@prisma/client";
export { Privacy, ReactionType };

export interface JwtPayload {
  userId: string;
  email: string;
}

// Extend Express Request to include the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
