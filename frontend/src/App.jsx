import React, { useState } from 'react';
import { Button, Upload, Card, Typography, Space, message, Table, Tag, Divider } from 'antd';
import { DeploymentUnitOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;

function App() {
  // Храним данные об успешном анализе файла
  const [fileStats, setFileStats] = useState(null);
  // Элемент управления состоянием загрузки (анимация)
  const [loading, setLoading] = useState(false);
  
  // Хуки React Flow для управления узлами и связями
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading_graph, setLoadingGraph] = useState(false);

  // Функция запроса графа у FastAPI
  const fetchGraph = async () => {
    setLoadingGraph(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dialogs/test-graph');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить структуру графа');
      }

      const result = await response.json();
      
      // Записываем массивы в специальные состояния React Flow
      setNodes(result.data.nodes);
      setEdges(result.data.edges);
      
      message.success('Структура диалога успешно визуализирована!');
    } catch (error) {
      console.error(error);
      message.error(error.message);
    } finally {
      setLoadingGraph(false);
    }
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
        method: 'POST', // Файлы всегда отправляются через POST
        body: formData,  // Передаем FormData в тело запроса
      });

      const result = await response.json();

      if (!response.ok) {
        // Если FastAPI вернул ошибку клиента (400, 422), извлекаем её текст
        throw new Error(result.detail || 'Произошла ошибка при загрузке');
      }

      // Сохраняем полученную от бэкенда статистику в состояние
      setFileStats(result);
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
  const tableData = fileStats ? [
    { key: '1', property: 'Имя файла конфигурации', value: <Text strong>{fileStats?.data?.filename}</Text> },
    { key: '2', property: 'Статус чтения', value: <Tag color="green">{fileStats.status.toUpperCase()}</Tag> },
    { key: '3', property: 'Посчитано строк кода', value: <Tag color="blue">{fileStats?.data?.lines_count}</Tag> },
  ] : [];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', mapxWidth: 600 }}>
        
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
        {fileStats && (
          <Card 
            title={<Space><FileTextOutlined />Результат первичного анализа бэкенда</Space>}
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

        <Divider />
        
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
          
          {/* Верхняя панель управления с кнопкой Ant Design */}
          <Card style={{ marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={3} style={{ margin: 0 }}>
                Редактор игровых диалогов
              </Title>
              <Button 
                type="primary" 
                icon={<DeploymentUnitOutlined />} 
                size="large" 
                loading={loading_graph}
                onClick={fetchGraph}
              >
                Визуализировать тестовый граф
              </Button>
            </div>
          </Card>

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

      </Space>
    </div>
  );
}

export default App;
