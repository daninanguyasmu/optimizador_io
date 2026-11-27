import React, { useState, useEffect } from 'react'
import { TrendingUp, ArrowLeftRight, Download, CheckCircle2, Info, BarChart3, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const CITY_LABELS = ['Ciudad A', 'Ciudad B', 'Ciudad C', 'Ciudad D', 'Ciudad E']

const fmt = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '—'
  if (Math.abs(num) < 1e-9) return '0'
  const rounded = Math.round(num * 10000) / 10000
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(4).replace(/\.?0+$/, '')
}

export default function App() {
  const [activeTab, setActiveTab] = useState('simplex')
  const [apiOnline, setApiOnline] = useState(null)

  // Estado Simplex
  const [objective, setObjective] = useState('MAX')
  const [nVars, setNVars] = useState(2)
  const [mCons, setMCons] = useState(3)
  const [zCoeffs, setZCoeffs] = useState([3, 5, 0, 0, 0])
  const [aMatrix, setAMatrix] = useState([
    [1, 0, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [3, 2, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ])
  const [ops, setOps] = useState(['<=', '<=', '<=', '<=', '<='])
  const [bVector, setBVector] = useState([4, 12, 18, 0, 0])
  const [simplexLoading, setSimplexLoading] = useState(false)
  const [simplexError, setSimplexError] = useState('')
  const [simplexResult, setSimplexResult] = useState(null)

  // Estado DEMAXMIN
  const [origCount, setOrigCount] = useState(4)
  const [destCount, setDestCount] = useState(4)
  const [costs, setCosts] = useState([
    [8, 6, 10, 9, 0],
    [9, 12, 13, 7, 0],
    [14, 9, 16, 5, 0],
    [10, 8, 11, 6, 0],
    [0, 0, 0, 0, 0],
  ])
  const [supply, setSupply] = useState([35, 50, 40, 25, 0])
  const [demand, setDemand] = useState([45, 20, 30, 55, 0])
  const [demaxLoading, setDemaxLoading] = useState(false)
  const [demaxError, setDemaxError] = useState('')
  const [demaxResult, setDemaxResult] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => setApiOnline(res.ok))
      .catch(() => setApiOnline(false))
  }, [])

  const loadSimplexExample = () => {
    setObjective('MAX')
    setNVars(2)
    setMCons(3)
    setZCoeffs([3, 5, 0, 0, 0])
    setAMatrix([
      [1, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
      [3, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    setOps(['<=', '<=', '<=', '<=', '<='])
    setBVector([4, 12, 18, 0, 0])
    setSimplexError('')
    setSimplexResult(null)
  }

  const clearSimplex = () => {
    setZCoeffs([0, 0, 0, 0, 0])
    setAMatrix(Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]))
    setOps(['<=', '<=', '<=', '<=', '<='])
    setBVector([0, 0, 0, 0, 0])
    setSimplexError('')
    setSimplexResult(null)
  }

  const solveSimplex = async () => {
    setSimplexLoading(true)
    setSimplexError('')
    const payload = {
      tipo_objetivo: objective,
      coeficientes_objetivo: zCoeffs.slice(0, nVars),
      matriz_restricciones: aMatrix.slice(0, mCons).map((row) => row.slice(0, nVars)),
      operadores: ops.slice(0, mCons),
      lado_derecho: bVector.slice(0, mCons),
    }

    try {
      const res = await fetch(`${API_URL}/api/simplex/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Error al procesar el modelo Simplex en el backend.')
      }
      const data = await res.json()
      setSimplexResult({ payload, response: data })
      setApiOnline(true)
    } catch (err) {
      setSimplexError(
        err.message.includes('Failed to fetch')
          ? `No se pudo conectar con el servidor FastAPI en ${API_URL}. Asegúrate de ejecutar uvicorn main:app --reload en /backend.`
          : err.message
      )
    } finally {
      setSimplexLoading(false)
    }
  }

  const loadDemaxExample = () => {
    setOrigCount(4)
    setDestCount(4)
    setCosts([
      [8, 6, 10, 9, 0],
      [9, 12, 13, 7, 0],
      [14, 9, 16, 5, 0],
      [10, 8, 11, 6, 0],
      [0, 0, 0, 0, 0],
    ])
    setSupply([35, 50, 40, 25, 0])
    setDemand([45, 20, 30, 55, 0])
    setDemaxError('')
    setDemaxResult(null)
  }

  const clearDemax = () => {
    setCosts(Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]))
    setSupply([0, 0, 0, 0, 0])
    setDemand([0, 0, 0, 0, 0])
    setDemaxError('')
    setDemaxResult(null)
  }

  const solveDemaxmin = async () => {
    setDemaxError('')
    const sumS = supply.slice(0, origCount).reduce((a, b) => a + b, 0)
    const sumD = demand.slice(0, destCount).reduce((a, b) => a + b, 0)
    if (sumS <= 0 || sumD <= 0) {
      setDemaxError('Captura valores mayores a 0 en Oferta y Demanda antes de resolver.')
      return
    }

    setDemaxLoading(true)
    const payload = {
      matriz_costos: costs.slice(0, origCount).map((row) => row.slice(0, destCount)),
      vector_oferta: supply.slice(0, origCount),
      vector_demanda: demand.slice(0, destCount),
    }

    try {
      const res = await fetch(`${API_URL}/api/demaxmin/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Error al procesar el modelo DEMAXMIN en el backend.')
      }
      const data = await res.json()
      setDemaxResult({ payload, response: data })
      setApiOnline(true)
    } catch (err) {
      setDemaxError(
        err.message.includes('Failed to fetch')
          ? `No se pudo conectar con el servidor FastAPI en ${API_URL}. Asegúrate de ejecutar uvicorn main:app --reload en /backend.`
          : err.message
      )
    } finally {
      setDemaxLoading(false)
    }
  }

  const sumSupply = supply.slice(0, origCount).reduce((a, b) => a + b, 0)
  const sumDemand = demand.slice(0, destCount).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Optimizador de Investigación de Operaciones
            </h1>
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('simplex')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'simplex' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Método Simplex</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('demaxmin')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'demaxmin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Método DEMAXMIN (Transporte)</span>
        </button>
      </nav>

      {activeTab === 'simplex' ? (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Configuración del Modelo Lineal (Simplex)</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={clearSimplex} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Limpiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Objetivo de Optimización
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="MAX">Maximizar Z</option>
                </select>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Variables (N)</span>
                  <span className="text-xs text-slate-400">Rango: 2 a 5</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={nVars <= 2} onClick={() => setNVars((v) => v - 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">−</button>
                  <span className="w-7 text-center font-bold text-slate-900">{nVars}</span>
                  <button type="button" disabled={nVars >= 5} onClick={() => setNVars((v) => v + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">+</button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Restricciones (M)</span>
                  <span className="text-xs text-slate-400">Rango: 2 a 5</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={mCons <= 2} onClick={() => setMCons((v) => v - 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">−</button>
                  <span className="w-7 text-center font-bold text-slate-900">{mCons}</span>
                  <button type="button" disabled={mCons >= 5} onClick={() => setMCons((v) => v + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">+</button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2.5">1. Función Objetivo (Z)</h3>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-indigo-700 text-sm mr-1">Z =</span>
                {Array.from({ length: nVars }, (_, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-slate-400 font-bold">+</span>}
                    <div className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={zCoeffs[j]}
                        onChange={(e) => {
                          const next = [...zCoeffs]
                          next[j] = parseFloat(e.target.value) || 0
                          setZCoeffs(next)
                        }}
                        className="w-20 px-2.5 py-1.5 text-center bg-white border border-slate-300 rounded-lg text-sm font-medium"
                      />
                      <span className="text-sm font-semibold text-slate-700">x<sub>{j + 1}</sub></span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2.5">
                <h3 className="text-sm font-bold text-slate-800">2. Restricciones Funcionales (Sujeto a:)</h3>
                <span className="text-xs text-slate-400">Condición de balanceo: Lado derecho b<sub>i</sub> ≥ 0</span>
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: mCons }, (_, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 w-7">R{i + 1}:</span>
                    {Array.from({ length: nVars }, (_, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="text-slate-400 font-bold">+</span>}
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={aMatrix[i][j]}
                            onChange={(e) => {
                              const next = aMatrix.map((r) => [...r])
                              next[i][j] = parseFloat(e.target.value) || 0
                              setAMatrix(next)
                            }}
                            className="w-20 px-2.5 py-1.5 text-center bg-white border border-slate-300 rounded-lg text-sm font-medium"
                          />
                          <span className="text-sm font-semibold text-slate-700">x<sub>{j + 1}</sub></span>
                        </div>
                      </React.Fragment>
                    ))}
                    <span
                      title="Restricción estándar menor o igual"
                      className="inline-flex items-center justify-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700"
                    >
                      ≤
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={bVector[i]}
                      onChange={(e) => {
                        const next = [...bVector]
                        next[i] = Math.max(0, parseFloat(e.target.value) || 0)
                        setBVector(next)
                      }}
                      className="w-24 px-2.5 py-1.5 text-center bg-white border border-slate-300 rounded-lg text-sm font-medium"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 italic mt-2.5">
                Nota: Se asume condición de no negatividad x<sub>i</sub> ≥ 0 para todas las variables.
              </p>
            </div>

            {simplexError && (
              <div className="mt-4 rounded-xl p-3.5 text-sm border bg-rose-50 border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{simplexError}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={simplexLoading}
                onClick={solveSimplex}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {simplexLoading ? 'Calculando en FastAPI...' : 'Resolver Método Simplex'}
              </button>
            </div>
          </div>

          {simplexResult && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Resultado Óptimo (Simplex)</h3>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Estado: {simplexResult.response.estado}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="bg-indigo-600 text-white rounded-xl p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-indigo-100">Valor Óptimo Z*</span>
                    <span className="block text-2xl font-extrabold mt-1">
                      {simplexResult.response.estado === 'OPTIMA' ? fmt(simplexResult.response.valor_optimo_z) : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Iteraciones</span>
                    <span className="block text-2xl font-bold text-slate-900 mt-1">{simplexResult.response.iteraciones.length - 1}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Variables</span>
                    <span className="block text-2xl font-bold text-slate-900 mt-1">{nVars}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                  {Object.entries(simplexResult.response.variables_decision).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-center">
                      <span className="block text-xs font-semibold text-slate-500">{k}</span>
                      <span className="block text-lg font-bold text-slate-900 mt-0.5">{fmt(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {simplexResult.response.iteraciones.map((it) => (
                <div key={it.iteracion} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">
                    {it.iteracion === 0 ? 'Tabla 0 (Tableau Inicial)' : it.es_optimo ? `Tabla ${it.iteracion} (Tableau Final Óptimo)` : `Tabla ${it.iteracion}`}
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs sm:text-sm text-center border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          <th className="px-3 py-2 border-b border-r border-slate-200">Base</th>
                          {simplexResult.response.nombres_columnas.map((col, cIdx) => (
                            <th key={col} className={`px-3 py-2 border-b border-slate-200 ${cIdx === it.columna_pivote ? 'bg-indigo-100 text-indigo-900' : ''}`}>
                              {col}
                            </th>
                          ))}
                          <th className="px-3 py-2 border-b border-l border-slate-200 bg-slate-200/60">RHS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-indigo-50/40 font-semibold">
                          <td className="px-3 py-2 border-r border-slate-200 text-indigo-800">Z</td>
                          {it.tabla[0].map((val, cIdx) => (
                            <td key={cIdx} className="px-3 py-2">{fmt(val)}</td>
                          ))}
                        </tr>
                        {it.tabla.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx + 1 === it.fila_pivote ? 'bg-amber-50/70' : ''}>
                            <td className="px-3 py-2 border-r border-slate-200 font-semibold">{it.variables_basicas[rIdx]}</td>
                            {row.map((val, cIdx) => (
                              <td
                                key={cIdx}
                                className={`px-3 py-2 ${
                                  rIdx + 1 === it.fila_pivote && cIdx === it.columna_pivote ? 'bg-amber-300/80 font-bold' : ''
                                }`}
                              >
                                {fmt(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Modelo de Transporte — Método DEMAXMIN</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={clearDemax} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
                  Limpiar
                </button>
              </div>
            </div>

            <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-sky-900">
              <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Heurística de Transporte:</span> selecciona la columna con mayor demanda (<span className="font-semibold">DEMAX</span>) y asigna al menor costo de esa columna (<span className="font-semibold">MIN</span>).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Orígenes / Bodegas (M)</span>
                  <span className="text-xs text-slate-400">Etiquetas A–E (Rango: 2 a 5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={origCount <= 2} onClick={() => setOrigCount((v) => v - 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">−</button>
                  <span className="w-7 text-center font-bold text-slate-900">{origCount}</span>
                  <button type="button" disabled={origCount >= 5} onClick={() => setOrigCount((v) => v + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">+</button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Destinos / Clientes (N)</span>
                  <span className="text-xs text-slate-400">Etiquetas 1–5 (Rango: 2 a 5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={destCount <= 2} onClick={() => setDestCount((v) => v - 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">−</button>
                  <span className="w-7 text-center font-bold text-slate-900">{destCount}</span>
                  <button type="button" disabled={destCount >= 5} onClick={() => setDestCount((v) => v + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold disabled:opacity-40">+</button>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-3 border-b border-r border-slate-200">Origen \ Destino</th>
                    {Array.from({ length: destCount }, (_, j) => (
                      <th key={j} className="px-3 py-3 border-b border-slate-200 text-center">Destino {j + 1}</th>
                    ))}
                    <th className="px-3 py-3 border-b border-l border-slate-200 text-center text-emerald-700 bg-emerald-50/60">Oferta (S<sub>i</sub>)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.from({ length: origCount }, (_, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5 border-r border-slate-200 font-semibold text-slate-700 bg-slate-50/50">{CITY_LABELS[i]}</td>
                      {Array.from({ length: destCount }, (_, j) => (
                        <td key={j} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={costs[i][j]}
                            onChange={(e) => {
                              const next = costs.map((r) => [...r])
                              next[i][j] = parseFloat(e.target.value) || 0
                              setCosts(next)
                            }}
                            className="w-20 px-2 py-1.5 text-center bg-white border border-slate-300 rounded-lg text-sm"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 border-l border-slate-200 text-center bg-emerald-50/30">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={supply[i]}
                          onChange={(e) => {
                            const next = [...supply]
                            next[i] = Math.max(0, parseFloat(e.target.value) || 0)
                            setSupply(next)
                          }}
                          className="w-20 px-2 py-1.5 text-center bg-white border border-emerald-300 rounded-lg text-sm font-semibold text-emerald-800"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-sky-50/40">
                    <td className="px-3 py-2.5 border-r border-slate-200 font-semibold text-sky-800">Demanda (D<sub>j</sub>)</td>
                    {Array.from({ length: destCount }, (_, j) => (
                      <td key={j} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={demand[j]}
                          onChange={(e) => {
                            const next = [...demand]
                            next[j] = Math.max(0, parseFloat(e.target.value) || 0)
                            setDemand(next)
                          }}
                          className="w-20 px-2 py-1.5 text-center bg-white border border-sky-300 rounded-lg text-sm font-semibold text-sky-800"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 border-l border-slate-200 text-center font-bold text-xs text-slate-600">
                      {fmt(sumSupply)} {Math.abs(sumSupply - sumDemand) < 1e-9 ? '=' : '≠'} {fmt(sumDemand)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {demaxError && (
              <div className="mt-4 rounded-xl p-3.5 text-sm border bg-rose-50 border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{demaxError}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={demaxLoading}
                onClick={solveDemaxmin}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {demaxLoading ? 'Calculando en FastAPI...' : 'Resolver Método DEMAXMIN'}
              </button>
            </div>
          </div>

          {demaxResult && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Solución Final DEMAXMIN (Costo Total: ${fmt(demaxResult.response.costo_total_z)})</h3>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                    {demaxResult.response.nota_balanceo}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs sm:text-sm text-center border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5 border-b border-r border-slate-200 text-left">Origen \ Destino</th>
                        {demaxResult.response.nombres_columnas.map((col) => (
                          <th key={col} className="px-3 py-2.5 border-b border-slate-200">{col}</th>
                        ))}
                        <th className="px-3 py-2.5 border-b border-l border-slate-200 bg-emerald-50 text-emerald-800">Oferta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {demaxResult.response.nombres_filas.map((rowName, i) => (
                        <tr key={rowName}>
                          <td className="px-3 py-2.5 border-r border-slate-200 font-semibold text-left bg-slate-50/50">{rowName}</td>
                          {demaxResult.response.matriz_asignacion[i].map((val, j) => (
                            <td key={j} className={`px-3 py-2.5 ${val > 0 ? 'bg-indigo-50 font-bold text-indigo-800' : 'text-slate-400'}`}>
                              {fmt(val)} <span className="block text-[10px] text-slate-400 font-normal">c={fmt(demaxResult.response.matriz_costos[i][j])}</span>
                            </td>
                          ))}
                          <td className="px-3 py-2.5 border-l border-slate-200 font-bold text-emerald-700 bg-emerald-50/30">
                            {fmt(demaxResult.response.vector_oferta[i])}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-sky-50/40 font-bold text-sky-800">
                        <td className="px-3 py-2.5 border-r border-slate-200 text-left">Demanda</td>
                        {demaxResult.response.vector_demanda.map((d, j) => (
                          <td key={j} className="px-3 py-2.5">{fmt(d)}</td>
                        ))}
                        <td className="px-3 py-2.5 border-l border-slate-200 text-slate-700">
                          {fmt(demaxResult.response.vector_oferta.reduce((a, b) => a + b, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <h4 className="text-base font-bold text-slate-900 mb-3">Resumen de Iteraciones (Heurística DEMAXMIN)</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs sm:text-sm text-center border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-200">Paso</th>
                        <th className="px-3 py-2 border-b border-slate-200">Columna k (Máx Demanda)</th>
                        <th className="px-3 py-2 border-b border-slate-200">Fila m (Mín Costo)</th>
                        <th className="px-3 py-2 border-b border-slate-200">Asignación</th>
                        <th className="px-3 py-2 border-b border-slate-200">Costo Parcial</th>
                        <th className="px-3 py-2 border-b border-slate-200">Z Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {demaxResult.response.pasos.map((s) => (
                        <tr key={s.paso} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-700">{s.paso}</td>
                          <td className="px-3 py-2 font-medium text-indigo-700">
                            {s.columna} <span className="text-xs text-slate-400">(D={fmt(s.demanda_activa_col)})</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-emerald-700">
                            {s.fila} <span className="text-xs text-slate-400">(c={fmt(s.costo_minimo)})</span>
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">{fmt(s.cantidad)}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {fmt(s.cantidad)} × {fmt(s.costo_minimo)} = <strong>{fmt(s.costo_parcial)}</strong>
                          </td>
                          <td className="px-3 py-2 font-bold text-indigo-900">{fmt(s.z_acumulado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-800 px-1">Tablas Paso a Paso (Matrices por Iteración)</h4>
                {demaxResult.response.pasos.map((s) => (
                  <div key={s.paso} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <h5 className="text-sm font-bold text-slate-800">
                        Paso {s.paso}: Asignar {fmt(s.cantidad)} en ({s.fila}, {s.columna})
                      </h5>
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        Máx Demanda: {s.columna} ({fmt(s.demanda_activa_col)}) | Mín Costo: {s.fila} (c={fmt(s.costo_minimo)}) | Z = ${fmt(s.z_acumulado)}
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs sm:text-sm text-center border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="px-3 py-2 border-b border-r border-slate-200 text-left">Origen \ Destino</th>
                            {demaxResult.response.nombres_columnas.map((col, j) => (
                              <th
                                key={col}
                                className={`px-3 py-2 border-b border-slate-200 ${
                                  j === s.col_idx ? 'bg-indigo-100 text-indigo-900' : ''
                                }`}
                              >
                                {col}
                              </th>
                            ))}
                            <th className="px-3 py-2 border-b border-l border-slate-200 bg-emerald-50 text-emerald-800">
                              Oferta Rest.
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {demaxResult.response.nombres_filas.map((rowName, i) => {
                            const isSelectedRow = i === s.fila_idx
                            return (
                              <tr key={rowName} className={isSelectedRow ? 'bg-amber-50/40' : ''}>
                                <td className="px-3 py-2 border-r border-slate-200 font-semibold text-left bg-slate-50/50">
                                  {rowName}
                                </td>
                                {s.matriz_asignacion[i].map((val, j) => {
                                  const isCurrentCell = i === s.fila_idx && j === s.col_idx
                                  const isSelectedCol = j === s.col_idx
                                  let cellClass = 'text-slate-400'
                                  if (isCurrentCell) {
                                    cellClass = 'bg-amber-300/80 font-bold text-slate-900 ring-2 ring-inset ring-amber-500'
                                  } else if (val > 0) {
                                    cellClass = 'bg-indigo-50 font-bold text-indigo-800'
                                  } else if (isSelectedCol) {
                                    cellClass = 'bg-indigo-50/40 text-slate-400'
                                  }
                                  return (
                                    <td key={j} className={`px-3 py-2 ${cellClass}`}>
                                      {fmt(val)}
                                      <span className="block text-[10px] text-slate-500 font-normal">
                                        c={fmt(demaxResult.response.matriz_costos[i][j])}
                                      </span>
                                    </td>
                                  )
                                })}
                                <td className={`px-3 py-2 border-l border-slate-200 font-bold ${
                                  s.oferta_restante[i] <= 1e-9 ? 'text-slate-400 bg-slate-50' : 'text-emerald-700 bg-emerald-50/30'
                                }`}>
                                  {fmt(s.oferta_restante[i])}
                                </td>
                              </tr>
                            )
                          })}
                          <tr className="bg-sky-50/40 font-bold text-sky-800">
                            <td className="px-3 py-2 border-r border-slate-200 text-left">Demanda Rest.</td>
                            {s.demanda_restante.map((d, j) => (
                              <td key={j} className={`px-3 py-2 ${d <= 1e-9 ? 'text-slate-400' : 'text-sky-800'}`}>
                                {fmt(d)}
                              </td>
                            ))}
                            <td className="px-3 py-2 border-l border-slate-200 text-slate-600">
                              ${fmt(s.z_acumulado)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
