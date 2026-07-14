import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import dialogs


print(settings.DATABASE_URL)
# print(settings.DEBUG_MODE)


app = FastAPI()


origins = [
    # frontend (Vite/React)
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # "http://192.168.1.72:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Кому разрешено слать запросы
    allow_credentials=True,      # Разрешить передавать куки/авторизацию
    allow_methods=["*"],         # Разрешить любые методы (GET, POST и т.д.)
    allow_headers=["*"],         # Разрешить любые HTTP-заголовки
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    print(f"Запрос {request.url.path} обработан за {process_time:.4f} сек.")
    return response


# "Ручка" (endpoint) для обработки GET-запроса по адресу "/"
@app.get("/")
def read_root():
    return {"message": "Root: WIP"}


# http://127.0.0.1:8000/api/dialogs
app.include_router(dialogs.router)
