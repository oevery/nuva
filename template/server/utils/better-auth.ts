import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // Enable organization() here when you switch Nuva permission to Better Auth.
  // Then re-run Better Auth migrations and configure roles/access control.
})
