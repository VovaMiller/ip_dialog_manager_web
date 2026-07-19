import { memo } from 'react';
import { Card, Tooltip, Typography } from 'antd';
import { Handle, Position } from '@xyflow/react';

import useGameDialogsStore from '@/store/useGameDialogsStore';

const { Text } = Typography;

function PhraseNode({ id, data, dragging, selected }) {

  const {
    phrase_id,
    phrase_text,
    phrase_has_info,
    phrase_dont_has_info,
    phrase_precondition,
    phrase_give_info,
    phrase_action,
  } = data;
  // console.log("PhraseNode", id);  // TODO: optimize

  const isDuplicateID = useGameDialogsStore((state) =>
    state.getDuplicatePhraseIDs(state.selectedDialogID).includes(phrase_id)
  );
  const isAfterSelected = useGameDialogsStore((state) =>
    state.getAfterNodeIDsCache(state.selectedDialogID, state.selectedNodeID).includes(id)
  );
  const isSelectedCustom = useGameDialogsStore((state) => (id === state.selectedNodeID));
  const isSelectedReactFlow = !!selected;
  const hasText = (phrase_text && (phrase_text.trim().length > 0));

  // Если true, то текст фразы отображается не на карточке, а в подсказке.
  const compactCard = true;

  const getBackgroundColor = () => {
    if (isSelectedCustom) return '#cccccc';
    if (isAfterSelected) return '#f0f0f0';
    return '#ffffff';
  };

  const getIDColor = () => {
    if (isDuplicateID) return '#ee0000';
    return '#000000';
  };

  const getBorder = () => {
    if (isSelectedReactFlow) {
      return hasText ? '1px solid #1164b1' : '1px dashed #1164b1';
    } else {
      return hasText ? '1px solid #8c8c8c' : '1px dashed #8c8c8c';
    }
  };

  return (
    <div
      style={{
        width: compactCard ? 'max-content' : 120,
        minWidth: '40px',
        maxWidth: '160px',
      }}
    >
      {/* Порт входа (для стрелочек от предыдущих фраз) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#1164b1', width: '5px', height: '5px', zIndex: 10 }}
      />

      <style>{`
        .empty-node .ant-card-head::after,
        .empty-node .ant-card-head::before,
        .empty-node .ant-card-head-wrapper::after,
        .empty-node .ant-card-head {
          content: none !important;
          border-bottom: 0 !important;
          border-bottom-width: 0 !important;
        }
      `}</style>

      <Tooltip
        title={<div style={{ whiteSpace: 'pre-line' }}>{phrase_text}</div>}
        placement="left"
        open={(hasText && compactCard && !dragging) ? undefined : false}
        mouseEnterDelay={0.3}
        mouseLeaveDelay={0}
      >
        <Card
          size="small"
          title={phrase_id}
          className={(hasText && !compactCard) ? '' : 'empty-node'}
          style={{
            width: '100%',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: getBorder(),
            borderRadius: '16px',
            backgroundColor: getBackgroundColor(),
          }}
          styles={{
            header: { color: getIDColor() },
            body: { padding: '8px 10px' },
          }}
        >
          {(hasText && !compactCard) ? (
            <Text
              ellipsis={{ tooltip: phrase_text }}
              style={{ fontSize: 12 }}
            >
              {phrase_text}
            </Text>
          ) : null}
        </Card>
      </Tooltip>

      {/* Порт выхода (для стрелочек к следующим фразам) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1164b1', width: '5px', height: '5px', zIndex: 10 }}
      />

    </div>
  );

}

export default memo(PhraseNode);
