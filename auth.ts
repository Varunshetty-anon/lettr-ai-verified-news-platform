import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./lib/mongodb";
import { User } from "./models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        await dbConnect();
        
        const user: any = await User.findOne({ email: credentials.email });
        
        if (!user) {
          // No user found — don't auto-register here, use /api/auth/signup
          throw new Error("No account found with this email. Please sign up first.");
        }

        // Verify password with bcrypt
        if (!user.password) {
          throw new Error("This account uses Google sign-in. Please use Google to log in.");
        }
        
        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) {
          throw new Error("Invalid password.");
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image || null,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          await User.create({
            name: user.name || "Unknown",
            email: user.email as string,
            image: user.image || "",
            role: 'READER',
            isVerifiedAuthor: false,
            preferences: [],
            categoryAffinity: {},
          });
        } else if (!existingUser.image && user.image) {
          // Update image if not set
          existingUser.image = user.image;
          await existingUser.save();
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email || user?.email });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser._id.toString();
          token.image = dbUser.image || "";
          token.preferencesCount = (dbUser.preferences || []).length;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).image = token.image || "";
        (session.user as any).preferencesCount = token.preferencesCount || 0;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth',
  },
  session: { strategy: "jwt" }
});
