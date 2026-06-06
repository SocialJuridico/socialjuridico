with open(r"e:\Documentos\Alura\cliente\Carlos\SJ\socialjuridico\src\app\dashboard\advogado\page.js", "r", encoding="utf-8") as f:
    lines = f.readlines()
    
# Print around line 4873
for i in range(4865, 4880):
    if i < len(lines):
        print(f"{i+1}: {lines[i].strip()}")
