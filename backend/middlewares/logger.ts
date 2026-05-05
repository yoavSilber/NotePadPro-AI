import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const logPath = path.join(__dirname, '..', 'log.txt');

const SENSITIVE_FIELDS = new Set(["password", "passwordHash", "token"]);

const redactBody = (body: Record<string, unknown>): Record<string, unknown> => {
  if (!Object.keys(body).length) return {};
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.has(k) ? "[REDACTED]" : v,
    ])
  );
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const body = JSON.stringify(redactBody(req.body));

  const logEntry = `[${timestamp}] ${method} ${url} - body: ${body}\n`;

  fs.appendFile(logPath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });

  next();
};
