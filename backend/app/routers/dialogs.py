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
