import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        orgId: string;
        email: string;
        role: Role;
      };
      sessionId?: string;
    }
  }
}

