# 🌐 Guía de Despliegue Independiente y Desacoplamiento Open Source

> **Proyecto Desacoplado:** `open-anonymizer-ner`  
> **Propósito:** Proveer a colectivos de búsqueda, organizaciones de derechos humanos y periodistas una herramienta autónoma de anonimización PII y extracción NER que corre en cualquier hardware (laptops, servidores o Raspberry Pi).

---

## 📦 1. Uso como Librería de Python

El módulo `backend/app/ner` está diseñado para desacoplarse como librería independiente:

```python
from backend.app.ner.anonymizer import PIIAnonymizer
from backend.app.ner.extractor import EntityExtractor

# Inicializar anonimizador con tu propia sal privada
anonymizer = PIIAnonymizer(salt="tu_sal_secreta_organizacion")

# Anonimizar texto libre
texto = "Refiere la reportante que el 15 de marzo de 2024 Juan Pérez salió de su casa en calle Morelos 45..."
resultado = anonymizer.anonymize_text(texto)

print(resultado["text_anonimizado"])
# Salida: "Refiere la reportante que el [FECHA_HASH_a1b2c3d4] [NOMBRE_HASH_9e8f7a6b] salió de su casa en [DOMICILIO_HASH_5c4b3a21]..."

# Consultar el diccionario de hashes (para desencriptado o grafo de relaciones)
print(resultado["hash_mappings"])
```

---

## ⌨️ 2. Uso como Herramienta CLI Directa

Puedes ejecutar la anonimización directamente desde la terminal sobre archivos de texto o lotes `.jsonl`:

```bash
# Anonimizar un archivo de texto plano:
python3 -m backend.app.ner.cli --input reporte_caso.txt --output reporte_protegido.txt --salt MI_SAL_SECRETA

# Anonimizar un archivo JSONL masivo:
python3 -m backend.app.ner.cli --input casos_crudos.jsonl --output casos_anonimizados.jsonl --export-hashes hash_registry.json
```

---

## 🍓 3. Despliegue Ligero en Raspberry Pi y Nodos Edge (ONNX Runtime)

Para dispositivos con recursos limitados (como la **Raspberry Pi 3B+ / 4 / 5**) donde instalar PyTorch y CUDA es inviable:

### Ventajas de la Inferencia ONNX:
* **Consumo de Memoria:** $< 150$ MB de RAM total.
* **Tiempo de Inferencia:** ~80 - 150 ms por cédula en CPU ARM64.
* **Dependencias:** Solo requiere `pip install onnxruntime numpy`.

### Despliegue con Docker Minimalista para Raspberry Pi:
```dockerfile
# Dockerfile.edge
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir onnxruntime numpy fastapi uvicorn
COPY backend/app/ner /app/ner
CMD ["uvicorn", "ner.standalone_api:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 🔒 4. Filosofía del Grafo Compartido entre Colectivas

Si dos organizaciones distintas (`Colectivo A` y `Colectivo B`) acuerdan compartir su **`PII_GLOBAL_SALT`**:
1. Sus expedientes privados permanecen **100% locales en sus propios discos duros**.
2. Al publicar sus grafos anonimizados en la capa pública, si una persona en el Colectivo A y otra en el Colectivo B desaparecieron en el mismo predio clandestino, **el token `[DOMICILIO_HASH_5c4b3a21]` coincidirá de forma idéntica**.
3. El grafo público conectará automáticamente ambos casos, alertando sobre un patrón delictivo o fosa común **sin revelar la dirección particular de las familias**.
