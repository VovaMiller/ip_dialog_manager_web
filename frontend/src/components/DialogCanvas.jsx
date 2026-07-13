import { useEffect, useState } from 'react';
import { Button, Space, Drawer } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

import PhraseNode from '@/components/PhraseNode';
import PhraseDrawerContent from '@/components/PhraseDrawerContent';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  phraseNode: PhraseNode,
};

function DialogCanvas({
  dialog,
  updateDialogPhrase,
  updateDialogPhrasesPositions,
  deletePhrases,
  deletePhrasesConnections,
}) {
  const [dialogID, setDialogID] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeID, setSelectedNodeID] = useState(null);

  // Функция для автоматического просчёта позиций вершин для данного графа диалога.
  const getLayoutedNodes = (dNodes, dEdges) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB' });
    g.setDefaultEdgeLabel(() => ({}));

    dNodes.forEach((node) => g.setNode(node.id, { width: 80, height: 40 }));
    dEdges.forEach((edge) => g.setEdge(edge.source, edge.target));

    dagre.layout(g);

    return dNodes.map(node => {
      const gNode = g.node(node.id);
      return {
        ...node,
        position: { x: gNode.x, y: gNode.y }
      };
    });
  };

  // Сохранить позиции всех перечисленных вершин.
  const savePositions = (dNodes) => {
    if (dialog) {
      const newPositionsMap = new Map();
      dNodes.forEach(phr => newPositionsMap.set(phr.id, phr.position));
      updateDialogPhrasesPositions(dialog.id, newPositionsMap);
    }
  };

  // Обновление холста при смене данных о диалоге (в т.ч. при выборе нового).
  useEffect(() => {
    if (dialog) {
      const isNewDialog = (dialog.id !== dialogID);

      // При смене диалога сбрасываем выбранную фразу.
      if (isNewDialog) {
        setDialogID(dialog.id);
        setSelectedNodeID(null);
      }

      const {nodes: dNodes, edges: dEdges} = dialog;
      if (isNewDialog) {
        const noPositionData = dNodes.every(n => (n.position.x == 0) && (n.position.y == 0));
        if (noPositionData) {
          const dNodesLayouted = getLayoutedNodes(dNodes, dEdges);
          setNodes(dNodesLayouted);
          setEdges(dEdges);
          savePositions(dNodesLayouted);
        } else {
          setNodes(dNodes);
          setEdges(dEdges);
        }
      } else {
        setNodes(dNodes);
        setEdges(dEdges);
      }
    } else {
      setDialogID(null);
      setNodes([]);
      setEdges([]);
      setSelectedNodeID(null);
    }
  }, [dialog]);

  const onNodeClick = (event, node) => {
    setSelectedNodeID(node?.id);
  };

  const onNodeDragStop = (event, draggedNode, draggedNodes) => {
    savePositions(draggedNodes);
  };

  // Колбэк удаления вершин/рёбер через интерфейс ReactFlow.
  const onDelete = ({ nodes: delNodes, edges: delEdges }) => {
    if (dialog) {
      // Удаление связей
      const edgesIDSet = new Set();
      delEdges.forEach(e => edgesIDSet.add(e.id));
      deletePhrasesConnections(dialog.id, edgesIDSet);

      // Удаление фраз
      const nodesIDSet = new Set();
      delNodes.forEach(n => nodesIDSet.add(n.id));
      deletePhrases(dialog.id, nodesIDSet);
      if (!!selectedNodeID && nodesIDSet.has(selectedNodeID)) {
        setSelectedNodeID(null);
      }
    }
  };

  const onDrawerClose = () => {
    setSelectedNodeID(null);
  };

  const onDeleteButtonClick = () => {
    if (!!dialogID && !!selectedNodeID) {
      const nodesIDSet = new Set([selectedNodeID]);
      deletePhrases(dialogID, nodesIDSet);
      setSelectedNodeID(null);
    }
  };

  const updatePhrase = (newPhraseNode) => {
    if (!!dialog && !!newPhraseNode) {
      updateDialogPhrase(dialog.id, newPhraseNode);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
        {dialogID && (
          <div style={{ flexGrow: 1, border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange} // Разрешает перетаскивание блоков мышкой
              onEdgesChange={onEdgesChange} // Разрешает изменять связи
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onDelete={onDelete}
              zoomOnScroll={false}
              preventScrolling={false}
              nodeTypes={nodeTypes}
              deleteKeyCode={['Delete', 'Backspace']}
              fitView // Автоматически центрирует камеру по графу при загрузке
            >
              {/* Сетка на заднем фоне холста */}
              <Background color="#ccc" gap={16} size={1} />
              {/* Кнопки зума (+ / -) в левом углу */}
              <Controls />
            </ReactFlow>
          </div>
        )}
      </div>

      <Drawer
        title="Редактирование фразы"
        placement="right"
        mask={false}
        closable={{ 'aria-label': 'Close Button' }}
        onClose={onDrawerClose}
        open={!!selectedNodeID}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space size="middle">
              <Button
                color="danger"
                variant="outlined"
                onClick={onDeleteButtonClick}
              >
                <DeleteOutlined /> Удалить
              </Button>
            </Space>
          </div>
        }
      >
        {!!selectedNodeID && (
          <PhraseDrawerContent
            phraseNode={nodes.find(phr => phr.id === selectedNodeID)}
            updatePhrase={updatePhrase}
          />
        )}
      </Drawer>

    </>
  );
}

export default DialogCanvas;
