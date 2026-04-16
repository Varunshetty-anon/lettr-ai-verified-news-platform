import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./lib/mongodb";
import { User } from "./models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_PRIVATE_KEY || "", // Typically requires specialized generation for standard JWT matching
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "archive@domain.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        await dbConnect();
        
        // This is a naive implementation for the sake of demo, 
        // normally we use bcrypt to compare passwords.
        // If the user doesn't exist, we can register them inline or fail them.
        let user: any = await User.findOne({ email: credentials.email });
        
        if (!user) {
           // Registration flow
           user = await User.create({
             name: (credentials.email as string).split("@")[0],
             email: credentials.email,
             password: credentials.password, // IMPORTANT: Hash this in real prod
             role: 'READER' // Role assigned Reader by default
           });
        } else {
           if (user.password !== credentials.password) {
             throw new Error("Invalid password");
           }
        }
        
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        await dbConnect();
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          await User.create({
            name: user.name || (account.provider === "apple" ? "Apple User" : "Unknown"),
            email: user.email,
            image: user.image,
            role: 'READER'
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Find DB user to attach role
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser._id.toString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // We will build a custom login page eventually
  },
  session: { strategy: "jwt" }
});
