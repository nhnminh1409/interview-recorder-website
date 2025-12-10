@powershell -NoProfile -ExecutionPolicy Bypass -Command "py -3 -c \"import pandas as pd; exec(open('generate_tokens.py', encoding='utf-8').read())\""
@pause