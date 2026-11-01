import json,sys,re,os,glob
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
ALLOWED={'Base game','Shadow of the Erdtree','Tarnished Pack','Base game + Shadow of the Erdtree'}
PATS=(r'\[\[',r'\]\]',r'\{\{',r'\}\}',r"'''",r'<(?:span|div|br|ref|tabber|gallery|sup|small|u|center)\b',r'&(?:nbsp|amp|quot);',r'^ru:',r'Category:',r'\bFile:',r'^\|-\|')
summary={}
for f in sorted(glob.glob(os.path.join(sys.argv[1],'*.json'))):
    d=json.load(open(f,encoding='utf-8'))
    key=[k for k in d if k!='metadata'][0]; E=d[key]
    src=Counter(e.get('source') for e in E)
    bad=[s for s in src if s not in ALLOWED]
    mk=Counter(); ex={}
    def walk(o,p):
        if isinstance(o,dict):
            for k,v in o.items(): walk(v,p+'.'+k)
        elif isinstance(o,list):
            for v in o: walk(v,p)
        elif isinstance(o,str):
            for pat in PATS:
                if re.search(pat,o,re.M): mk[pat]+=1; ex.setdefault(pat,(p,o[:100]))
    for e in E: walk(e,e.get('name') or e.get('title') or '?')
    enc=sum(len(e.get('encounters',[])) for e in E)
    summary[os.path.basename(f)]=(len(E),dict(src))
    print(f"{os.path.basename(f):32} {key:10} n={len(E):4}{' enc='+str(enc) if enc else ''} sources={dict(src)} {'BAD SOURCES '+str(bad) if bad else ''} markup={dict(mk) if mk else 'none'}")
    for k,v in list(ex.items())[:3]: print('      e.g.',k,v)
json.dump(summary,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
