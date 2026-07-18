import { memo, useEffect, useState } from 'react';
import { Input, Select, Space } from 'antd';
import fastDeepEqual from 'fast-deep-equal';

import useGameDialogsStore from '@/store/useGameDialogsStore';

function PhraseDrawerContent({ dialogID, nodeID }) {
  const [buffer, setBuffer] = useState(null);

  const phraseNode = useGameDialogsStore(state => state.getNode(dialogID, nodeID));
  const nodes = useGameDialogsStore(state => state.getNodes(dialogID));
  const edges = useGameDialogsStore(state => state.getEdges(dialogID));

  const {
    updatePhrase,
    addPhraseConnection,
    delPhraseConnection,
    deletePhrasesConnections,
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
    if (!!dialogID && !!phraseNode) {
      addPhraseConnection(dialogID, phraseNode.id, value);
    }
  };
  
  const onPhraseNextDeselect = (value) => {
    if (!!dialogID && !!phraseNode) {
      delPhraseConnection(dialogID, phraseNode.id, value);
    }
  };
  
  const onPhraseNextClear = () => {
    if (!!dialogID && !!phraseNode) {
      const edgesSet = new Set(edges.filter(e => e.source === phraseNode.id).map(e => e.id));
      deletePhrasesConnections(dialogID, edgesSet);
    }
  };

  return (
    <>
      {phraseNode && buffer && (
        <Space orientation="vertical" style={{ width: '100%' }}>
          <div>
            <label>ID</label>
            <Input
              value={buffer.data.phrase_id}
              onChange={(e) => setBuffer({...buffer, data: {...buffer.data, phrase_id: e.target.value}})}
              onBlur={checkDiff}
            />
          </div>
          <div>
            <label>Текст</label>
            <Input.TextArea
              rows={4}
              value={buffer.data.phrase_text}
              onChange={(e) => setBuffer({...buffer, data: {...buffer.data, phrase_text: e.target.value}})}
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
              value={edges.flatMap(e => (e.source === phraseNode.id) ? [e.target] : [])}
              onSelect={onPhraseNextSelect}
              onDeselect={onPhraseNextDeselect}
              onClear={onPhraseNextClear}
              options={nodes?.flatMap(node => (nodeID !== node.id) ? [{ label: node.data.phrase_id, value: node.id }] : [])}
            />
          </div>
        </Space>
      )}
    </>
  );

}

export default memo(PhraseDrawerContent);
