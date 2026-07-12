import React, { useState } from 'react';
import { Upload, Card, Typography, Space, message, Table, Tag, Divider, Select } from 'antd';
import { InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from '@xyflow/react';
import { produce } from 'immer';

import DialogCanvas from '@/components/DialogCanvas';

const { Dragger } = Upload;
const { Title, Text } = Typography;

function App() {
  const [loading, setLoading] = useState(false);
  const [gameDialogs, setGameDialogs] = useState(null);
  const [selectedDialogID, setSelectedDialogID] = useState(null);

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

  const onDialogSelect = (value) => {
    setSelectedDialogID(value);
  };

  const updateDialogPhrase = (dialogID, phrase) => {
    if (!!gameDialogs && !!dialogID && !!phrase) {
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            const idx = dlg.nodes?.findIndex(n => n.id === phrase.id);
            if (idx >= 0) {
              dlg.nodes[idx] = phrase;
            }
          }
        })
      );
    }
  };

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
          <>
            <Select
              style={{ width: 360 }}
              size="large"
              placeholder="Выберите диалог"
              onChange={onDialogSelect}
              options={selectDialogList}
            />
            <ReactFlowProvider>
              <DialogCanvas
                dialog={gameDialogs.dialogs?.find(dlg => dlg.id === selectedDialogID)}
                updateDialogPhrase={updateDialogPhrase}
              />
            </ReactFlowProvider>
          </>
        )}

        <Divider />



      </Space>
    </div>
  );
}

export default App;
