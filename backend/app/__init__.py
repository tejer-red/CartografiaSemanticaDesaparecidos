# Tejer.Red Cartografia Semantica API
import sys, types

# Compatibilidad Docker / Local: permitir 'import backend.app' cuando uvicorn arranca como 'app.main:app'
if 'backend' not in sys.modules:
    _backend_mod = types.ModuleType('backend')
    _backend_mod.app = sys.modules[__name__]
    sys.modules['backend'] = _backend_mod
    sys.modules['backend.app'] = sys.modules[__name__]
