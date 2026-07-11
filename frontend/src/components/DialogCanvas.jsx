import { Select } from 'antd';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

import PhraseNode from '@/components/PhraseNode';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  phraseNode: PhraseNode,
};

function DialogCanvas({ gameDialogs }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const getLayoutedNodes = (nodes, edges) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB' });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => g.setNode(node.id, { width: 80, height: 40 }));
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));

    dagre.layout(g);

    return nodes.map(node => {
      const gNode = g.node(node.id);
      return {
        ...node,
        position: { x: gNode.x, y: gNode.y }
      };
    });
  };

  const showGraph = ({nodes, edges}) => {
      // TODO: если координаты уже зашиты, то просчитывать их не нужно
      setNodes(getLayoutedNodes(nodes, edges));
      setEdges(edges);
  };

  const selectDialogList = gameDialogs?.dialogs
    ? gameDialogs.dialogs.map(dlg => ({ value: dlg.id, label: dlg.id }))
    : [];

  const onDialogSelect = (value) => {
    const dlg = gameDialogs?.dialogs?.find(d => d.id === value);
    if (dlg) {
      showGraph(dlg);
      console.log("Selected dialog:", value);
    } else {
      console.error("Invalid dialog id:", value);
    }
  }

  return (
    <>
      <Select
        style={{ width: 360 }}
        size="large"
        placeholder="Выберите диалог"
        onChange={onDialogSelect}
        options={selectDialogList}
      />

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
        {/* Контейнер для холста графа */}
        {nodes && nodes.length > 0 && (
          <div style={{ flexGrow: 1, border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange} // Разрешает перетаскивание блоков мышкой
              onEdgesChange={onEdgesChange} // Разрешает изменять связи
              zoomOnScroll={false}
              preventScrolling={false}
              nodeTypes={nodeTypes}
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

    </>
  );
}

export default DialogCanvas;
