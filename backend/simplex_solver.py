from typing import List, Dict, Any, Optional
import numpy as np


def resolver_simplex(
    tipo_objetivo: str,
    coeficientes_objetivo: List[float],
    matriz_restricciones: List[List[float]],
    operadores: List[str],
    lado_derecho: List[float],
) -> Dict[str, Any]:
    """
    Resuelve un problema de Programación Lineal mediante el Método Simplex Estándar
    (restringido exclusivamente a restricciones <= con lado derecho b_i >= 0),
    siguiendo el diagrama N-S del proyecto sin variables artificiales ni Gran M.
    """
    n = len(coeficientes_objetivo)
    m = len(matriz_restricciones)
    coef_obj = np.array(coeficientes_objetivo, dtype=float)

    for i in range(m):
        if operadores[i] != "<=":
            raise ValueError(
                f"La restricción R{i + 1} usa '{operadores[i]}'. El Método Simplex estándar solo admite restricciones '<='."
            )
        if float(lado_derecho[i]) < 0:
            raise ValueError(
                f"La restricción R{i + 1} tiene lado derecho negativo ({lado_derecho[i]}). Se requiere b_i >= 0."
            )

    # Estandarización del modelo: solo variables de holgura s1..sm
    nombres_columnas: List[str] = [f"x{j + 1}" for j in range(n)] + [f"s{i + 1}" for i in range(m)]
    total_cols = len(nombres_columnas) + 1  # + RHS
    rhs_col = total_cols - 1

    # Variables descriptivas del modelo (según documentación)
    tabla_simplex = np.zeros((m + 1, total_cols), dtype=float)
    variables_basicas = [n + i for i in range(m)]

    # Fila Z: Z - c1 x1 - c2 x2 ... = 0
    tabla_simplex[0, :n] = -coef_obj

    # Llenar restricciones y variables de holgura
    for i in range(m):
        tabla_simplex[i + 1, :n] = [float(x) for x in matriz_restricciones[i][:n]]
        tabla_simplex[i + 1, n + i] = 1.0
        tabla_simplex[i + 1, rhs_col] = float(lado_derecho[i])

    es_optimo: bool = False
    columna_pivote: int = -1
    fila_pivote: int = -1
    elemento_pivote: float = 0.0
    estado: str = "OPTIMA"
    iteraciones: List[Dict[str, Any]] = []

    iter_num = 0
    max_iters = 30

    while not es_optimo and iter_num < max_iters:
        columna_pivote = -1
        fila_z = tabla_simplex[0, :rhs_col]

        if tipo_objetivo == "MAX":
            min_idx = int(np.argmin(fila_z))
            if fila_z[min_idx] < -1e-9:
                columna_pivote = min_idx
            else:
                es_optimo = True
        else:  # MIN
            max_idx = int(np.argmax(fila_z))
            if fila_z[max_idx] > 1e-9:
                columna_pivote = max_idx
            else:
                es_optimo = True

        if es_optimo:
            iteraciones.append({
                "iteracion": iter_num,
                "tabla": np.round(tabla_simplex, 6).tolist(),
                "variables_basicas": [nombres_columnas[idx] for idx in variables_basicas],
                "columna_pivote": -1,
                "fila_pivote": -1,
                "elemento_pivote": None,
                "cocientes": [None] * m,
                "es_optimo": True,
            })
            break

        # Menor cociente positivo (RHS / Columna_Pivote)
        fila_pivote = -1
        menor_cociente = float("inf")
        cocientes: List[Optional[float]] = []

        for i in range(1, m + 1):
            val_piv = tabla_simplex[i, columna_pivote]
            if val_piv > 1e-9:
                cociente = float(tabla_simplex[i, rhs_col] / val_piv)
                cocientes.append(round(cociente, 6))
                if cociente < menor_cociente - 1e-9:
                    menor_cociente = cociente
                    fila_pivote = i
            else:
                cocientes.append(None)

        if fila_pivote == -1:
            estado = "NO_ACOTADA"
            iteraciones.append({
                "iteracion": iter_num,
                "tabla": np.round(tabla_simplex, 6).tolist(),
                "variables_basicas": [nombres_columnas[idx] for idx in variables_basicas],
                "columna_pivote": columna_pivote,
                "fila_pivote": -1,
                "elemento_pivote": None,
                "cocientes": cocientes,
                "es_optimo": False,
            })
            break

        elemento_pivote = float(tabla_simplex[fila_pivote, columna_pivote])
        iteraciones.append({
            "iteracion": iter_num,
            "tabla": np.round(tabla_simplex, 6).tolist(),
            "variables_basicas": [nombres_columnas[idx] for idx in variables_basicas],
            "columna_pivote": columna_pivote,
            "fila_pivote": fila_pivote,
            "elemento_pivote": round(elemento_pivote, 6),
            "cocientes": cocientes,
            "es_optimo": False,
        })

        # Normalizar fila pivote y aplicar Gauss-Jordan
        tabla_simplex[fila_pivote, :] = tabla_simplex[fila_pivote, :] / elemento_pivote
        for i in range(m + 1):
            if i == fila_pivote:
                continue
            factor = tabla_simplex[i, columna_pivote]
            if abs(factor) > 1e-12:
                tabla_simplex[i, :] -= factor * tabla_simplex[fila_pivote, :]

        variables_basicas[fila_pivote - 1] = columna_pivote
        iter_num += 1

    if not es_optimo and estado == "OPTIMA":
        estado = "MAX_ITER"

    valores_vars = np.zeros(len(nombres_columnas), dtype=float)
    for i in range(m):
        valores_vars[variables_basicas[i]] = tabla_simplex[i + 1, rhs_col]

    valor_optimo_z = round(float(tabla_simplex[0, rhs_col]), 6) if estado == "OPTIMA" else None

    return {
        "estado": estado,
        "es_optimo": bool(es_optimo and estado == "OPTIMA"),
        "valor_optimo_z": valor_optimo_z,
        "nombres_columnas": nombres_columnas,
        "variables_decision": {
            f"x{j + 1}": round(float(valores_vars[j]), 6) for j in range(n)
        },
        "columna_pivote": columna_pivote,
        "fila_pivote": fila_pivote,
        "elemento_pivote": round(elemento_pivote, 6) if fila_pivote != -1 else None,
        "tabla_simplex": np.round(tabla_simplex, 6).tolist(),
        "iteraciones": iteraciones,
    }
