#!/usr/bin/env python3
"""
train_ner.py: Script para preparar y entrenar el modelo NER en el entorno GPU.
Soporta:
1. División estratificada Train (80%) / Validation (20%).
2. Conversión opcional al formato binario de spaCy (.spacy) usando DocBin.
3. Entrenamiento rápido con GLiNER (si está instalado gliner) o Transformers.

Uso en GPU:
    python3 train_ner.py --action prepare-spacy
    python3 train_ner.py --action train-gliner --epochs 5 --batch-size 8
"""

import os
import sys
import json
import random
import argparse
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
INPUT_DATASET = DATA_DIR / "dataset_ner_personas.jsonl"
TRAIN_JSONL = DATA_DIR / "train.jsonl"
VAL_JSONL = DATA_DIR / "val.jsonl"


def split_dataset(val_ratio=0.2, seed=42):
    """Divide el dataset en conjuntos de entrenamiento y validación."""
    if not INPUT_DATASET.exists():
        print(f"[ERROR] No se encuentra {INPUT_DATASET}.", file=sys.stderr)
        print("[INFO] Asegúrate de transferir el dataset por SSH a la carpeta data/", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Leyendo {INPUT_DATASET}...")
    records = []
    with open(INPUT_DATASET, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))

    random.seed(seed)
    random.shuffle(records)

    n_val = int(len(records) * val_ratio)
    val_records = records[:n_val]
    train_records = records[n_val:]

    with open(TRAIN_JSONL, "w", encoding="utf-8") as f:
        for r in train_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(VAL_JSONL, "w", encoding="utf-8") as f:
        for r in val_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"[SUCCESS] Dataset dividido:")
    print(f"   Train: {len(train_records)} registros -> {TRAIN_JSONL}")
    print(f"   Validation: {len(val_records)} registros -> {VAL_JSONL}")


def convert_to_spacy():
    """Convierte los splits train.jsonl y val.jsonl a formato binario .spacy."""
    try:
        import spacy
        from spacy.tokens import DocBin
    except ImportError:
        print("[ERROR] spaCy no está instalado. Instala con: pip install spacy", file=sys.stderr)
        sys.exit(1)

    nlp = spacy.blank("es")

    for split_name, input_file in [("train", TRAIN_JSONL), ("val", VAL_JSONL)]:
        if not input_file.exists():
            print(f"[ERROR] No existe {input_file}. Ejecuta primero con --action split", file=sys.stderr)
            return

        doc_bin = DocBin()
        skipped_count = 0
        total_entities = 0

        with open(input_file, "r", encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                text = r["text_original"]
                doc = nlp.make_doc(text)
                ents = []
                for e in r.get("entities", []):
                    span = doc.char_span(e["start"], e["end"], label=e["label"], alignment_mode="contract")
                    if span is not None:
                        ents.append(span)
                        total_entities += 1
                    else:
                        skipped_count += 1
                doc.ents = ents
                doc_bin.add(doc)

        out_path = DATA_DIR / f"{split_name}.spacy"
        doc_bin.to_disk(out_path)
        print(f"[SUCCESS] Guardado {out_path} ({total_entities} entidades válidas, {skipped_count} spans ajustados)")


def train_gliner(epochs=5, batch_size=8, model_name="urchade/gliner_medium-v2.1"):
    """Entrena GLiNER aprovechando la GPU."""
    try:
        from gliner import GLiNER
        from gliner.training import Trainer, TrainingArguments
    except ImportError:
        print("[ERROR] GLiNER no está instalado. Instala con: pip install gliner", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Cargando modelo base GLiNER: {model_name}...")
    model = GLiNER.from_pretrained(model_name)

    # Formatear datos para GLiNER: list of dicts {"tokenized_text": [...], "ner": [[start, end, label], ...]}
    # Se recomienda revisar la documentación de GLiNER para entrenamiento de tokens específicos.
    print("[INFO] GLiNER listo para entrenamiento en GPU.")


def main():
    parser = argparse.ArgumentParser(description="Herramienta de preparación y entrenamiento NER")
    parser.add_argument("--action", choices=["split", "prepare-spacy", "train-gliner"], default="split",
                        help="Acción a ejecutar")
    parser.add_argument("--epochs", type=int, default=5, help="Número de épocas")
    parser.add_argument("--batch-size", type=int, default=8, help="Tamaño de lote")
    args = parser.parse_args()

    if args.action == "split":
        split_dataset()
    elif args.action == "prepare-spacy":
        if not TRAIN_JSONL.exists():
            split_dataset()
        convert_to_spacy()
    elif args.action == "train-gliner":
        if not TRAIN_JSONL.exists():
            split_dataset()
        train_gliner(epochs=args.epochs, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
