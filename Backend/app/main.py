
from contextlib import asynccontextmanager
from pathlib import Path
from .routers import brand_profile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import auth, feed, marketplace


# Create the uploads directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables when the application starts
    Base.metadata.create_all(bind=engine)
    yield


# Initialize FastAPI
app = FastAPI(
    title="CreatorSpace API",
    lifespan=lifespan,
)


# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve uploaded files
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)


# Register API routers
app.include_router(auth.router)
app.include_router(feed.router)
app.include_router(marketplace.router)
app.include_router(brand_profile.router)

# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}