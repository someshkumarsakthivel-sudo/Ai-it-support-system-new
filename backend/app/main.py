from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.users import router as users_router
from app.api.teams import router as teams_router
from app.api.categories import router as categories_router
from app.api.tickets import router as tickets_router
from app.api.ticket_comments import router as ticket_comments_router
from app.api.attachments import router as attachments_router
from app.api.auth import router as auth_router
from app.api.knowledge_base import router as knowledge_base_router
from app.api.ai_analysis import router as ai_analysis_router


app = FastAPI(
    title="AI IT Support System",
    version="1.0.0",
    description="AI-Powered IT Support & Ticket Management System"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(users_router)
app.include_router(teams_router)
app.include_router(categories_router)
app.include_router(tickets_router)
app.include_router(ticket_comments_router)
app.include_router(attachments_router)
app.include_router(auth_router)
app.include_router(knowledge_base_router)
app.include_router(ai_analysis_router)


@app.get("/")
def root():
    return {
        "message": "AI IT Support System API is running"
    }