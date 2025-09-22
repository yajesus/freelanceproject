import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'Enter your username' },
        password: { label: 'Password', type: 'password', placeholder: 'Enter your password' }
      },
      async authorize(credentials) {
        if (!credentials || !credentials.username || !credentials.password) return null;

        // const user = { id: '1', name: 'admin', password: 'admin123' };
        const user = await prisma.adminUser.findUnique({ where: { username: credentials.username } });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (isValid) {
          return user;
        } else {
          return null;
        }
      }
    })
  ],
  theme: {
    colorScheme: 'dark', // "auto" | "dark" | "light"
    brandColor: '#007b01', // Hex color code
    logo: '', // Absolute URL to image
    buttonText: '#002601' // Hex color code
  }
};
