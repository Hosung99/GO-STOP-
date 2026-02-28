export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000'),
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-key',
  TURN_TIMEOUT_MS: 30000,
  RECONNECT_TIMEOUT_MS: 60000,
} as const

export function validateEnv(): void {
  if (env.NODE_ENV === 'production') {
    if (!env.SUPABASE_URL) throw new Error('SUPABASE_URL required')
    if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required')
  }
}
