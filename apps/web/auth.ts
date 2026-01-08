import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { verifyPassword } from "@tasktrove/utils"
import { safeReadUserFile } from "@/lib/utils/safe-file-operations"

// Helper function to get current user from data file
async function getCurrentUser() {
  try {
    const userData = await safeReadUserFile()
    if (!userData) {
      return null
    }
    return userData.user
  } catch (error) {
    console.error("Failed to read user data:", error)
    return null
  }
}

const credentialsSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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

          // Get current user from data file
          const currentUser = await getCurrentUser()
          if (!currentUser) {
            return null
          }

          // Verify password using secure hash comparison
          if (verifyPassword(password, currentUser.password)) {
            return {
              id: "1", // Static ID for single user app
              name: currentUser.username,
            }
          }

          return null
        } catch {
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- user is undefined on subsequent JWT callback invocations
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id
      }
      return session
    },
  },
  // when AUTH_SECRET is not set, disable auth
  secret: process.env.AUTH_SECRET || "auth-disabled",
})
