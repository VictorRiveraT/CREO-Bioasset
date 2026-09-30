# -*- coding: utf-8 -*-
import os
import re

exact_replacements = {
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã\xad': 'í',
    'Ã±': 'ñ',
    'Ã‘': 'Ñ',
    'Ã\x81': 'Á',
    'Ã\x89': 'É',
    'Ã\x8d': 'Í',
    'Ã\x93': 'Ó',
    'Ã\x9a': 'Ú',
    'Ã\x8f': 'Ï',
    'Ã\xbf': 'ÿ',
    'Â': '', 
}

word_replacements = {
    'Catlogo': 'Catálogo',
    'Cdigo': 'Código',
    'Descripcin': 'Descripción',
    'Asignacin': 'Asignación',
    'Creacin': 'Creación',
    'Configuracin': 'Configuración',
    'Mdulo': 'Módulo',
    'Ttulo': 'Título',
    'Da': 'Día',
    'ms': 'más',
    'Aadir': 'Añadir',
    'Histrico': 'Histórico',
    'automticamente': 'automáticamente',
    'elctrico': 'eléctrico',
    'Vlido': 'Válido',
    'electrnico': 'electrónico',
    'an': 'aún',
    'vlida': 'válida',
    'Estadsticas': 'Estadísticas',
    'Gestin': 'Gestión',
    'prxima': 'próxima',
    'ltima': 'última',
    'ltimo': 'último',
    'Ubicacin': 'Ubicación',
    'xito': 'éxito',
    'bsqueda': 'búsqueda',
    'biomdico': 'biomédico',
    'Biomdico': 'Biomédico',
    'mdico': 'médico',
    'Mdico': 'Médico',
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        
        # Exact string replacements for mojibake
        for bad, good in exact_replacements.items():
            new_content = new_content.replace(bad, good)
            
        # Word boundary replacements for missing accented characters
        for bad, good in word_replacements.items():
            new_content = re.sub(rf'\b{bad}\b', good, new_content)
            
        # Special case for "Ãrea" (since regex \b might not work well with non-ascii Ã)
        new_content = new_content.replace('Ãrea', 'Área')
        new_content = new_content.replace('Ã rea', 'Área')
        new_content = new_content.replace('Ã', 'Á') # Careful with this one
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filepath}")
    except Exception as e:
        pass

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.json'):
            fix_file(os.path.join(root, file))

for root, dirs, files in os.walk('services'):
    for file in files:
        if file.endswith('.cs') or file.endswith('.json'):
            fix_file(os.path.join(root, file))

print("Done")
