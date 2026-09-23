#!/usr/bin/env python3
"""
cli.py: Herramienta de línea de comandos para anonimización PII independiente.
Permite anonimizar archivos .txt o .jsonl directamente desde la terminal.
"""

import sys
import json
import argparse
from pathlib import Path
from backend.app.ner.anonymizer import PIIAnonymizer


def main():
    parser = argparse.ArgumentParser(description="CLI de Anonimización PII Desacoplada")
    parser.add_argument("--input", "-i", type=str, required=True, help="Ruta al archivo de entrada (.txt o .jsonl)")
    parser.add_argument("--output", "-o", type=str, required=True, help="Ruta al archivo de salida")
    parser.add_argument("--salt", "-s", type=str, default=None, help="Sal criptográfica para HMAC-SHA256")
    parser.add_argument("--export-hashes", type=str, default=None, help="Ruta para exportar diccionario de hashes JSON")

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"[ERROR] Archivo no encontrado: {input_path}", file=sys.stderr)
        sys.exit(1)

    anonymizer = PIIAnonymizer(salt=args.salt)
    all_mappings = []

    print(f"[INFO] Procesando {input_path}...")

    if input_path.suffix.lower() == ".jsonl":
        with open(input_path, "r", encoding="utf-8") as fin, open(output_path, "w", encoding="utf-8") as fout:
            count = 0
            for line in fin:
                if not line.strip():
                    continue
                item = json.loads(line)
                text = item.get("text_original", item.get("text", ""))
                ents = item.get("entities", None)

                res = anonymizer.anonymize_text(text, entities=ents)
                item["text_anonimizado"] = res["text_anonimizado"]
                all_mappings.extend(res["hash_mappings"])

                fout.write(json.dumps(item, ensure_ascii=False) + "\n")
                count += 1
            print(f"[SUCCESS] {count} registros procesados y guardados en: {output_path}")

    else:
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()

        res = anonymizer.anonymize_text(text)
        all_mappings = res["hash_mappings"]

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(res["text_anonimizado"])
        print(f"[SUCCESS] Texto anonimizado guardado en: {output_path}")

    if args.export_hashes and all_mappings:
        export_path = Path(args.export_hashes)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(all_mappings, f, ensure_ascii=False, indent=2)
        print(f"[SUCCESS] Diccionario de hashes exportado en: {export_path}")


if __name__ == "__main__":
    main()
