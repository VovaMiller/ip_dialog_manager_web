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
  const [phraseSample, setPhraseSample] = useState(null);
  const [edgeSample, setEdgeSample] = useState(null);

  // Получить объект шаблонной фразы (один раз берётся с сервера).
  const getPhraseSample = async () => {
    if (phraseSample) {
      return phraseSample;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dialogs/phrase-sample');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Ошибка сервера: ${response.status}`;
        throw new Error(errorMessage);
      }
      const result = await response.json();
      if (!result.data) {
        throw new Error('Ответ сервера получен, но данных о фразе нет');
      }
      setPhraseSample(result.data);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  // Получить объект шаблонного ребра (один раз берётся с сервера).
  const getEdgeSample = async () => {
    if (edgeSample) {
      return edgeSample;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dialogs/edge-sample');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Ошибка сервера: ${response.status}`;
        throw new Error(errorMessage);
      }
      const result = await response.json();
      if (!result.data) {
        throw new Error('Ответ сервера получен, но данных о ребре нет');
      }
      setEdgeSample(result.data);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Произошла ошибка сервера (${response.status}) при загрузке файла`;
        throw new Error(errorMessage);
      }
      const result = await response.json();
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

  const updateDialogPhrasesPositions = (dialogID, newPositionsMap) => {
    if (!!gameDialogs && !!dialogID && !!newPositionsMap) {
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            for (const [phrID, newPosition] of newPositionsMap) {
              const phr = dlg.nodes?.find(n => n.id === phrID);
              if (phr) {
                phr.position = {...newPosition};
              }
            }
          }
        })
      );
    }
  };

  const deletePhrases = (dialogID, nodesIDSet) => {
    if (!!gameDialogs && !!dialogID && !!nodesIDSet) {
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            dlg.edges = dlg.edges?.filter(e => !nodesIDSet.has(e.target) && !nodesIDSet.has(e.source)) || [];
            dlg.nodes = dlg.nodes?.filter(n => !nodesIDSet.has(n.id)) || [];
          }
        })
      );
    }
  };

  const addPhraseConnection = async (dialogID, sourceID, targetID) => {
    if (!!gameDialogs && !!sourceID && !!targetID) {
      const sample = await getEdgeSample();
      if (!sample) {
        message.error('Ошибка при создании связи между фразами!');
        return;
      }
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            if (!dlg.edges.some(e => (e.source === sourceID) && (e.target === targetID))) {
              const newEdge = structuredClone(sample);
              newEdge.id = `e_${sourceID}_${targetID}`;
              newEdge.source = sourceID;
              newEdge.target = targetID;
              dlg.edges.push(newEdge);
            }
          }
        })
      );
    }
  };

  const delPhraseConnection = (dialogID, sourceID, targetID) => {
    if (!!gameDialogs && !!sourceID && !!targetID) {
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            dlg.edges = dlg.edges?.filter(e => (e.source !== sourceID) || (e.target !== targetID));
          }
        })
      );
    }
  };

  const deletePhrasesConnections = (dialogID, edgesIDSet) => {
    if (!!gameDialogs && !!dialogID && !!edgesIDSet) {
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            dlg.edges = dlg.edges?.filter(e => !edgesIDSet.has(e.id)) || [];
          }
        })
      );
    }
  };

  const createPhrase = async (dialogID, position) => {
    if (!!gameDialogs && !!dialogID) {
      const sample = await getPhraseSample();
      if (!sample) {
        message.error('Ошибка при создании фразы!');
        return;
      }
      let newPhraseID;
      setGameDialogs(curGameDialogs =>
        produce(curGameDialogs, draft => {
          const dlg = draft.dialogs?.find(d => d.id === dialogID);
          if (dlg) {
            // Генерация нового ID.
            const nodeIDs = new Set();
            const phraseIDs = new Set();
            dlg.nodes.forEach(n => {
              nodeIDs.add(n.id);
              phraseIDs.add(n.data.phrase_id);
            });
            let i = 0;
            while (true) {
              newPhraseID = `new${i}`;
              if (nodeIDs.has(newPhraseID) || phraseIDs.has(newPhraseID)) {
                i += 1;
              } else {
                break;
              }
            }

            // Вычисление координат.
            if (!position) {
              let sumX = 0, sumY = 0;
              for (const node of dlg.nodes) {
                if (!!node.position?.x && !!node.position?.y) {
                  sumX += node.position.x;
                  sumY += node.position.y;
                }
              }
              position = {
                x: sumX / dlg.nodes.length,
                y: sumY / dlg.nodes.length,
              };
            }

            // Добавление фразы.
            const newPhrase = structuredClone(sample);
            newPhrase.id = newPhraseID;
            newPhrase.data.phrase_id = newPhraseID;
            newPhrase.position = { ...position };
            dlg.nodes.push(newPhrase);
          }
        })
      );
      return newPhraseID;
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
                updateDialogPhrasesPositions={updateDialogPhrasesPositions}
                deletePhrases={deletePhrases}
                addPhraseConnection={addPhraseConnection}
                delPhraseConnection={delPhraseConnection}
                deletePhrasesConnections={deletePhrasesConnections}
                createPhrase={createPhrase}
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
