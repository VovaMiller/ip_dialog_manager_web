from fastapi import APIRouter

router = APIRouter(prefix="/dialogs", tags=["Диалоги"])

@router.get("/")
def get_all_dialogs():
    return {"message": "Все диалоги"}
