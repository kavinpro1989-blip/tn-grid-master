import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

with open('engine.js', 'r', encoding='utf-8') as f:
    engine = f.read()

with open('ui.js', 'r', encoding='utf-8') as f:
    ui = f.read()

# Replace <link rel="stylesheet" href="styles.css"> with <style> ... </style>
html_standalone = re.sub(
    r'\s*<link\s+rel=["\']stylesheet["\']\s+href=["\']styles\.css["\']\s*>',
    f'\n  <style>\n{css}\n  </style>',
    html
)

# Clean export and import
engine_clean = re.sub(r'export\s+class\s+PowerGridEngine', 'class PowerGridEngine', engine)
engine_clean = re.sub(r'export\s+class\s+GridSimulationEngine', 'class GridSimulationEngine', engine_clean)
engine_clean = re.sub(r'export\s+', '', engine_clean)
ui_clean = re.sub(r'import\s+[^;]+;?', '// inlined module import', ui)

# Replace script tags with inlined combined script
script_pattern = r'\s*<script\s+type=["\']module["\']\s+src=["\']engine\.js["\']\s*></script>\s*<script\s+type=["\']module["\']\s+src=["\']ui\.js["\']\s*></script>'
combined_script = f'\n  <script>\n{engine_clean}\n\n{ui_clean}\n  </script>'

html_standalone = re.sub(script_pattern, combined_script, html_standalone)

with open('standalone_simulation.html', 'w', encoding='utf-8') as f:
    f.write(html_standalone)

print('Successfully generated standalone_simulation.html! Length:', len(html_standalone))
