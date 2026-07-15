import { useEffect, useState } from 'react';
import { Button, Space, Drawer, Popconfirm } from 'antd';
import { DeleteOutlined, DotChartOutlined, PlusOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
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
  createPhrase,
}) {
  const [dialogID, setDialogID] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeID, setSelectedNodeID] = useState(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

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

      // Обновление графа.
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

      // Центрирование.
      if (isNewDialog) {
        fitView();
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

  const onAddButtonClick = async () => {
    if (dialogID) {
      // Вычисление позиции.
      let position;
      if (selectedNodeID) {
        // Если есть выбранная фраза, то размещаем новую фразу чуть ниже.
        const selectedNode = nodes.find(n => n.id === selectedNodeID);
        position = {
          x: selectedNode?.position?.x || 0,
          y: (selectedNode?.position?.y || 0) + 48,
        }
      } else {
        // Если нет выбранной фразы, то размещаем верхний левый угол карточки по центру холста.
        const flowContainer = document.querySelector('.react-flow');
        if (flowContainer) {
          const rect = flowContainer.getBoundingClientRect();
          position = screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
      }

      // Создание фразы.
      const newPhraseID = await createPhrase(dialogID, position);

      // Переключение на новую фразу.
      setSelectedNodeID(newPhraseID);
    }
  };

  const onUpdPositionsClick = () => {
    const nodesLayouted = getLayoutedNodes(nodes, edges);
    setNodes(nodesLayouted);
    savePositions(nodesLayouted);
    fitView();
  };

  const updatePhrase = (newPhraseNode) => {
    if (!!dialog && !!newPhraseNode) {
      updateDialogPhrase(dialog.id, newPhraseNode);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
        {dialogID && (
          <>
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

            <Space size="middle" style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
              <Button
                color="default"
                variant="outlined"
                onClick={onAddButtonClick}
              >
                <PlusOutlined /> Добавить фразу
              </Button>

              <Popconfirm
                title="Обновить размещение фраз"
                description="Вы уверены, что хотите пересчитать расположение вершин всех фраз?"
                onConfirm={onUpdPositionsClick}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  color="default"
                  variant="outlined"
                >
                  <DotChartOutlined /> Обновить размещение
                </Button>
              </Popconfirm>
            </Space>
          </>
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
          <Space size="middle" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              color="danger"
              variant="outlined"
              onClick={onDeleteButtonClick}
            >
              <DeleteOutlined /> Удалить
            </Button>
          </Space>
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
