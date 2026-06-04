import { env } from 'node:process'
import { betterAuth } from 'better-auth'

const isProduction = env.NODE_ENV === 'production'

function splitEnvList(value?: string) {
  return value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) || []
}

function getBetterAuthSecret() {
  const secret = env.BETTER_AUTH_SECRET || env.AUTH_SECRET

  if (isProduction && (!secret || secret.length < 32)) {
    throw new Error('BETTER_AUTH_SECRET or AUTH_SECRET must be set to a 32+ character value in production')
  }

  return secret
}

export const auth = betterAuth({
  secret: getBetterAuthSecret(),
  baseURL: env.BETTER_AUTH_URL || env.BETTER_AUTH_BASE_URL,
  trustedOrigins: splitEnvList(env.BETTER_AUTH_TRUSTED_ORIGINS),
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    customRules: {
      '/api/auth/sign-in/email': {
        window: 60,
        max: 5,
      },
      '/api/auth/sign-up/email': {
        window: 60,
        max: 3,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    disableCSRFCheck: false,
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: 'lax',
      path: '/',
    },
  },
  // Enable organization() here when you switch Nuva permission to Better Auth.
  // Then re-run Better Auth migrations and configure roles/access control.
})
