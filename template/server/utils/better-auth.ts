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
})
