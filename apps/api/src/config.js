import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
  webPublicUrl: process.env.WEB_PUBLIC_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar',
  jwtExpiresIn: '7d',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ai: {
    apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    responseDays: Number(process.env.AI_RESPONSE_DAYS || 5)
  }
};

if (!env.supabaseUrl || !env.supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados');
}
