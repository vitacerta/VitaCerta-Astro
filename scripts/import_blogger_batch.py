#!/usr/bin/env python3
from __future__ import annotations
import html, json, os, re, unicodedata, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path
from sanitize_blogger_html import sanitize_blogger_html

FEED='https://vitacerta.blogspot.com/feeds/posts/default?alt=atom&max-results=500'
OUT=Path('src/content/posts/migrados')
NS={'a':'http://www.w3.org/2005/Atom'}
TARGETS={s for s in os.environ.get('BATCH_SLUGS','').split(',') if s}
BATCH_LIMIT=int(os.environ.get('BATCH_LIMIT','0') or '0')

def slugify(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return (re.sub(r'[^a-z0-9]+','-',s).strip('-')[:90] or 'artigo')

def section(labels,title):
    t=title.lower(); x=(' '.join(labels+[title])).lower()
    if 'creatina' in t: return 'Nutrição'
    if 'pernas' in t and ('pesad' in t or 'circula' in t): return 'Saúde'
    mente=['sono','dormindo','ansiedade','depress','tdah','pânico','panico','estresse','procrastina','meditação','meditacao','saúde mental','saude mental','terapia','cérebro','cerebro','foco','mau humor']
    movimento=['atividade física','atividade fisica','exercício','exercicio','treino','caminh','corrida','movimento','academia','dança','danca','alongamento','passos por dia','bicicleta','tempo sentado']
    longevidade=['longevid','envelhe','autonomia','menopausa','depois dos 40','após os 40','apos os 40']
    nutricao=['nutri','alimenta','dieta','suplement','creatina','vitamina','proteína','proteina','whey','magnésio','magnesio','ômega-3','omega-3','ferro','zinco','marmita','açúcar','acucar','jejum','café da manhã','cafe da manha','frutas vermelhas','chá',' cha ','saciedade','fome']
    for sec,terms in [('Mente',mente),('Nutrição',nutricao),('Movimento',movimento),('Longevidade',longevidade)]:
        if any(k in t for k in terms): return sec
    for sec,terms in [('Mente',mente),('Nutrição',nutricao),('Movimento',movimento),('Longevidade',longevidade)]:
        if any(k in x for k in terms): return sec
    return 'Saúde'

def description(body):
    txt=re.sub('<[^>]+>',' ',body)
    txt=re.sub(r'\s+',' ',html.unescape(txt)).strip()
    if len(txt)<=160: return txt
    return txt[:157].rsplit(' ',1)[0]+'…'

def main():
    if not TARGETS and BATCH_LIMIT <= 0:
        raise SystemExit('Informe BATCH_SLUGS ou BATCH_LIMIT')
    req=urllib.request.Request(FEED,headers={'User-Agent':'VitaCerta-Astro-Migrator/1.0'})
    raw=urllib.request.urlopen(req,timeout=30).read()
    root=ET.fromstring(raw); OUT.mkdir(parents=True,exist_ok=True)
    found=set(); selected=0
    for e in root.findall('a:entry',NS):
        title=(e.findtext('a:title',default='',namespaces=NS) or '').strip()
        body=(e.findtext('a:content',default='',namespaces=NS) or '').strip()
        if not title or not body: continue
        cats=[c.attrib.get('term','') for c in e.findall('a:category',NS)]
        kind=[c for c in cats if c.startswith('http://schemas.google.com/blogger/2008/kind#')]
        if kind and not any(c.endswith('#post') for c in kind): continue
        slug=slugify(title)
        target_path=OUT/f'{slug}.md'
        if TARGETS:
            if slug not in TARGETS: continue
        else:
            if target_path.exists(): continue
            if selected >= BATCH_LIMIT: break
        labels=[c for c in cats if not c.startswith('http://schemas.google.com/')]
        pub=e.findtext('a:published',default='',namespaces=NS) or ''
        upd=e.findtext('a:updated',default='',namespaces=NS) or pub
        body=sanitize_blogger_html(body)
        front={
            'title':title,'description':description(body),'pubDatetime':pub,
            'modDatetime':upd,'category':section(labels,title),'tags':labels,
            'canonicalURL':f'https://vitacerta.com.br/conteudos/{slug}/'
        }
        lines=['---']+[f'{k}: {json.dumps(v,ensure_ascii=False)}' for k,v in front.items()]+['---','',body,'']
        target_path.write_text('\n'.join(lines),encoding='utf-8')
        found.add(slug); selected += 1
    if TARGETS:
        missing=TARGETS-found
        if missing: raise SystemExit('Não encontrados no feed: '+', '.join(sorted(missing)))
    elif selected != BATCH_LIMIT:
        raise SystemExit(f'Solicitados {BATCH_LIMIT}, mas apenas {selected} artigos pendentes foram encontrados')
    print(f'Importados {len(found)} artigos')

if __name__=='__main__': main()
