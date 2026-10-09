import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'Draftr Docs',
  tagline: 'Visual Architecture Specification & Modeling Language',
  favicon: 'img/favicon.svg',

  url: 'https://michaelsolati.github.io',
  baseUrl: process.env.DOCS_BASE_URL || '/draftr/docs/',

  organizationName: 'MichaelSolati',
  projectName: 'draftr',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Draftr',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://michaelsolati.github.io/draftr/',
          label: 'Launch App',
          position: 'right',
        },
        {
          href: 'https://github.com/MichaelSolati/draftr',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/',
            },
            {
              label: 'Syntax Guide',
              to: '/syntax/blocks',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Web App',
              href: 'https://michaelsolati.github.io/draftr/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/MichaelSolati/draftr',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Draftr. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json', 'mermaid'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
