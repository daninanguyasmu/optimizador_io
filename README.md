# Optimizador de Investigación de Operaciones (Simplex & DEMAXMIN)

Aplicación Full-Stack (React PWA + FastAPI + NumPy) desarrollada para la materia de **Investigación de Operaciones** (TecNM Campus Tuxtla Gutiérrez).

## Estructura del Proyecto

- `backend/`: API REST en **FastAPI** y motores matemáticos en **Python + NumPy** (`simplex_solver.py`, `demaxmin_solver.py`, `main.py`).
- `frontend/`: Aplicación Web Progresiva en **React.js + Vite + Tailwind CSS**.

## Cómo ejecutar el proyecto

### 1. Iniciar el Backend (FastAPI + NumPy)

```bash
cd backend
python -m venv venv
# En Windows: venv\Scripts\activate
# En Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

La documentación interactiva de la API estará disponible en `http://localhost:8000/docs`.

### 2. Iniciar el Frontend (React + Vite)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.
