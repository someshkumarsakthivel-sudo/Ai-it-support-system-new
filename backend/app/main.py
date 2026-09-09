from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.users import router as users_router
from app.api.teams import router as teams_router
from app.api.categories import router as categories_router
from app.api.tickets import router as tickets_router
from app.api.ticket_comments import router as ticket_comments_router
from app.api.attachments import router as attachments_router
from app.api.auth import router as auth_router


app = FastAPI(
    title="AI IT Support System",
    version="1.0.0",
    description="AI-Powered IT Support & Ticket Management System"
)


app.include_router(health_router)
app.include_router(users_router)
app.include_router(teams_router)
app.include_router(categories_router)
app.include_router(tickets_router)
app.include_router(ticket_comments_router)
app.include_router(attachments_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "AI IT Support System API is running"
    }