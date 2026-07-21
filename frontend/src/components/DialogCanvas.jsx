import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button, Space, Drawer, Popconfirm } from 'antd';
import { AimOutlined, DeleteOutlined, DotChartOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, ControlButton, Background, useReactFlow } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

import { getReactFlowEdge } from '@/utils/rfUtils';
import useGameDialogsStore from '@/store/useGameDialogsStore';
import PhraseNode from '@/components/PhraseNode';
import PhraseDrawerContent from '@/components/PhraseDrawerContent';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  phraseNode: PhraseNode,
};

function DialogCanvas({ dialogId }) {
  const rfInstance = useReactFlow();

  const { selectedNodeID, setSelectedNodeID } = useGameDialogsStore(
    useShallow((state) => ({
      selectedNodeID: state.selectedNodeID,
      setSelectedNodeID: state.setSelectedNodeID,
    }))
  );
  const {
    getNode,
    findEdgeId,
    getReactFlowNodes,
    getReactFlowEdges,
    updatePhrasesPositions,
    deletePhrases,
    addPhraseConnection,
    delPhraseConnection,
    deletePhrasesConnections,
    createPhrase,
  } = useGameDialogsStore.getState();

  // Функция для автоматического просчёта позиций вершин для данного графа диалога.
  // На входе и выходе вершины/рёбра в формате React Flow.
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
    if (dialogId) {
      const newPositionsMap = new Map();
      dNodes.forEach(node => newPositionsMap.set(node.id, node.position));
      updatePhrasesPositions(dialogId, newPositionsMap);
    }
  };

  // Обновление холста при смене выбранного диалога.
  useEffect(() => {
    if (!rfInstance) return;
    if (dialogId) {
      // При смене диалога сбрасываем выбранную фразу.
      setSelectedNodeID(null);

      // Обновление графа.
      const nodes = getReactFlowNodes(dialogId);
      const edges = getReactFlowEdges(dialogId);
      const hasNoPositionData = nodes.every(n => (n.position.x == 0) && (n.position.y == 0));
      if (hasNoPositionData) {
        const nodesLayouted = getLayoutedNodes(nodes, edges);
        rfInstance.setNodes(nodesLayouted);
        rfInstance.setEdges(edges);
        savePositions(nodesLayouted);
      } else {
        rfInstance.setNodes(nodes);
        rfInstance.setEdges(edges);
      }

      // Центрирование.
      rfInstance.fitView();
    } else {
      rfInstance.setNodes([]);
      rfInstance.setEdges([]);
      setSelectedNodeID(null);
    }
  }, [dialogId]);

  const onNodeClick = (event, node) => {
    setSelectedNodeID(node?.id);
  };

  const onNodeDragStart = (event, draggedNode, draggedNodes) => {
    if (selectedNodeID) {
      if (draggedNodes.length === 1) {
        setSelectedNodeID(draggedNodes[0].id);
      } else {
        setSelectedNodeID(null);
      }
    }
  };

  const onNodeDragStop = (event, draggedNode, draggedNodes) => {
    savePositions(draggedNodes);
  };

  // Колбэк удаления вершин/рёбер
  // Срабатывает при удалении через интерфейс ReactFlow,
  //  а также при кастомных действиях из Drawer (из-за вызова deleteElements).
  const onDelete = ({ nodes: delNodes, edges: delEdges }) => {
    if (dialogId) {
      // Удаление связей
      const edgesIDSet = new Set();
      delEdges.forEach(e => edgesIDSet.add(e.id));
      deletePhrasesConnections(dialogId, edgesIDSet);

      // Удаление фраз
      const nodesIDSet = new Set();
      delNodes.forEach(n => nodesIDSet.add(n.id));
      deletePhrases(dialogId, nodesIDSet);
      if (!!selectedNodeID && nodesIDSet.has(selectedNodeID)) {
        setSelectedNodeID(null);
      }
    }
  };

  // Колбэк создания связи между вершинами через интерфейс ReactFlow.
  const onConnect = ({ source, target }) => {
    if (!rfInstance) return;
    if (dialogId) {
      const edgeExists = !!findEdgeId(dialogId, source, target);
      if (!edgeExists) {
        // Если ребра ещё не было, то React Flow уже автоматически добавил в rfInstance новое ребро.
        const autoEdgeId = rfInstance.getEdges().find(e => (e.source === source) && (e.target === target))?.id;
        if (autoEdgeId) {
          if (source !== target) {
            rfInstance.updateEdge(autoEdgeId, getReactFlowEdge(source, target));
            addPhraseConnection(dialogId, source, target);
          } else {
            // Петли запрещены.
            rfInstance.deleteElements({ edges: [{ id: autoEdgeId }] });
          }
        } else {
          console.error("onConnect: новое ребро не было найдено в rfInstance");
        }
      }
    }
  };

  // Колбэк обновления связи между вершинами через интерфейс ReactFlow.
  const onReconnect = (oldEdge, newConnection) => {
    if (!rfInstance) return;
    if (dialogId) {
      const { source: oldSource, target: oldTarget } = oldEdge;
      const { source: newSource, target: newTarget } = newConnection;
      if ((oldSource !== newSource) || (oldTarget !== newTarget)) {
        const newConnectionExists = !!findEdgeId(dialogId, newSource, newTarget);
        if (!newConnectionExists && (newSource !== newTarget)) {
          rfInstance.updateEdge(oldEdge.id, getReactFlowEdge(newSource, newTarget));
          delPhraseConnection(dialogId, oldSource, oldTarget);
          addPhraseConnection(dialogId, newSource, newTarget);
        } else {
          rfInstance.deleteElements({ edges: [{ id: oldEdge.id }] });
          // Ребро из основного хранилища удалится через колбэк onDelete.
        }
      }
    }
  };

  const onDrawerClose = () => {
    setSelectedNodeID(null);
  };

  const onDeleteButtonClick = () => {
    if (!rfInstance) return;
    if (!!dialogId && !!selectedNodeID) {
      rfInstance.deleteElements({ nodes: [{ id: selectedNodeID }] });
      // Вершина из основного хранилища удалится через колбэк onDelete.
      setSelectedNodeID(null);
    }
  };

  const onAddButtonClick = () => {
    if (!rfInstance) return;
    if (dialogId) {
      // Вычисление позиции.
      let position;
      if (selectedNodeID) {
        // Если есть выбранная фраза, то размещаем новую фразу чуть ниже.
        const selectedNode = getNode(dialogId, selectedNodeID);
        position = {
          x: selectedNode?.posX || 0,
          y: (selectedNode?.posY || 0) + 48,
        }
      } else {
        // Если нет выбранной фразы, то размещаем верхний левый угол карточки по центру холста.
        const flowContainer = document.querySelector('.react-flow');
        if (flowContainer) {
          const rect = flowContainer.getBoundingClientRect();
          position = rfInstance.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
      }

      // Создание фразы.
      const newPhraseID = createPhrase(dialogId, position);
      if (newPhraseID) {
        rfInstance.addNodes({
            id: newPhraseID,
            position: {
                x: position?.x || 0,
                y: position?.y || 0,
            },
            type: 'phraseNode',
        });
      }

      // Переключение на новую фразу.
      setSelectedNodeID(newPhraseID);
    }
  };

  const onUpdPositionsClick = () => {
    if (!rfInstance || !dialogId) return;
    const nodesLayouted = getLayoutedNodes(rfInstance.getNodes(), rfInstance.getEdges());
    rfInstance.setNodes(nodesLayouted);
    savePositions(nodesLayouted);
    rfInstance.fitView();
  };

  const reloadGraph = () => {
    if (!rfInstance || !dialogId) return;
    setSelectedNodeID(null);
    rfInstance.setNodes(getReactFlowNodes(dialogId));
    rfInstance.setEdges(getReactFlowEdges(dialogId));
  };

  const focusSelectedNode = () => {
    if (!rfInstance || !selectedNodeID) return;
    rfInstance.fitView({
      nodes: [{ id: selectedNodeID }],
      duration: 600,
    });
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
        {dialogId && (
          <>
            <div style={{ flexGrow: 1, border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <ReactFlow
                defaultNodes={[]}
                defaultEdges={[]}
                onNodeClick={onNodeClick}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onDelete={onDelete}
                onConnect={onConnect}
                onReconnect={onReconnect}
                edgesReconnectable={true}
                zoomOnScroll={false}
                preventScrolling={false}
                nodeTypes={nodeTypes}
                connectionLineType="straight"
                deleteKeyCode={['Delete', 'Backspace']}
                fitView // Автоматически центрирует камеру по графу при загрузке
              >
                {/* Сетка на заднем фоне холста */}
                <Background color="#ccc" gap={16} size={1} />

                {/* Кнопки управления холстом в нижнем левом углу */}
                <Controls>
                  <ControlButton
                    onClick={reloadGraph}
                    title="Перезагрузить граф"
                  >
                    <ReloadOutlined style={{ fontSize: '14px', color: '#555' }} />
                  </ControlButton>
                  <ControlButton
                    onClick={focusSelectedNode}
                    title="Фокус на выбранной фразе"
                  >
                    <AimOutlined style={{ fontSize: '14px', color: '#555' }} />
                  </ControlButton>
                </Controls>
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
        {!!rfInstance && !!selectedNodeID && (
          <PhraseDrawerContent
            rfInstance={rfInstance}
            dialogID={dialogId}
            nodeID={selectedNodeID}
          />
        )}
      </Drawer>

    </>
  );
}

export default DialogCanvas;
