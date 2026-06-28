from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter(prefix="/api/dialogs", tags=["Диалоги"])

@router.get("/")
def get_all_dialogs():
    return {
        "status": "success",
        "message": "Все диалоги (WIP)"
    }

@router.post("/upload", summary="Загрузка конфига диалога")
async def upload_dialog_xml(file: UploadFile = File(...)):
    """Принимает файл-конфиг диалога.

    ### Что делает этот эндпоинт:
    1. Проверяет расширение файла (разрешены только `.txt`, `.xml`).
    2. Считывает бинарный поток и декодирует его в `utf-8`.
    3. Выполняет базовый подсчет строк.

    ### Возможные ошибки:
    * **400 Bad Request** — если передан файл неверного формата.
    * **422 Unprocessable Entity** — если файл вообще забыли прикрепить к запросу.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail={
                "status": "fail", 
                "data": {"file": "Filename not provided"}
            }
        )
    if not file.filename.endswith((".txt", ".xml")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail={
                "status": "fail", 
                "data": {"file": "Wrong file format"}
            }
        )
    content = await file.read()
    text = content.decode("utf-8")
    lines_count = len(text.splitlines())
    return {
        "status": "success",
        "data": {
            "filename": file.filename,
            "lines_count": lines_count,
        }
    }

@router.get("/test-graph")
def get_test_graph():
    nodes = [
        {
            "id": "10", 
            "position": {"x": 250, "y": 0}, 
            "data": {"label": "Привет, Сталкер!"}
        },
        {
            "id": "20", 
            "position": {"x": 100, "y": 150}, 
            "data": {"label": "Есть для меня работа?"}
        },
        {
            "id": "30", 
            "position": {"x": 400, "y": 150}, 
            "data": {"label": "До встречи!"}
        },
        {
            "id": "21", 
            "position": {"x": 100, "y": 300}, 
            "data": {"label": "Работы пока нет :("}
        }
    ]
    
    edges = [
        {"id": "e_10_20", "source": "10", "target": "20", "animated": True},
        {"id": "e_10_30", "source": "10", "target": "30", "animated": True},
        {"id": "e_20_21", "source": "20", "target": "21"}
    ]

    # {
    #     "id": "e_1_2",             # Уникальное имя связи (любая ваша строка)
    #     "source": "1",             # ID ноды, ОТКУДА выходит стрелка (строка!)
    #     "target": "2",             # ID ноды, КУДА входит стрелка (строка!)
    #     "animated": True,          # Опционально: включает бегущие точки по линии
    #     "label": "Sample text",    # Опционально: текст прямо поверх стрелочки (удобно для проверок в диалогах)
    #     "type": "smoothstep"       # Опционально: стиль линии (default, straight, step, smoothstep)
    # }

    
    return {
        "status": "success",
        "data": {
            "nodes": nodes,
            "edges": edges
        }
    }
