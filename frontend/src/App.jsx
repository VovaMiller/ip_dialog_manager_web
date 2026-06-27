import React, { useState } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';

const { Title, Text } = Typography;

function App() {
  // Состояние для хранения ответа от сервера
  const [serverResponse, setServerResponse] = useState('');
  // Состояние загрузки (чтобы кнопка красиво крутилась во время запроса)
  const [loading, setLoading] = useState(false);

  // Функция, которая срабатывает при нажатии на кнопку
  const handleButtonClick = async () => {
    setLoading(true);
    try {
      // Делаем стандартный fetch-запрос к нашему FastAPI
      const response = await fetch('http://127.0.0.1:8000/api/test-button');
      
      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();
      // Записываем текст из JSON-ответа сервера в наше состояние
      setServerResponse(data.message);
      message.success('Данные успешно получены!');
    } catch (error) {
      console.error(error);
      message.error('Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card style={{ width: 450, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3}>Проверка связи</Title>
          
          {/* Компонент кнопки из библиотеки Ant Design */}
          <Button type="primary" size="large" loading={loading} onClick={handleButtonClick}>
            Запросить данные у FastAPI
          </Button>

          <Card type="inner" title="Ответ бэкенда" style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text type={serverResponse ? "success" : "secondary"}>
              {serverResponse || "Нажмите кнопку выше, чтобы отправить HTTP-запрос..."}
            </Text>
          </Card>
        </Space>
      </Card>
    </div>
  );
}

export default App;
