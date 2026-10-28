import 'dotenv/config';

export function jwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  return value;
}

export const corsOrigins = () =>
  (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3001')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
