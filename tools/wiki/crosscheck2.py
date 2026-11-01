import json,sys,re
sys.stdout.reconfigure(encoding='utf-8')
P=json.load(open(sys.argv[1],encoding='utf-8'))['pages']
W=json.load(open(sys.argv[2],encoding='utf-8'))['weapons']
fields={'physical_power':('attack_power','physical'),'magic_power':('attack_power','magic'),'fire_power':('attack_power','fire'),
        'holy_power':('attack_power','holy'),'lightning_power':('attack_power','lightning'),'critical':('attack_power','critical'),
        'weight':('weight',None),'str_req':('requirements','str'),'dex_req':('requirements','dex'),'int_req':('requirements','int'),
        'fai_req':('requirements','fai'),'arc_req':('requirements','arc'),'str_scale':('scaling','str'),'dex_scale':('scaling','dex'),
        'int_scale':('scaling','int'),'fai_scale':('scaling','fai'),'arc_scale':('scaling','arc'),'guard_boost':('guarded_damage_negation','guard_boost'),'range':('range',None),'sorcery_scaling':('sorcery_scaling',None),'incant_scaling':('incantation_scaling',None)}
mism=[]; checked=0
for w in W:
    c=P[w['wiki_page']]['content']
    for f,(a,b) in fields.items():
        m=re.search(r'\|\s*'+f+r'\s*=\s*([^|\n}]*)',c)
        if not m: continue
        raw=m.group(1).strip().replace(',','')
        got=(w.get(a) if b is None else w[a][b])
        checked+=1
        if f.endswith('_scale'):
            exp=raw if re.fullmatch(r'[SABCDE]',raw) else None
        else:
            try: exp=float(raw)
            except: exp=None
            if f.endswith('_req') and exp is None: exp=0.0
            got=None if got is None else float(got)
        if exp!=got: mism.append((w['name'],f,repr(raw),got))
print('checked values:',checked,'mismatches:',len(mism))
for x in mism[:30]: print('  ',x)
