// Without a defined matcher, this one line will apply next-auth to the entire project
export { default } from 'next-auth/middleware';

// Applies next-auth to all admin routes
export const config = { matcher: '/admin/:path*' };
