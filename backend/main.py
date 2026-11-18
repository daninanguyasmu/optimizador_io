from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simplex_solver import resolver_simplex
from demaxmin_solver import resolver_demaxmin

app = FastAPI(
    title="API de Optimización Lineal — Simplex & DEMAXMIN",
    description="Backend en Python + NumPy para la aplicación de Investigación de Operaciones (TecNM Tuxtla).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimplexRequest(BaseModel):
    tipo_objetivo: str = Field(..., pattern="^(MAX|MIN)$")
    coeficientes_objetivo: List[float]
    matriz_restricciones: List[List[float]]
    operadores: List[str]
    lado_derecho: List[float]


class DemaxminRequest(BaseModel):
    matriz_costos: List[List[float]]
    vector_oferta: List[float]
    vector_demanda: List[float]


@app.get("/api/health")
def health_check():
    return {"status": "ok", "motor": "Python + NumPy"}


@app.post("/api/simplex/solve")
def solve_simplex_endpoint(req: SimplexRequest):
    if len(req.matriz_restricciones) != len(req.lado_derecho) or len(req.matriz_restricciones) != len(req.operadores):
        raise HTTPException(status_code=400, detail="Las dimensiones de restricciones, operadores y lado derecho no coinciden.")
    try:
        return resolver_simplex(
            tipo_objetivo=req.tipo_objetivo,
            coeficientes_objetivo=req.coeficientes_objetivo,
            matriz_restricciones=req.matriz_restricciones,
            operadores=req.operadores,
            lado_derecho=req.lado_derecho,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/demaxmin/solve")
def solve_demaxmin_endpoint(req: DemaxminRequest):
    if sum(req.vector_oferta) <= 0 or sum(req.vector_demanda) <= 0:
        raise HTTPException(status_code=400, detail="La suma de oferta y demanda debe ser mayor a 0.")
    return resolver_demaxmin(
        matriz_costos_in=req.matriz_costos,
        vector_oferta_in=req.vector_oferta,
        vector_demanda_in=req.vector_demanda,
    )
