import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Syntax Specification',
      collapsed: false,
      items: [
        'syntax/blocks',
        'syntax/relationships',
        'syntax/modifiers',
        'syntax/polymorphism',
      ],
    },
    {
      type: 'category',
      label: 'Tooling & Integrations',
      collapsed: false,
      items: ['tooling/web-app', 'tooling/vscode', 'tooling/agent-skill'],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: ['reference/grammar', 'reference/linter-rules'],
    },
  ],
};

export default sidebars;
