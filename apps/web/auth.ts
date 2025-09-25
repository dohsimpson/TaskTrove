import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

// Single user credentials - in a real app, these would come from environment variables
const SINGLE_USER = {
  id: "1",
  name: "TaskTrove User",
  password: "password123", // In production, this should be hashed
}

const credentialsSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
      },
      async authorize(credentials) {
        try {
          const { password } = credentialsSchema.parse(credentials)

          // Simple password check for single user
          if (password === SINGLE_USER.password) {
            return {
              id: SINGLE_USER.id,
              name: SINGLE_USER.name,
            }
          }

          return null
        } catch (error) {
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET || "auth-disabled",
})
