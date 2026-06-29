import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import analyze, procedures, worker
from contextlib import asynccontextmanager
from database import init_db, Base, engine
from models import (
    User, SOP, Step, DetectedTool, Analysis,
    WorkerFeedback, WorkerPerformance
)

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "aims", "dist")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AIMS Backend started")
    print("📊 Initializing database...")
    init_db()
    yield
    print("🛑 AIMS Backend stopped")

app = FastAPI(
    title="AIMS Video Analysis API",
    version="0.2.0",
    description="AI-based SOP generation with database support",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

app.include_router(analyze.router, prefix="/api", tags=["analysis"])
app.include_router(procedures.router, prefix="/api", tags=["procedures"])
app.include_router(worker.router, prefix="/api", tags=["worker"])

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve frontend static files
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 경로는 제외
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return {"detail": "Not found"}
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "aims-video-analysis"}
