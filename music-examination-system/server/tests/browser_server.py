"""Isolated synthetic test fixture. Never run this against production data."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from test_portal import Harness, PASSWORD
from app import create_app

root=Path(__file__).resolve().parents[2]/'qa'/'portal'
root.mkdir(parents=True,exist_ok=True)
import tempfile
data=Path(tempfile.mkdtemp(prefix='music-portal-qa-'))
app=create_app({'DATABASE':str(data/'test.sqlite'),'UPLOAD_FOLDER':str(data/'media')})
h=Harness(app)
student=h.account(); parent=h.account('parent'); admin=h.staff('admin'); teacher,selection=h.catalog(3)
for s,name in zip(selection,['Mridangam','Vocal','Violin']): h.sql('UPDATE subjects SET name=? WHERE id=?',(name,s['subject_id']))
(root/'fixture.json').write_text(json.dumps({'student':student['email'],'parent':parent['email'],'admin':admin['email'],'teachers':[t['email'] for t in teacher],'password':PASSWORD,'subjects':selection}))
from PIL import Image,ImageDraw
im=Image.new('RGB',(400,400),'#dce5d5'); draw=ImageDraw.Draw(im); draw.ellipse((140,60,260,180),fill='#587665'); draw.rounded_rectangle((70,200,330,390),60,fill='#587665'); im.save(root/'candidate.png')
im=Image.new('RGB',(400,140),'white'); ImageDraw.Draw(im).text((25,55),'Candidate Signature',fill='black'); im.save(root/'signature.png')
app.run(host='127.0.0.1',port=5000,debug=False)
