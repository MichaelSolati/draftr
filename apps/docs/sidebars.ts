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
        'syntax/members',
        'syntax/invocations',
        'syntax/operators',
        'syntax/modifiers',
        'syntax/polymorphism',
        'syntax/relationships',
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
