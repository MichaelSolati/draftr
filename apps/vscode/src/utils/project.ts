import {type ArchitectureProject, parseOutline} from '@draftr/core';

export function createProjectFromText(
  text: string,
  fileName = 'active-spec.draftr'
): ArchitectureProject {
  const result = parseOutline(text);
  return {
    id: 'active-spec',
    name: fileName,
    rawOutlineText: text,
    classes: result.classes,
    uiComponents: result.uiComponents,
    tables: result.tables,
    apiRoutes: result.apiRoutes,
    events: result.events,
    states: result.states,
    connections: result.connections,
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}
