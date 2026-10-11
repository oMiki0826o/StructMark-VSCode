#!/usr/bin/env python3
"""Create two source archives; reject cache and secret files."""
from pathlib import Path
import zipfile, hashlib, json
root=Path(__file__).resolve().parents[1]
out=root.parent
exclude={'node_modules','.git','dist','.next','__pycache__','.env','.env.local'}
def add(z,path,arc):
    for file in sorted(path.rglob('*')):
        if not file.is_file() or any(part in exclude for part in file.relative_to(path).parts): continue
        if file.is_symlink() or file.name.endswith(('.pem','.key')): continue
        z.write(file,str(Path(arc)/file.relative_to(path)))
full=out/'StructMark-v1.6.0-Full-Source.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:add(z,root,'StructMark-v1.6.0')
vscode=out/'StructMark-VSCode-v1.6.0.zip'
with zipfile.ZipFile(vscode,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for sub in ('packages/vscode','packages/language-server','src'):
        add(z,root/sub,'StructMark-VSCode-v1.6.0/'+sub)
    for name in ('package.json','package-lock.json','tsconfig.json','README.md','LICENSE'):
        z.write(root/name,'StructMark-VSCode-v1.6.0/'+name)
for path in (full,vscode):
    with zipfile.ZipFile(path) as z:assert z.testzip() is None
(out/'StructMark-v1.6.0-SHA256.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in (full,vscode)))
print(full, vscode)
