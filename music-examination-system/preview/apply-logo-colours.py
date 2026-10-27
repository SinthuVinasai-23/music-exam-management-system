from pathlib import Path
import re, colorsys, json
root=Path('src'); changes={}
def recolour(token):
    h=token[1:];h=''.join(c*2 for c in h) if len(h)==3 else h
    if len(h)!=6:return token
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    hue,light,sat=colorsys.rgb_to_hls(r,g,b);deg=hue*360
    if 18<=deg<=78 and sat>.09:
        if light>.84: target=(0,light,min(sat*.35,.3))
        elif light<.23: target=(0,light,min(sat,.12))
        else: target=(0,light,min(.92,max(.6,sat)))
    elif 195<=deg<=255 and sat>.25: target=(278/360,light,min(sat,.72))
    else:return token
    rgb=colorsys.hls_to_rgb(*target);new='#'+''.join(f'{round(v*255):02x}' for v in rgb)
    changes[token.lower()]=new
    return new
for p in root.rglob('*'):
    if p.suffix not in {'.css','.jsx'}:continue
    try: s=p.read_text(encoding='utf-8')
    except UnicodeDecodeError: s=p.read_text(encoding='cp1252')
    old=s
    if p.suffix=='.css':
        def block(m):
            selector,body=m.group(1),m.group(2)
            if re.search(r'\b(warning|pending|success|approved|rejected|fail|error|danger|pass)\b',selector,re.I):return m.group(0)
            body=re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',lambda v:recolour(v[0]),body)
            def rgba(v):
                nums=[int(v[i]) for i in (2,3,4)]
                token='#'+''.join(f'{n:02x}' for n in nums);new=recolour(token)
                if new==token:return v[0]
                rgb=[int(new[i:i+2],16) for i in (1,3,5)]
                return v[1]+'('+', '.join(map(str,rgb))+v[5]+')'
            body=re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)([^)]*)\)',rgba,body)
            return selector+'{'+body+'}'
        s=re.sub(r'([^{}]+)\{([^{}]*)\}',block,s)
    else:
        s=re.sub(r'#[0-9a-fA-F]{6}\b',lambda v:recolour(v[0]),s)
    if s!=old:p.write_text(s,encoding='utf-8')
p=Path('auth-server/portal-pdf.mjs');s=p.read_text();s=re.sub(r'#[0-9a-fA-F]{6}\b',lambda v:recolour(v[0]),s);p.write_text(s)
Path('preview/logo-colour-map.json').write_text(json.dumps(changes,indent=2))
print('Updated brand shades:',len(changes))

