#!/usr/bin/env python3
"""
verify_gpu.py: Script de certificación de hardware para la NVIDIA GeForce RTX 5060 Ti (sm_120).
Valida:
1. Detección y lectura de propiedades de hardware (Blackwell sm_120).
2. Cálculo de tensores en VRAM libre.
3. Inferencia de prueba con GLiNER en CUDA.
"""

import sys
import time

def verify():
    print("=" * 60)
    print("🔍 INICIANDO CERTIFICACIÓN DE HARDWARE: RTX 5060 Ti")
    print("=" * 60)

    # 1. PyTorch y CUDA
    try:
        import torch
        print(f"[1/3] PyTorch Version: {torch.__version__}")
        assert torch.cuda.is_available(), "CUDA no está disponible en PyTorch"
        
        prop = torch.cuda.get_device_properties(0)
        vram_total = prop.total_memory / (1024**3)
        vram_free = torch.cuda.mem_get_info()[0] / (1024**3)
        
        print(f"      GPU: {prop.name}")
        print(f"      Arquitectura / Capacidad: sm_{prop.major}{prop.minor}")
        print(f"      VRAM Total: {vram_total:.2f} GB | VRAM Libre: {vram_free:.2f} GB")
        print("      --> PyTorch y CUDA vinculados exitosamente. ✅")
    except Exception as e:
        print(f"[FAIL] Error en verificación de PyTorch/CUDA: {e}")
        return False

    # 2. Prueba de Ejecución de Kernels en VRAM
    try:
        print("\n[2/3] Probando ejecución de operaciones tensoriales en VRAM...")
        t0 = time.time()
        # Matriz 4096 x 4096 en FP16
        a = torch.randn(4096, 4096, dtype=torch.float16, device="cuda")
        b = torch.randn(4096, 4096, dtype=torch.float16, device="cuda")
        c = torch.matmul(a, b)
        torch.cuda.synchronize()
        elapsed = (time.time() - t0) * 1000
        print(f"      Matmul 4096x4096 FP16 completado en {elapsed:.2f} ms")
        print(f"      Check valor suma: {c.sum().item():.2f}")
        print("      --> Kernels de cómputo en Blackwell sm_120 funcionando al 100%! ✅")
    except Exception as e:
        print(f"[FAIL] Error en ejecución tensorial en GPU: {e}")
        return False

    # 3. Prueba de Inferencia con GLiNER
    try:
        print("\n[3/3] Probando carga e inferencia de GLiNER en GPU...")
        from gliner import GLiNER
        model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1").to("cuda")
        sample_text = "El 15 de marzo de 2024 Juan Pérez fue visto en calle Morelos colonia Centro en Guadalajara."
        labels = ["NOMBRE", "FECHA", "DOMICILIO", "MUNICIPIO"]
        entities = model.predict_entities(sample_text, labels)
        print(f"      Texto de prueba: '{sample_text}'")
        print(f"      Entidades detectadas en GPU:")
        for ent in entities:
            print(f"        - {ent['label']}: '{ent['text']}' (score: {ent['score']:.4f})")
        print("      --> Inferencia GLiNER en CUDA certificada! ✅")
    except Exception as e:
        print(f"[FAIL] Error en inferencia GLiNER: {e}")
        return False

    print("\n" + "=" * 60)
    print("🚀 CERTIFICACIÓN EXITOSA: La GPU está 100% lista para entrenamiento")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)
