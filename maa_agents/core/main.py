import os
import json
from contextlib import asynccontextmanager
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import asyncio

# --- 1. CONFIGURATION AND INITIALIZATION ---

# MANDATORY: Replace this with your actual Firebase project ID later
FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID" 
AUD_CONVERSION_RATE = 1.50
USER_ID_MOCK = "admin_owner_123"

# --- 2. DATA SCHEMAS (Pydantic Models) ---

class AgentStatus(BaseModel):
    agent_active_status: bool = Field(True)

class AgentMetric(BaseModel):
    cost_conversion_rate: float = Field(AUD_CONVERSION_RATE)
    total_simulated_cost_usd: float = Field(0.00)
    total_simulated_cost_aud: float = Field(0.00)
    total_tokens_used: int = Field(0)
    last_run_timestamp: Optional[datetime] = None

class AuditLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_name: str
    action: str
    tokens: int
    cost_usd: float
    status: str 

# --- MOCK FIRESTORE DATA STORE ---
mock_db = {
    f"users/{USER_ID_MOCK}/config": AgentStatus().model_dump(),
    f"users/{USER_ID_MOCK}/metrics": AgentMetric().model_dump(),
    f"users/{USER_ID_MOCK}/audit_log": []
}

# --- 3. LIFECYCLE AND APP INSTANCE ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FastAPI Application Starting Up...")
    yield
    print("FastAPI Application Shutting Down...")

app = FastAPI(
    title="MAA Backend Proxy (Agent Orchestration)",
    version="1.0.0",
    lifespan=lifespan
)

# --- 4. API ENDPOINTS (Owner Controls) ---

@app.get("/api/status", response_model=AgentMetric)
async def get_agent_status_metrics():
    return mock_db[f"users/{USER_ID_MOCK}/metrics"]

@app.post("/api/veto/toggle", response_model=AgentStatus)
async def toggle_veto_switch(status: AgentStatus):
    mock_db[f"users/{USER_ID_MOCK}/config"] = status.model_dump()
    
    new_log = AuditLogEntry(
        agent_name="ADMIN (YOU)",
        action=f"VETO {'ACTIVATED' if not status.agent_active_status else 'RELEASED'}.",
        tokens=0,
        cost_usd=0.0,
        status="ERROR" if not status.agent_active_status else "READY",
    ).model_dump()
    
    mock_db[f"users/{USER_ID_MOCK}/audit_log"].append(new_log)
    
    return status

@app.get("/api/audit/log", response_model=List[AuditLogEntry])
async def get_audit_log_stream():
    return mock_db[f"users/{USER_ID_MOCK}/audit_log"]

# --- 5. AGENT SIMULATION ENDPOINT (MOCK FOR DEVELOPMENT) ---
@app.post("/api/agent/simulate_run")
async def simulate_agent_run():
    current_config = mock_db[f"users/{USER_ID_MOCK}/config"]
    if not current_config.get("agent_active_status", True):
        raise HTTPException(status_code=403, detail="Veto active. Agent execution blocked.")

    tokens_used = os.urandom(1)[0] * 50 + 500
    cost_per_token_usd = 0.001
    cost_usd = (tokens_used / 1000) * cost_per_token_usd
    
    metrics = mock_db[f"users/{USER_ID_MOCK}/metrics"]
    metrics["total_simulated_cost_usd"] += cost_usd
    metrics["total_tokens_used"] += tokens_used
    metrics["total_simulated_cost_aud"] = metrics["total_simulated_cost_usd"] * metrics["cost_conversion_rate"]
    metrics["last_run_timestamp"] = datetime.utcnow()
    
    mock_db[f"users/{USER_ID_MOCK}/audit_log"].append(AuditLogEntry(
        agent_name="Agent 5 (Coder)",
        action=f"GENERATE: Wrote code for Lead Scoring function.",
        tokens=tokens_used,
        cost_usd=cost_usd,
        status="SUCCESS"
    ).model_dump())
    
    return {"message": "Agent execution successful", "tokens": tokens_used}
