import {
  type ArchitectureProject,
  exportToMermaidClassDiagram,
  exportToMermaidFlowchart,
} from '@arch-spec/core';

export interface ClaudeHandoffPayload {
  projectId: string;
  projectName: string;
  rawOutlineText: string;
  classes: ArchitectureProject['classes'];
  uiComponents: ArchitectureProject['uiComponents'];
  connections: ArchitectureProject['connections'];
  mermaidClassDiagram: string;
  mermaidFlowchart: string;
  updatedAt: number;
}

export function buildClaudeHandoffPayload(
  project: ArchitectureProject
): ClaudeHandoffPayload {
  return {
    projectId: project.id,
    projectName: project.name,
    rawOutlineText: project.rawOutlineText,
    classes: project.classes,
    uiComponents: project.uiComponents,
    connections: project.connections,
    mermaidClassDiagram: exportToMermaidClassDiagram(project),
    mermaidFlowchart: exportToMermaidFlowchart(project),
    updatedAt: project.updatedAt,
  };
}

export function formatClipboardPrompt(project: ArchitectureProject): string {
  const payload = buildClaudeHandoffPayload(project);
  return `<architecture_specification project="${payload.projectName}">
<overview>
Please implement this software system following the architecture graph, domain classes, method signatures, UI hierarchy, and invocation call paths specified below.
</overview>

<raw_outline>
${payload.rawOutlineText}
</raw_outline>

<mermaid_class_diagram>
${payload.mermaidClassDiagram}
</mermaid_class_diagram>

<mermaid_flowchart>
${payload.mermaidFlowchart}
</mermaid_flowchart>

<data_contract_json>
${JSON.stringify({classes: payload.classes, uiComponents: payload.uiComponents, connections: payload.connections}, null, 2)}
</data_contract_json>
</architecture_specification>`;
}

export async function sendHandoffToLocalBridge(
  project: ArchitectureProject,
  endpoint = 'http://localhost:4318/api/claude/handoff'
): Promise<{success: boolean; message: string}> {
  const payload = buildClaudeHandoffPayload(project);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return {
        success: true,
        message: 'Specification transmitted to Claude successfully!',
      };
    }
    return {
      success: false,
      message: `Bridge responded with status ${res.status}: ${res.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : 'Unable to connect to local Claude bridge endpoint',
    };
  }
}
