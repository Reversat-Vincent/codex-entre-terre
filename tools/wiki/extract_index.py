"""Extract the weapon list (category + page title + DLC marker) from the rendered
Melee Armaments page (API parse output). Usage: extract_index.py <melee_html.json> <out.json>"""
import html
import json
import re
import sys
from urllib.parse import unquote

src, out = sys.argv[1], sys.argv[2]
page = json.load(open(src, encoding="utf-8"))["parse"]["text"]["*"]

# Split on h3 headings (one per weapon class). Stop at the HTML comment / end of list.
parts = re.split(r'<h3><span class="mw-headline" id="([^"]+)">(.*?)</span>', page)
# parts = [before, id1, title1, body1, id2, title2, body2, ...]
index = []
seen = set()
for i in range(1, len(parts), 3):
    category = html.unescape(re.sub(r"<.*?>", "", parts[i + 1])).strip()
    body = parts[i + 2]
    for m in re.finditer(r'<div class="gallerytext">(.*?)</div>', body, re.S):
        links = re.findall(r'<a href="/wiki/([^"]+)"[^>]*?\stitle="([^"]+)"', m.group(1))
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
        key = (category, title)
        if key in seen:
            continue
        seen.add(key)
        index.append({
            "name": title,
            "category": category,
            "source": source,
            "url": "https://eldenring.wiki.gg/wiki/" + href,
        })

json.dump(index, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(index), "weapons")
print(Counter(w["category"] for w in index))
print(Counter(w["source"] for w in index))
dups = Counter(w["name"] for w in index)
print("names in several categories:", [n for n, c in dups.items() if c > 1])
