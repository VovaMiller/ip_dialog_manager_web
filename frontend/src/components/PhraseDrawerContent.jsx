import { useEffect, useState } from 'react';
import { Input, Space } from 'antd';
import fastDeepEqual from 'fast-deep-equal';

function PhraseDrawerContent({ phraseNode, updatePhrase }) {

  const [buffer, setBuffer] = useState(null);

  // Обновление буфера при открытии новой фразы.
  useEffect(() => {
    if (phraseNode) {
      setBuffer(phraseNode);
    }
  }, [phraseNode]);

  const checkDiff = () => {
    if (!!phraseNode && !!buffer) {
      if (!fastDeepEqual(phraseNode, buffer)) {
        updatePhrase(buffer)
      }
    }
  };

  return (
    <>
      {buffer && (
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
            <label>Text</label>
            <Input.TextArea
              rows={4}
              value={buffer.data.phrase_text}
              onChange={(e) => setBuffer({...buffer, data: {...buffer.data, phrase_text: e.target.value}})}
              onBlur={checkDiff}
            />
          </div>
        </Space>
      )}
    </>
  );

}

export default PhraseDrawerContent;
