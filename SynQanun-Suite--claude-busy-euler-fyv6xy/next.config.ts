import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Points next-intl at our request config. BUILD_PLAN.md §2 puts the i18n
// layer under lib/i18n/, so the default src/i18n/request.ts path is overridden.
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * THE FORMER PROJECTS REGISTER. At the client's request (October 2026) the
   * staff workspace has one Legal matters register, and a project is a legal
   * matter of the kind "Other projects". Every old project URL — the register
   * and each file — lands on that register filtered to the kind, so a bookmark
   * or a link in an old message still shows the work.
   *
   * Here rather than in a route file because a redirect thrown from a page
   * under the staff layout's loading boundary arrives after the stream has
   * started, as a blank screen and a client-side hop. A config redirect is a
   * plain 307 before anything renders. Temporary, not permanent: nothing about
   * this demo's URLs should be cached by a browser as final.
   *
   * The two route files this replaces carried the record of what the Stitch
   * export's projects screens claimed and this product refused; it is in the
   * history of app/[locale]/(staff)/staff/projects/.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:8000/api/:path*',
        },
      ],
    };
  },

  async redirects() {
    return [
      {
        source: '/:locale(en|ar)/staff/projects/:path*',
        destination: '/:locale/staff/matters?type=otherProject',
        permanent: false,
      },
      {
        source: '/:locale(en|ar)/staff/projects',
        destination: '/:locale/staff/matters?type=otherProject',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
