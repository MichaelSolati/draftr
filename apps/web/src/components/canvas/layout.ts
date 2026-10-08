import dagre from '@dagrejs/dagre';
import {type Edge, type Node} from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR';

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

/**
 * Computes hierarchical layout positions for nodes using Dagre.
 * Returns a mapping of nodeId -> { x, y } coordinates aligned to top-left.
 */
export function computeAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Record<string, {x: number; y: number}> {
  const {
    direction = 'TB',
    nodeWidth = 280,
    nodeHeight = 200,
    nodeSep = 70,
    rankSep = 90,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach(node => {
    const width = node.measured?.width || (node.width as number) || nodeWidth;
    const height =
      node.measured?.height || (node.height as number) || nodeHeight;
    dagreGraph.setNode(node.id, {width, height});
  });

  edges.forEach(edge => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const positions: Record<string, {x: number; y: number}> = {};
  nodes.forEach(node => {
    const layoutedNode = dagreGraph.node(node.id);
    if (layoutedNode) {
      const width = node.measured?.width || (node.width as number) || nodeWidth;
      const height =
        node.measured?.height || (node.height as number) || nodeHeight;
      positions[node.id] = {
        x: Math.round(layoutedNode.x - width / 2),
        y: Math.round(layoutedNode.y - height / 2),
      };
    }
  });

  return positions;
}
