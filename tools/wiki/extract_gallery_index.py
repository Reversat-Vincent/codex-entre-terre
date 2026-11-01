"""Index every item of the rendered 'All Items (Gallery)' page: (section h2, subsection h3, name, DLC marker).
Usage: extract_gallery_index.py <gallery_html.json> <out.json>"""
import html
import json
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
page = json.load(open(sys.argv[1], encoding="utf-8"))["parse"]["text"]["*"]

token_re = re.compile(
    r'<h(?P<lvl>[23])[^>]*>.*?<span class="mw-headline" id="[^"]*">(?P<head>.*?)</span>'
    r'|<div class="gallerytext">(?P<gt>.*?)</div>', re.S)
h2 = h3 = None
items, seen = [], set()
for m in token_re.finditer(page):
    if m.group("lvl"):
        head = html.unescape(re.sub(r"<.*?>", "", m.group("head"))).strip()
        if m.group("lvl") == "2":
            h2, h3 = head, None
        else:
            h3 = head
        continue
    links = re.findall(r'<a href="/wiki/([^"]+)"[^>]*?\stitle="([^"]+)"', m.group("gt"))
    if not links:
        continue
    href, title = links[0]
    title = html.unescape(title)
    markers = [html.unescape(t) for _, t in links[1:]]
    source = "Base game"
    if "Elden Ring: Shadow of the Erdtree" in markers:
        source = "Shadow of the Erdtree"
    elif "Tarnished Pack" in markers:
        source = "Tarnished Pack"
    key = (h2, h3, title)
    if key in seen:
        continue
    seen.add(key)
    items.append({"name": title, "section": h2, "subsection": h3, "category": h3 or h2,
                  "source": source, "url": "https://eldenring.wiki.gg/wiki/" + href})

json.dump(items, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(items), "items")
for (s, sub), n in Counter((i["section"], i["subsection"]) for i in items).items():
    dl = Counter(i["source"] for i in items if i["section"] == s and i["subsection"] == sub)
    print(f"  {s} / {sub}: {n}  {dict(dl)}")
