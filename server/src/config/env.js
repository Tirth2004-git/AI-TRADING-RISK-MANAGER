import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/risk_manager',
  mongodbTestUri:
    process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/risk_manager_test',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  appUrl: process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS) || 168,
  cookieSecure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production',
  trustProxy: process.env.TRUST_PROXY === 'true' || nodeEnv === 'production',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'AI Risk Manager <noreply@localhost>',
};

export default env;
