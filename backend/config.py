from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    MEDIA_BASE_URL: str
    ENVIRONMENT: str = "development"
    MEDIA_ROOT: str = "/media"

    model_config = {"env_file": ".env"}


settings = Settings()
