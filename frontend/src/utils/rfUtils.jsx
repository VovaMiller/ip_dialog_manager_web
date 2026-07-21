
export function genEdgeId(sourceNodeId, targetNodeId) {
  return `e_${sourceNodeId}_${targetNodeId}`;
}

export function getReactFlowEdge(sourceNodeId, targetNodeId) {
  return {
    id: genEdgeId(sourceNodeId, targetNodeId),
    type: 'straight',
    source: sourceNodeId,
    target: targetNodeId,
    animated: false,
    markerEnd: {
        type: 'arrow',
        // color: '#1890ff',
        width: 20,
        height: 20,
    },
  };
}
