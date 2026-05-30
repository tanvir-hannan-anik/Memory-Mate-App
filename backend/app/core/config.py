from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    gladia_api_key: str

    # Separate Gemini keys — each gets its own 250 req/day free quota
    # Get keys at: aistudio.google.com (each needs a different Google account)
    gemini_key_extraction: str    # used for: transcript → structured info
    gemini_key_chat: str          # used for: RAG chatbot responses
    gemini_key_summary: str       # used for: rolling memory summarization
    gemini_key_naming: str        # used for: auto-generating chat session names

    class Config:
        env_file = ".env"

settings = Settings()
