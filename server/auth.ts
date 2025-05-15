import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import session from "express-session";

// Extend Express.Session interface to include our user property
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

/**
 * Utility function to hash a password using SHA-256
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized. Please log in." });
}

/**
 * Middleware to check if user is an admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ message: "Forbidden. Admin access required." });
}

/**
 * Login a user
 */
export async function loginUser(username: string, password: string) {
  try {
    // Hash the password for comparison
    const hashedPassword = hashPassword(password);
    
    // Find the user
    const user = await db.select().from(users).where(eq(users.username, username));
    
    if (user.length === 0) {
      return { success: false, message: "User not found" };
    }
    
    const foundUser = user[0];
    
    // Check the password
    if (foundUser.passwordHash !== hashedPassword) {
      return { success: false, message: "Invalid password" };
    }
    
    // Return user data (excluding the password hash)
    return { 
      success: true, 
      user: {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role
      }
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An error occurred during login" };
  }
}

/**
 * Register auth routes
 */
export function registerAuthRoutes(app: any) {
  // Login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    const result = await loginUser(username, password);
    
    if (result.success) {
      // Set user in session
      req.session.user = result.user;
      return res.json({ user: result.user });
    } else {
      return res.status(401).json({ message: result.message });
    }
  });
  
  // Logout route
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      
      res.clearCookie('connect.sid');
      return res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }
    
    return res.status(401).json({ message: "Not authenticated" });
  });
}