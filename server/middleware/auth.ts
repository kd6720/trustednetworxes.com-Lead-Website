import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Augment Express request with the authenticated user / api key context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      apiKeyScopes?: string[];
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

/** Require a valid JWT bearer token. Populates req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 🔓 NO_AUTH bypass — skip authentication entirely
  const noAuth = String(process.env.NO_AUTH).toLowerCase();
  if (noAuth === "true" || noAuth === "1") {
    req.user = { id: "noauth", email: "noauth@dev", name: "No Auth", role: "admin" };
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & { iat: number; exp: number };
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Require a specific role (or one of several). Must run after requireAuth. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

/**
 * Authenticate via API key (x-api-key header). Used by the public REST API.
 * Populates req.user (the key owner) and req.apiKeyScopes.
 */
export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (!key || typeof key !== "string") {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }
  const apiKey = await prisma.apiKey.findUnique({ where: { key }, include: { user: true } });
  if (!apiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsed: new Date() } });
  req.apiKeyScopes = apiKey.scopes.split(",").map((s) => s.trim());
  if (apiKey.user) {
    req.user = {
      id: apiKey.user.id,
      email: apiKey.user.email,
      name: apiKey.user.name,
      role: apiKey.user.role,
    };
  }
  next();
}
