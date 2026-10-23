import sys
import platform
import os
import subprocess

print("=== SYSTEM & HARDWARE INSPECTION ===")
print(f"Python Version: {sys.version}")
print(f"Executable: {sys.executable}")
print(f"Platform: {platform.platform()}")
print(f"Processor: {platform.processor()}")

try:
    import psutil
    mem = psutil.virtual_memory()
    print(f"Total RAM: {mem.total / (1024**3):.2f} GB")
    print(f"Available RAM: {mem.available / (1024**3):.2f} GB")
    print(f"Logical CPUs: {psutil.cpu_count(logical=True)}")
    print(f"Physical CPUs: {psutil.cpu_count(logical=False)}")
except ImportError:
    print("psutil not installed")

packages = [
    "torch", "torchvision", "transformers", "peft", "datasets", 
    "accelerate", "bitsandbytes", "trl", "qiskit", "qiskit_aer", 
    "fastapi", "uvicorn", "pydantic", "ollama", "jupyter", "IPython", 
    "numpy", "scipy", "docx", "pypdf", "fitz"
]

print("\n=== PACKAGE AVAILABILITY ===")
for pkg in packages:
    try:
        mod = __import__(pkg)
        ver = getattr(mod, "__version__", "installed")
        print(f"  {pkg:<15}: {ver}")
        if pkg == "torch":
            print(f"    CUDA Available: {mod.cuda.is_available()}")
            if mod.cuda.is_available():
                print(f"    CUDA Device: {mod.cuda.get_device_name(0)}")
            else:
                print("    Device: CPU only (No NVIDIA CUDA detected)")
    except ImportError:
        print(f"  {pkg:<15}: NOT INSTALLED")

print("\n=== OLLAMA SERVICE & MODEL CHECK ===")
try:
    res = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=5)
    print("Ollama CLI output:")
    print(res.stdout if res.stdout else res.stderr)
except Exception as e:
    print(f"Ollama check failed: {e}")
