import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { createHash } from "crypto";

// Global error handlers to prevent crashes from worker processes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (error.message && error.message.includes('tesseract')) {
    console.error('Tesseract worker error caught - continuing operation');
    return; // Don't crash the process for Tesseract errors
  }
  // For other uncaught exceptions, we might want to crash
  console.error('Fatal error, exiting process');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && typeof reason === 'object' && 'message' in reason && 
      typeof reason.message === 'string' && reason.message.includes('tesseract')) {
    console.error('Tesseract worker rejection caught - continuing operation');
    return; // Don't crash the process for Tesseract errors
  }
});

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Session configuration
app.use(session({
  secret: createHash('sha256').update('research-portal-session-secret').digest('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Development middleware to bridge dummy users with session-based auth
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // If no session user is set, use a default development user
    if (!req.session.user) {
      // Default to Management user for development access
      req.session.user = {
        id: 8,
        username: 'iris.admin',
        name: 'Iris Administrator', 
        email: 'iris.admin@research.org',
        role: 'Management'
      };
    }
    next();
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Register API routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
