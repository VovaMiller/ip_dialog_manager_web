from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.services.dialogs import GameDialogs

router = APIRouter(prefix="/api/dialogs", tags=["Диалоги"])

@router.get("/")
def get_all_dialogs():
    return {
        "status": "success",
        "message": "Все диалоги (WIP)"
    }


class PhraseData(BaseModel):
    phrase_id: str
    phrase_text: str
    phrase_next: list[str]
    phrase_has_info: list[str]
    phrase_dont_has_info: list[str]
    phrase_precondition: list[str]
    phrase_give_info: list[str]
    phrase_action: list[str]

class ReactFlowNode(BaseModel):
    id: str
    position: dict[str, int]
    data: PhraseData
    type: str

class ReactFlowEdge(BaseModel):
    id: str
    type: str
    source: str
    target: str
    animated: bool
    markerEnd: dict[str, str | int]
    
class DialogModel(BaseModel):
    id: str
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]

class UploadResponseData(BaseModel):
    filename: str
    dialogs: list[DialogModel]

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
    response_dialogs = []
    for dlg in game_dialogs.dialogs.values():
        response_dialogs.append({
            "id": dlg._id,
            "nodes": dlg.get_react_flow_nodes(),
            "edges": dlg.get_react_flow_edges(),
        })

    return {
        "status": "success",
        "data": {
            "filename": file.filename,
            "dialogs": response_dialogs,
        }
    }
