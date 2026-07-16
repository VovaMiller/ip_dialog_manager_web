import { memo, useEffect, useState } from 'react';
import { Input, Select, Space } from 'antd';
import fastDeepEqual from 'fast-deep-equal';

function PhraseDrawerContent({
  dialogID,
  nodesInfo,
  edges,
  phraseNode,
  updateDialogPhrase,
  addPhraseConnection,
  delPhraseConnection,
  deletePhrasesConnections,
}) {

  const [buffer, setBuffer] = useState(null);

  // Обновление буфера при открытии новой фразы.
  useEffect(() => {
    if (phraseNode) {
      setBuffer(phraseNode);
    }
  }, [phraseNode]);

  const checkDiff = () => {
    if (!!dialogID && !!phraseNode && !!buffer) {
      if (!fastDeepEqual(phraseNode, buffer)) {
        updateDialogPhrase(dialogID, buffer);
      }
    }
  };
  
  const onPhraseNextSelect = async (value) => {
    if (!!dialogID && !!phraseNode) {
      await addPhraseConnection(dialogID, phraseNode.id, value);
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
              options={nodesInfo.flatMap(info => (phraseNode.id !== info.nodeID) ? [{ label: info.phraseID, value: info.nodeID }] : [])}
            />
          </div>
        </Space>
      )}
    </>
  );

}

export default memo(PhraseDrawerContent, (prevProps, nextProps) => {
  return (
    (prevProps.dialogID === nextProps.dialogID)
    && fastDeepEqual(prevProps.nodesInfo, nextProps.nodesInfo)
    && fastDeepEqual(prevProps.edges, nextProps.edges)
    && (prevProps.phraseNode.id === nextProps.phraseNode.id)
    && fastDeepEqual(prevProps.phraseNode.data, nextProps.phraseNode.data)
  );
});
