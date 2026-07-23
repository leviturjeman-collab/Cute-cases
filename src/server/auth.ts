import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { verify } from '@node-rs/argon2';
import { prisma } from './db';
import { ApiException } from './errors';

/**
 * Autenticación (§7.1): Email+contraseña (argon2id), Google y Apple.
 * Sesión JWT persistente de 30 días. Sin fecha de nacimiento ni datos
 * innecesarios (§13, minimización).
 */

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Contraseña', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
      });
      if (!user?.passwordHash || !user.activo) return null;
      const ok = await verify(user.passwordHash, credentials.password);
      if (!ok) return null;
      return { id: user.id, email: user.email, name: user.nombre };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días (§7.1)
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth: alta/actualización del usuario propio (Google/Apple)
      if (account && account.provider !== 'credentials' && user.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          create: {
            email: user.email.toLowerCase(),
            nombre: user.name ?? null,
            provider: account.provider,
            emailVerificado: true,
          },
          update: {},
        });
        if (!dbUser.activo) return false; // cuenta desactivada desde admin (§11)
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email && !token.uid) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          select: { id: true, rol: true },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.rol = dbUser.rol;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { rol?: string }).rol = (token.rol as string) ?? 'user';
      }
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  email: string;
  rol: string;
}

/** Devuelve el usuario de la sesión o null (para endpoints públicos). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string; rol?: string } | undefined;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, rol: user.rol ?? 'user' };
}

/** Exige sesión; lanza AUTH si no la hay (§12.3). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiException('AUTH', 'Sesión requerida');
  return user;
}

/** Exige rol admin comprobado en servidor en cada endpoint (§11). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.rol !== 'admin') throw new ApiException('ADMIN', 'Requiere rol admin');
  return user;
}
