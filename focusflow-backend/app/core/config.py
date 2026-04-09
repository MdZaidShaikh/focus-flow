from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central app configuration. All values are read from environment
    variables (or a local .env file during development). Never hardcode
    secrets here — see .env.example for the full list of required vars.
    """

    # Database
    database_url: str  # e.g. postgresql://user:pass@host:5432/focusflow

    # Gemini API (separate from any Gemini Advanced/Pro subscription)
    gemini_api_key: str
    gemini_model: str = "gemini-3.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    # Cognito (used to validate JWTs on incoming requests)
    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""
    cognito_region: str = "us-east-1"

    # Pomodoro defaults
    default_pomodoro_minutes: int = 25
    default_break_minutes: int = 5

    class Config:
        env_file = ".env"


settings = Settings()
