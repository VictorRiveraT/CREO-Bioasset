# -*- coding: utf-8 -*-
with open('README.md', 'r', encoding='utf-8', errors='replace') as f:
    r = f.read()

import re
r = re.sub(r'Gesti.n', 'Gestión', r)
r = re.sub(r'Biom.dicos', 'Biomédicos', r)
r = re.sub(r'informaci.n', 'información', r)
r = re.sub(r'biom.dicos', 'biomédicos', r)
r = re.sub(r'instituci.n', 'institución', r)
r = re.sub(r'.reas principales', 'áreas principales', r)
r = re.sub(r'documentaci.n', 'documentación', r)
r = re.sub(r'aplicaci.n', 'aplicación', r)
r = re.sub(r'coordinaci.n', 'coordinación', r)
r = re.sub(r'dise.o', 'diseño', r)
r = re.sub(r'Cat.logo', 'Catálogo', r)
r = re.sub(r't.cnica', 'técnica', r)
r = re.sub(r'c.digos', 'códigos', r)
r = re.sub(r'b.sico', 'básico', r)
r = re.sub(r'pr.ximos', 'próximos', r)
r = re.sub(r'm.tricas', 'métricas', r)
r = re.sub(r'bit.cora', 'bitácora', r)
r = re.sub(r'C.mo', 'Cómo', r)
r = re.sub(r'est. orquestado', 'está orquestado', r)
r = re.sub(r'levantar.', 'levantará', r)
r = re.sub(r't.picamente', 'típicamente', r)
r = re.sub(r'est. ocupado', 'está ocupado', r)
r = re.sub(r'est. configurado', 'está configurado', r)
r = re.sub(r'ra.z', 'raíz', r)
r = re.sub(r'Aseg.rate', 'Asegúrate', r)

if "Actualización Reciente (Demo 1)" not in r:
    r += "\n\n## Actualización Reciente (Demo 1)\n\nSe ha estabilizado el sistema para la primera demostración oficial. Mejoras incluidas:\n- Soporte avanzado para múltiples accesos temporales por usuario.\n- Rediseño visual de las Alertas por correo (Light Theme + SendGrid).\n- Arreglo de codificación UTF-8 en todo el código base.\n- Fixes de consistencia en TypeScript para gestión de Marcas, Mantenimientos y Estado de los equipos.\n- Los acordeones de ubicaciones ahora inician plegados por defecto para mayor limpieza visual.\n"

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(r)
