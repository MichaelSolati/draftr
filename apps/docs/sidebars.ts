import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Syntax Specification',
      collapsed: false,
      items: [
        'syntax/overview',
        {
          type: 'category',
          label: 'Supported Objects',
          collapsed: false,
          items: [
            'syntax/objects/class',
            'syntax/objects/db',
            'syntax/objects/api',
            'syntax/objects/ui',
            'syntax/objects/event',
            'syntax/objects/state',
            'syntax/objects/function',
            'syntax/objects/type',
          ],
        },
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
