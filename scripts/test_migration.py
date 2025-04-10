#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para probar la migración de datos históricos a MongoDB

Este script permite realizar una migración de prueba usando:
- Un subconjunto representativo de datos (muestra)
- Validación de integridad entre el Excel original y MongoDB
- Análisis de la calidad de los datos migrados

Uso:
    python scripts/test_migration.py output/data.xlsx --sample 20
"""

import os
import sys
import random
import argparse
import logging
import json

print("🟢 Iniciando test de migración desde Excel...")

# Verifica que el archivo existe
if not os.path.exists(sys.argv[1]):
    print(f"❌ El archivo Excel no fue encontrado: {sys.argv[1]}")
    sys.exit(1)