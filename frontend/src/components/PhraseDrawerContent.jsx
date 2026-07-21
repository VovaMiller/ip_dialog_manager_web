import { memo, useEffect, useState } from 'react';
import { Input, Select, Space } from 'antd';
import fastDeepEqual from 'fast-deep-equal';

import { getReactFlowEdge } from '@/utils/rfUtils';
import useGameDialogsStore from '@/store/useGameDialogsStore';

function PhraseDrawerContent({ rfInstance, dialogID, nodeID }) {
  const [buffer, setBuffer] = useState(null);

  const phraseNode = useGameDialogsStore(state => state.getNode(dialogID, nodeID));
  const nodes = useGameDialogsStore(state => state.getNodes(dialogID));
  const edges = useGameDialogsStore(state => state.getEdges(dialogID));

  const {
    findEdgeId,
    updatePhrase,
    addPhraseConnection,
  } = useGameDialogsStore.getState();

  // Обновление буфера при открытии новой фразы.
  useEffect(() => {
    if (phraseNode) {
      setBuffer(phraseNode);
    }
  }, [phraseNode]);

  const checkDiff = () => {
    if (!!dialogID && !!phraseNode && !!buffer) {
      if (!fastDeepEqual(phraseNode, buffer)) {
        updatePhrase(dialogID, buffer);
      }
    }
  };
  
  const onPhraseNextSelect = (value) => {
    if (!rfInstance) return;
    if (!!dialogID && !!phraseNode) {
      const edgeExists = !!findEdgeId(dialogID, phraseNode.id, value);
      if (!edgeExists) {
        rfInstance.addEdges(getReactFlowEdge(phraseNode.id, value));
        addPhraseConnection(dialogID, phraseNode.id, value);
      }
    }
  };
  
  const onPhraseNextDeselect = (value) => {
    if (!rfInstance) return;
    if (!!dialogID && !!phraseNode) {
      const edgeId = findEdgeId(dialogID, phraseNode.id, value);
      if (edgeId) {
        rfInstance.deleteElements({ edges: [{ id: edgeId }] });
        // Ребро из основного хранилища удалится через колбэк onDelete (DialogCanvas).
      }
    }
  };
  
  const onPhraseNextClear = () => {
    if (!rfInstance) return;
    if (!!dialogID && !!phraseNode) {
      const delEdges = Object.keys(edges || {}).flatMap(
        edgeId => (edges[edgeId].source === phraseNode.id) ? [{ id: edgeId }] : []
      );
      rfInstance.deleteElements({ edges: delEdges });
      // Рёбра из основного хранилища удалятся через колбэк onDelete (DialogCanvas).
    }
  };

  const nextPhrasesValues = Object.keys(edges || {}).flatMap(
    edgeId => (edges[edgeId].source === phraseNode?.id) ? [edges[edgeId].target] : []
  );
  const nextPhrasesOptions = Object.keys(nodes || {})?.flatMap(
    nextNodeId => (nodeID !== nextNodeId) ? [{ label: nodes[nextNodeId].phraseId, value: nextNodeId }] : []
  );

  return (
    <>
      {phraseNode && buffer && (
        <Space orientation="vertical" style={{ width: '100%' }}>
          <div>
            <label>ID</label>
            <Input
              value={buffer.phraseId}
              onChange={(e) => setBuffer({...buffer, phraseId: e.target.value})}
              onBlur={checkDiff}
            />
          </div>
          <div>
            <label>Текст</label>
            <Input.TextArea
              rows={4}
              value={buffer.phraseText}
              onChange={(e) => setBuffer({...buffer, phraseText: e.target.value})}
              onBlur={checkDiff}
            />
          </div>
          <div>
            <label>Следующие фразы</label>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Выбрать..."
              value={nextPhrasesValues}
              onSelect={onPhraseNextSelect}
              onDeselect={onPhraseNextDeselect}
              onClear={onPhraseNextClear}
              options={nextPhrasesOptions}
            />
          </div>
        </Space>
      )}
    </>
  );

}

export default memo(PhraseDrawerContent);
