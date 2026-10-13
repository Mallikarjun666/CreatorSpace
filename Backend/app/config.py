from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    frontend_origin: str = "http://localhost:5173"
    access_token_minutes: int = 720

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()