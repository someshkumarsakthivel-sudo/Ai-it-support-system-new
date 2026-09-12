import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    ai_analysis,
    attachments,
    auth,
    categories,
    knowledge_base,
    notifications,
    sla_policies,
    teams,
    ticket_comments,
    tickets,
    users,
)
from app.core.database import Base, engine
from app.models import (
    ai_analysis as ai_analysis_model,
    ai_analysis_knowledge_base,
    attachment,
    audit_log,
    category,
    knowledge_base as knowledge_base_model,
    notification,
    role,
    sla_policy,
    team,
    ticket,
    ticket_comment,
    user,
)
from app.services.sla_service import check_sla_breaches


async def sla_background_worker():
    """
    Background worker that checks for SLA breaches periodically.
    """

    while True:
        try:
            from app.core.database import SessionLocal

            db = SessionLocal()

            try:
                notifications_created = check_sla_breaches(db)

                if notifications_created > 0:
                    print(
                        f"[SLA] Created {notifications_created} "
                        "SLA breach notification(s)."
                    )
                else:
                    print("[SLA] SLA check completed. No new breaches.")

            finally:
                db.close()

        except Exception as error:
            print(f"[SLA] Background check failed: {error}")

        # Check every 60 seconds.
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI application lifespan.

    Starts the SLA background worker when the application starts
    and stops it when the application shuts down.
    """

    print("[SLA] Starting SLA background worker...")

    sla_task = asyncio.create_task(
        sla_background_worker()
    )

    try:
        yield

    finally:
        print("[SLA] Stopping SLA background worker...")

        sla_task.cancel()

        try:
            await sla_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="AI-Powered IT Support & Ticket Management System",
    description=(
        "Backend API for an AI-powered IT support and "
        "ticket management platform."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-it-support-system-new.someshkumarsakthivel.workers.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(categories.router)
app.include_router(tickets.router)
app.include_router(ticket_comments.router)
app.include_router(attachments.router)
app.include_router(knowledge_base.router)
app.include_router(ai_analysis.router)
app.include_router(sla_policies.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {
        "message": "AI-Powered IT Support & Ticket Management System API"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }