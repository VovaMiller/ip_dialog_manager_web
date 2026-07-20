from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.services.dialogs import Dialog, GameDialogs

router = APIRouter(prefix="/api/dialogs", tags=["Диалоги"])

@router.get("/")
def get_all_dialogs():
    return {
        "status": "success",
        "message": "Все диалоги (WIP)"
    }


class FrontendNode(BaseModel):
    id: str
    posX: int
    posY: int
    phraseId: str
    phraseText: str
    phraseHasInfo: list[str]
    phraseDontHasInfo: list[str]
    phrasePrecondition: list[str]
    phraseGiveInfo: list[str]
    phraseAction: list[str]

class FrontendEdge(BaseModel):
    id: str
    source: str
    target: str
    
class DialogModel(BaseModel):
    id: str
    nodes: dict[str, FrontendNode]
    edges: dict[str, FrontendEdge]

class UploadResponseData(BaseModel):
    filename: str
    dialogs: dict[str, DialogModel]

class UploadResponse(BaseModel):
    status: str
    data: UploadResponseData
    
@router.post(
    "/upload",
    summary="Загрузка конфига диалога",
    response_model=UploadResponse,
)
async def upload_dialog_xml(file: UploadFile = File(...)):
    """Принимает файл-конфиг диалога.

    ### Что делает этот эндпоинт:
    1. Проверяет расширение файла (разрешены только `.txt`, `.xml`).
    2. Считывает бинарный поток и декодирует его в `utf-8`.
    3. Выполняет базовый подсчет строк.

    ### Возможные ошибки:
    * **400 Bad Request** — если файл не передан или передан в неверном формате.
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

    # Чтение файла
    content = await file.read()
    raw_xml = content.decode("utf-8")

    # Парсинг
    game_dialogs = GameDialogs(raw_xml)
    response_dialogs = {
        dlg._id: {
            "id": dlg._id,
            "nodes": dlg.get_frontend_nodes(),
            "edges": dlg.get_frontend_edges(),
        }
        for dlg in game_dialogs.dialogs.values()
    }

    return {
        "status": "success",
        "data": {
            "filename": file.filename,
            "dialogs": response_dialogs,
        }
    }


class PhraseSampleResponse(BaseModel):
    status: str
    data: FrontendNode

@router.get(
    "/phrase-sample",
    summary="Получить пустой шаблон фразы диалога",
    response_model=PhraseSampleResponse,
)
def get_phrase_sample():
    return {
        "status": "success",
        "data": Dialog.build_frontend_node(),
    }
