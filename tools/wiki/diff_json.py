import json,sys
sys.stdout.reconfigure(encoding='utf-8')
a=json.load(open(sys.argv[1],encoding='utf-8')); b=json.load(open(sys.argv[2],encoding='utf-8'))
def flat(o,p=''):
    if isinstance(o,dict):
        for k,v in o.items(): yield from flat(v,p+'.'+k)
    elif isinstance(o,list):
        if all(not isinstance(x,(dict,list)) for x in o): yield p,json.dumps(o,ensure_ascii=False)
        else:
            for i,v in enumerate(o): yield from flat(v,f'{p}[{i}]')
    else: yield p,o
A={w['name']:dict(flat(w)) for w in a['weapons']}; B={w['name']:dict(flat(w)) for w in b['weapons']}
print('weapons only in old:',set(A)-set(B),'only in new:',set(B)-set(A))
n=0
for name in A:
    da,db=A[name],B.get(name,{})
    keys=sorted(set(da)|set(db))
    ch=[(k,da.get(k,'<absent>'),db.get(k,'<absent>')) for k in keys if da.get(k,'<absent>')!=db.get(k,'<absent>')]
    if ch:
        n+=1; print('##',name)
        for k,x,y in ch: print(f'   {k}: {str(x)[:90]!r} -> {str(y)[:90]!r}')
print('weapons changed:',n)
ma={k:v for k,v in a['metadata'].items()}; mb={k:v for k,v in b['metadata'].items()}
print('metadata keys changed:',[k for k in set(ma)|set(mb) if ma.get(k)!=mb.get(k)])
