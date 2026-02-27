import type { Request } from "express";

export interface UserClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

/** Express Request with guaranteed authenticated user (use after isAuthenticated middleware) */
export interface AuthedRequest extends Request {
  user: {
    claims: UserClaims;
  };
}
