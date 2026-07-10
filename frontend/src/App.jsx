import React, { useState } from 'react';
import { Button, Upload, Card, Typography, Select, Space, message, Table, Tag, Divider } from 'antd';
import { DeploymentUnitOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

import '@xyflow/react/dist/style.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;

function App() {
  const [loading, setLoading] = useState(false);
  const [gameDialogs, setGameDialogs] = useState(null);
  
  // Хуки React Flow для управления узлами и связями
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);


  const getLayoutedNodes = (nodes, edges) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB' });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => g.setNode(node.id, { width: 150, height: 50 }));  // TODO: upd numbers
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

  // Кастомная функция отправки файла через fetch
  const handleUpload = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    
    // Создаем объект FormData для упаковки бинарного файла
    const formData = new FormData();
    // Ключ 'file' должен СТРОГО совпадать с именем аргумента в функции FastAPI: file: UploadFile
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/dialogs/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Если FastAPI вернул ошибку клиента (400, 422), извлекаем её текст
        throw new Error(result.detail || 'Произошла ошибка при загрузке');
      }

      // Сохраняем полученную от бэкенда статистику в состояние
      setGameDialogs(result.data);
      onSuccess(result);
      message.success(`Файл ${file.name} успешно обработан сервером.`);
    } catch (error) {
      console.error(error);
      onError(error);
      message.error(error.message || 'Не удалось отправить файл на сервер.');
    } finally {
      setLoading(false);
    }
  };

  // Конфигурация внешнего вида компонента загрузки Ant Design
  const uploaderProps = {
    name: 'file',
    multiple: false, // Принимаем только один конфиг за раз
    customRequest: handleUpload, // Переопределяем стандартную отправку на наш fetch
    showUploadList: false, // Отключаем стандартный список, так как мы выведем красивую таблицу ниже
  };

  // Описываем колонки для таблицы результатов Ant Design
  const columns = [
    { title: 'Параметр анализа', dataIndex: 'property', key: 'property', align: 'left' },
    { title: 'Значение', dataIndex: 'value', key: 'value', align: 'right' },
  ];

  // Превращаем JSON-ответ от FastAPI в массив данных для таблицы
  const tableData = gameDialogs ? [
    { key: '1', property: 'Имя файла конфигурации', value: <Text strong>{gameDialogs.filename}</Text> },
    { key: '2', property: 'Кол-во диалогов', value: <Tag color="blue">{gameDialogs.dialogs.length}</Tag> },
  ] : [];

  const selectDialogList = gameDialogs?.dialogs
    ? gameDialogs.dialogs.map(dlg => ({ value: dlg.id, label: dlg.id }))
    : [];

  const onDialogSelect = async (value) => {
    const dlg = gameDialogs?.dialogs?.find(d => d.id === value);
    if (dlg) {
      showGraph(dlg);
      console.log("Selected dialog:", value);
    } else {
      console.error("Invalid dialog id:", value);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%', mapxWidth: 600 }}>
        
        <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '8px' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
            Визуализатор игровых диалогов
          </Title>
          
          {/* Драг-энд-дроп зона Ant Design */}
          <Dragger {...uploaderProps} disabled={loading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1890ff', fontSize: '48px' }} />
            </p>
            <p className="ant-upload-text">Кликните или перетащите конфиг диалога в эту область</p>
            <p className="ant-upload-hint">
              Поддерживаются файлы расширений .txt, .xml
            </p>
          </Dragger>
        </Card>

        {/* Если данные от сервера получены, красиво отображаем их в таблице */}
        {gameDialogs && (
          <Card 
            title={<Space><FileTextOutlined />Информация о файле</Space>}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '8px' }}
          >
            <Table 
              columns={columns} 
              dataSource={tableData} 
              pagination={false} 
              size="middle" 
              showHeader={false}
            />
          </Card>
        )}

        {gameDialogs && (
          <Select
            style={{ width: 360 }}
            size="large"
            placeholder="Выберите диалог"
            onChange={onDialogSelect}
            options={selectDialogList}
          />
        )}

        
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>

          {/* Контейнер для холста графа */}
          {nodes && nodes.length > 0 && (
            <div style={{ flexGrow: 1, border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange} // Разрешает перетаскивание блоков мышкой
                onEdgesChange={onEdgesChange} // Разрешает изменять связи
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
        

        <Divider />


      </Space>
    </div>
  );
}

export default App;
