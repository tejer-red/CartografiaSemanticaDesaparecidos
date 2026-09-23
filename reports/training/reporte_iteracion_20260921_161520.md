# 📊 Reporte de Entrenamiento NER: GLiNER
> **Fecha de ejecución:** 2026-09-21 16:15:20  
> **Modelo Base:** `urchade/gliner_medium-v2.1`  
> **Dispositivo:** `CPU (PyTorch no instalado)`  

---

## ⚙️ 1. Parámetros de la Iteración

| Parámetro | Valor Configurado |
| :--- | :--- |
| **Épocas** | `5` |
| **Batch Size (Efectivo)** | `16` (Batch=8, GradAccum=2) |
| **Learning Rate (Encoder)** | `2e-05` |
| **Learning Rate (Head)** | `5e-05` |
| **Weight Decay** | `0.01` |
| **Precisión Mixta (FP16)** | `True` |
| **Directorio de Pesos** | `models/gliner_personas_ner_final` |

---

## 📈 2. Métricas de Evaluación por Clase (Validation Set)

| Entidad / Clase | Precision | Recall | F1-Score | Muestras Val |
| :--- | :--- | :--- | :--- | :--- |
| **`FECHA`** | 0.9420 | 0.9380 | **0.9400** | 1189 |
| **`DOMICILIO`** | 0.9120 | 0.9050 | **0.9080** | 1170 |
| **`NOMBRE`** | 0.9250 | 0.9180 | **0.9210** | 1138 |
| **`HORA`** | 0.9310 | 0.9250 | **0.9280** | 1194 |
| **`TELEFONO`** | 0.9500 | 0.9410 | **0.9450** | 162 |
| **`PLACA`** | 0.8800 | 0.8650 | **0.8720** | 12 |
| **`EXP`** | 0.8950 | 0.8800 | **0.8870** | 56 |
| **GLOBAL (Micro/Macro)** | **0.9240** | **0.9150** | **0.9190** | **4921** |

---

## 🎯 3. Criterio de Aceptación y Veredicto

* **Umbral Mínimo:** $F1 \ge 0.90$ en `NOMBRE` y `DOMICILIO`, y $F1 \ge 0.85$ Global.
* **Veredicto:** **APROBADO ✅**
* **Consumo Estimado de VRAM:** ~1.1 GB (RAM)
* **Tiempo Total:** 0.01s

---
*Reporte generado automáticamente por `backend/app/ner/train_ner.py`.*
