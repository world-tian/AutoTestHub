from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api.device import router as device_router

app = FastAPI(title="AutoTestHub Cloud Testing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(device_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "AutoTestHub Cloud Testing Backend is running"}
