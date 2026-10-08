import {describe, it, expect} from 'vitest';
import {computeAutoLayout} from '../layout';
import {type Node, type Edge} from '@xyflow/react';

function createSampleGraph(): {nodes: Node[]; edges: Edge[]} {
  return {
    nodes: [
      {id: 'node-1', position: {x: 0, y: 0}, data: {}},
      {id: 'node-2', position: {x: 0, y: 0}, data: {}},
    ],
    edges: [{id: 'e1-2', source: 'node-1', target: 'node-2'}],
  };
}

describe('computeAutoLayout', () => {
  it('computes hierarchical positions for nodes with edges', () => {
    const {nodes, edges} = createSampleGraph();
    const positions = computeAutoLayout(nodes, edges, {direction: 'TB'});

    expect(positions['node-1']).toBeDefined();
    expect(positions['node-2']).toBeDefined();
    // In Top-to-Bottom, target node should have higher y than source node
    expect(positions['node-2'].y).toBeGreaterThan(positions['node-1'].y);
  });

  it('supports Left-to-Right layout direction', () => {
    const {nodes, edges} = createSampleGraph();
    const positions = computeAutoLayout(nodes, edges, {direction: 'LR'});

    expect(positions['node-1']).toBeDefined();
    expect(positions['node-2']).toBeDefined();
    // In Left-to-Right, target node should have higher x than source node
    expect(positions['node-2'].x).toBeGreaterThan(positions['node-1'].x);
  });
});
