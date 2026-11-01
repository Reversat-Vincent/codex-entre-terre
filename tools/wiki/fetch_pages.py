"""Fetch the wikitext of many wiki pages via the MediaWiki API, 50 titles per request.
Usage: fetch_pages.py <titles.json (list of str)> <out.json>
Output: {"pages": {requested_title: {"resolved": title, "content": wikitext or None}}}"""
import json
import io
import sys
import time
import urllib.parse
import urllib.request

API = "https://eldenring.wiki.gg/api.php"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) EldenRingWeaponResearch/1.0"

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
titles = json.load(open(sys.argv[1], encoding="utf-8"))
out_path = sys.argv[2]


def query(batch):
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "formatversion": "2",
        "redirects": "1",
        "titles": "|".join(batch),
    }
    req = urllib.request.Request(API, data=urllib.parse.urlencode(params).encode(),
                                 headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - retry on any network error
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("request failed")


result = {}
for start in range(0, len(titles), 50):
    batch = titles[start:start + 50]
    data = query(batch)["query"]
    # map requested -> normalized -> redirect target
    mapping = {t: t for t in batch}
    norm = {n["from"]: n["to"] for n in data.get("normalized", [])}
    redir = {r["from"]: r["to"] for r in data.get("redirects", [])}
    pages = {p["title"]: p for p in data["pages"]}
    for t in batch:
        cur = norm.get(t, t)
        cur = redir.get(cur, cur)
        p = pages.get(cur)
        content = None
        if p and "revisions" in p:
            content = p["revisions"][0]["slots"]["main"]["content"]
        result[t] = {"resolved": cur, "content": content}
    print(f"fetched {start + len(batch)}/{len(titles)}", file=sys.stderr)
    time.sleep(1.5)

json.dump({"pages": result}, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
missing = [t for t, v in result.items() if v["content"] is None]
print("missing:", missing)
