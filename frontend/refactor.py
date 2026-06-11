import os
import re

src_dir = '/home/abundis/comision/CartografiaSemanticaDesaparecidos/frontend/src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            if 'utils/logger.js' in filepath:
                continue
                
            with open(filepath, 'r') as f:
                content = f.read()
                
            if 'console.' in content:
                # Determine relative path to utils/logger.js
                rel_dir = os.path.relpath(src_dir, root)
                if rel_dir == '.':
                    import_path = './utils/logger'
                else:
                    import_path = f"{rel_dir}/utils/logger"
                
                # We need to make sure the import is not already there
                if 'createLogger' not in content:
                    component_name = file.split('.')[0]
                    
                    # Replace console.log|warn|error|info with logger.x
                    new_content = re.sub(r'console\.(log|warn|error|info|debug)', r'logger.\1', content)
                    
                    # Find last import to inject our import and logger instantiation
                    imports = list(re.finditer(r'^import .*?;?\n', new_content, re.MULTILINE))
                    if imports:
                        last_import = imports[-1]
                        insert_pos = last_import.end()
                    else:
                        insert_pos = 0
                        
                    injection = f"\nimport createLogger from '{import_path}';\nconst logger = createLogger('{component_name}');\n\n"
                    final_content = new_content[:insert_pos] + injection + new_content[insert_pos:]
                    
                    with open(filepath, 'w') as f:
                        f.write(final_content)
                    print(f"Updated {file}")
