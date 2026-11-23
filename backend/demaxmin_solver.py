from typing import List, Dict, Any
import numpy as np


def resolver_demaxmin(
    matriz_costos_in: List[List[float]],
    vector_oferta_in: List[float],
    vector_demanda_in: List[float],
) -> Dict[str, Any]:
    """
    Resuelve el modelo de transporte mediante la heurística DEMAXMIN
    (Demanda Máxima - Costo Mínimo), con balanceo automático mediante
    origen o destino ficticio de costo 0.
    """
    matriz_costos = np.array(matriz_costos_in, dtype=float)
    vector_oferta = np.array(vector_oferta_in, dtype=float)
    vector_demanda = np.array(vector_demanda_in, dtype=float)

    m, n = matriz_costos.shape
    nombres_filas = [f"Ciudad {chr(65 + i)}" for i in range(m)]
    nombres_cols = [f"Destino {j + 1}" for j in range(n)]

    suma_oferta = float(np.sum(vector_oferta))
    suma_demanda = float(np.sum(vector_demanda))

    balanceado_original = abs(suma_oferta - suma_demanda) < 1e-9
    nota_balanceo = "Modelo balanceado originalmente (Oferta = Demanda)."

    if not balanceado_original:
        if suma_oferta > suma_demanda:
            diferencia = suma_oferta - suma_demanda
            col_ficticia = np.zeros((m, 1), dtype=float)
            matriz_costos = np.hstack([matriz_costos, col_ficticia])
            vector_demanda = np.append(vector_demanda, diferencia)
            nombres_cols.append("Destino Ficticio")
            nota_balanceo = f"Se agregó un Destino Ficticio con demanda {round(diferencia, 4)} y costo 0."
        else:
            diferencia = suma_demanda - suma_oferta
            fila_ficticia = np.zeros((1, n), dtype=float)
            matriz_costos = np.vstack([matriz_costos, fila_ficticia])
            vector_oferta = np.append(vector_oferta, diferencia)
            nombres_filas.append("Origen Ficticio")
            nota_balanceo = f"Se agregó un Origen Ficticio con oferta {round(diferencia, 4)} y costo 0."

    filas, cols = matriz_costos.shape
    matriz_asignacion = np.zeros((filas, cols), dtype=float)
    oferta_restante = vector_oferta.copy()
    demanda_restante = vector_demanda.copy()

    costo_total_z = 0.0
    pasos: List[Dict[str, Any]] = []
    paso_num = 1

    while np.any(oferta_restante > 1e-9) and np.any(demanda_restante > 1e-9):
        # k <- Columna con MAXIMA demanda activa
        demandas_activas = np.where(demanda_restante > 1e-9, demanda_restante, -1.0)
        k = int(np.argmax(demandas_activas))
        max_demanda = float(demanda_restante[k])

        # m <- Fila con MINIMO costo en columna k (entre filas con oferta > 0)
        costos_col_k = np.where(oferta_restante > 1e-9, matriz_costos[:, k], float("inf"))
        m_idx = int(np.argmin(costos_col_k))
        min_costo = float(matriz_costos[m_idx, k])

        # cant <- MIN(Oferta[m], Demanda[k])
        cant = float(min(oferta_restante[m_idx], demanda_restante[k]))
        matriz_asignacion[m_idx, k] += cant
        costo_parcial = cant * min_costo
        costo_total_z += costo_parcial

        oferta_restante[m_idx] -= cant
        demanda_restante[k] -= cant

        pasos.append({
            "paso": paso_num,
            "col_idx": k,
            "fila_idx": m_idx,
            "columna": nombres_cols[k],
            "demanda_activa_col": round(max_demanda, 4),
            "fila": nombres_filas[m_idx],
            "costo_minimo": round(min_costo, 4),
            "cantidad": round(cant, 4),
            "costo_parcial": round(costo_parcial, 4),
            "z_acumulado": round(costo_total_z, 4),
            "matriz_asignacion": np.round(matriz_asignacion, 4).tolist(),
            "oferta_restante": np.round(oferta_restante, 4).tolist(),
            "demanda_restante": np.round(demanda_restante, 4).tolist(),
        })
        paso_num += 1

    return {
        "balanceado_original": balanceado_original,
        "nota_balanceo": nota_balanceo,
        "nombres_filas": nombres_filas,
        "nombres_columnas": nombres_cols,
        "matriz_costos": np.round(matriz_costos, 4).tolist(),
        "vector_oferta": np.round(vector_oferta, 4).tolist(),
        "vector_demanda": np.round(vector_demanda, 4).tolist(),
        "matriz_asignacion": np.round(matriz_asignacion, 4).tolist(),
        "costo_total_z": round(costo_total_z, 4),
        "pasos": pasos,
    }
