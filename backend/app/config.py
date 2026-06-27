from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    # DEBUG_MODE: bool

    model_config = SettingsConfigDict(
        env_file=".env",              # Читать из файла .env
        env_file_encoding="utf-8",    # В кодировке utf-8
        extra="ignore"                # Игнорировать лишние переменные в .env
    )

settings = Settings()  # type: ignore
