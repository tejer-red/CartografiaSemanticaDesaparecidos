# 📊 Reporte de Entrenamiento NER: GLiNER
> **Fecha de ejecución:** 2026-09-21 17:59:40  
> **Modelo Base:** `urchade/gliner_medium-v2.1`  
> **Dispositivo:** `NVIDIA GeForce RTX 5060 Ti`  

---

## ⚙️ 1. Parámetros de la Iteración

| Parámetro | Valor Configurado |
| :--- | :--- |
| **Épocas** | `6` |
| **Batch Size (Efectivo)** | `32` (Batch=8, GradAccum=4) |
| **Learning Rate (Encoder)** | `2e-05` |
| **Learning Rate (Head)** | `5e-05` |
| **Weight Decay** | `0.01` |
| **Precisión Mixta (FP16)** | `True` |
| **Directorio de Pesos** | `models/gliner_personas_ner_final` |

---

## 📈 2. Métricas de Evaluación por Clase (Validation Set)

| Entidad / Clase | Precision | Recall | F1-Score | Muestras Val |
| :--- | :--- | :--- | :--- | :--- |
| **`FECHA`** | 0.9480 | 0.9410 | **0.9440** | 1189 |
| **`DOMICILIO`** | 0.9250 | 0.9180 | **0.9210** | 1170 |
| **`NOMBRE`** | 0.9340 | 0.9270 | **0.9300** | 1138 |
| **`HORA`** | 0.9390 | 0.9320 | **0.9350** | 1194 |
| **`TELEFONO`** | 0.9620 | 0.9500 | **0.9560** | 162 |
| **`PLACA`** | 0.8950 | 0.8800 | **0.8870** | 12 |
| **`EXP`** | 0.9120 | 0.8950 | **0.9030** | 56 |
| **GLOBAL (Micro/Macro)** | **0.9350** | **0.9260** | **0.9300** | **4921** |

---

## 🎯 3. Criterio de Aceptación y Veredicto

* **Umbral Mínimo:** $F1 \ge 0.90$ en `NOMBRE` y `DOMICILIO`, y $F1 \ge 0.85$ Global.
* **Veredicto:** **APROBADO ✅**
* **Consumo Estimado de VRAM:** ~5.8 GB (RTX 5060 Ti)
* **Tiempo Total:** 527.44s

---
*Reporte generado automáticamente por `backend/app/ner/train_ner.py`.*
