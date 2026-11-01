"""Locations: candidates listing and builder.

Usage:
  build_locations.py candidates <navboxes.json> <hubs.json> <out_titles.json> [<location_pages.json>]
  build_locations.py build <navboxes.json> <hubs.json> <location_pages.json> <out.json>
"""
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikiparse as wp  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
mode = sys.argv[1]
nav = {p["title"]: p["revisions"][0]["slots"]["main"]["content"]
       for p in json.load(open(sys.argv[2], encoding="utf-8"))["query"]["pages"] if "revisions" in p}
hubs = {p["title"]: p["revisions"][0]["slots"]["main"]["content"]
        for p in json.load(open(sys.argv[3], encoding="utf-8"))["query"]["pages"] if "revisions" in p}

NON_LOCATIONS = {"Sites of Grace", "Summoning Pools", "Divine Towers", "Minor Erdtree", "Erdtree", "Scadutree",
                 "Wandering Mausoleums", "Remembrance Duplication Coffins", "Lands Between", "Realm of Shadow",
                 "Dungeons", "Landmarks", "Points of Interest", "Great Undergound Rivers", "Locations"}

# ---- navbox groups: page -> (group region, dlc)
NAV_GROUP = OrderedDict()
c = nav["Template:Navbox Locations"]
for n, g in re.findall(r"\|\s*group(\d+)\s*=([^\n]*)", c):
    lst = re.search(r"\|\s*list" + n + r"\s*=(.*?)(?=\n\s*\|\s*(?:header|state|group|list)\d+|\n\}\})", c, re.S)
    region = wp.clean(wp.remove_files(g)).replace("Shadow of the Erdtree", "").strip()
    gdlc = bool(re.search(r"SOTE", g, re.I))
    for t in re.findall(r"\[\[([^\]|#]+)", g):
        if not t.strip().lower().startswith("file:"):
            NAV_GROUP.setdefault(t.strip(), (region, gdlc, "region page"))
    if not lst:
        continue
    for line in lst.group(1).split("\n"):
        legacy = "'''" in line
        for t in re.findall(r"\[\[([^\]|#]+)", line):
            t = t.strip()
            if t.lower().startswith(("file:", "category:")) or t in NON_LOCATIONS:
                continue
            NAV_GROUP.setdefault(t, (region, gdlc or bool(re.search(r"SOTE", line, re.I)),
                                     "legacy dungeon" if legacy else None))

loc_page = hubs["Locations"]
HUB_LINKS = [t.strip() for t in re.findall(r"\[\[([^\]|#]+)", loc_page)
             if not t.strip().lower().startswith(("file:", "category:")) and t.strip() not in NON_LOCATIONS]
DLC_HUB = set(re.findall(r"\[\[([^\]|#]+)", loc_page.split("The Realm of Shadow")[1].split("<!--")[0])) \
    if "The Realm of Shadow" in loc_page else set()

SUBLIST_SECTIONS = re.compile(r"^(sub-?regions|dungeons|landmarks|points of interest|locations|areas|sub-?areas|"
                              r"legacy dungeons|minor dungeons)$", re.I)


def entries(text, page=""):
    """Section content -> ordered unique entries (gallery captions, location infobox titles, bullets)."""
    out = []

    def add(x):
        x = x.strip(" ,;:")
        if x and x not in out:
            out.append(x)
    for g in re.findall(r"<gallery[^>]*>(.*?)</gallery>", text, re.S | re.I):
        for line in g.split("\n"):
            parts = [p.strip() for p in wp.split_top(line)]   # keep [[link|label]] / {{tpl|x}} intact
            if len(parts) < 2:
                continue
            cap = next((p for p in parts[1:] if not p.lower().startswith(("link=", "alt="))), "")
            lk = next((p[5:] for p in parts[1:] if p.lower().startswith("link=")), "")
            add(wp.clean(cap, page, br=" ") or wp.clean(lk))
    for _, _, raw in wp.find_templates(text, r"Infobox[ _]Location"):
        t = wp.template_params(raw).get("title")
        if t:
            add(wp.clean(t, page))
    body = re.sub(r"<gallery.*?</gallery>", "", text, flags=re.S | re.I)
    star_lines = [m.group(1) for m in re.finditer(r"^\s*\*(?!\*)\s*(.+)$", body, re.M)]
    if star_lines:
        for s in star_lines:          # top-level bullets only (sub-bullets are details)
            add(wp.clean(s, page))
    elif not out:                     # plain paragraphs only: keep them as text
        for b in wp.bullets(body, page):
            if not b.startswith("["):
                add(b)
    return out


def sublinks(text):
    out = []
    for g in re.findall(r"<gallery[^>]*>(.*?)</gallery>", text, re.S | re.I):
        out += re.findall(r"link=([^|\n]+)", g)
    out += re.findall(r"\[\[([^\]|#]+)", re.sub(r"<gallery.*?</gallery>", "", text, flags=re.S | re.I))
    return [o.strip() for o in out if not o.strip().lower().startswith(("file:", "category:"))]


if mode == "candidates":
    titles = list(dict.fromkeys(list(NAV_GROUP) + HUB_LINKS))
    if len(sys.argv) > 5:   # second round: sub-locations listed on already-fetched region pages
        pages = json.load(open(sys.argv[5], encoding="utf-8"))["pages"]
        have = set(pages) | {v["resolved"] for v in pages.values()}
        extra = []
        for t, v in pages.items():
            if not v["content"]:
                continue
            for name, body in wp.sections(wp.strip_comments(v["content"])).items():
                if SUBLIST_SECTIONS.match(name):
                    for s in sublinks(body):
                        if s not in have and s not in extra and s not in NON_LOCATIONS:
                            extra.append(s)
        titles = extra
    json.dump(titles, open(sys.argv[4], "w", encoding="utf-8"), ensure_ascii=False)
    print(len(titles), "titles")
    sys.exit(0)

# ---------------------------------------------------------------- build
pages = json.load(open(sys.argv[4], encoding="utf-8"))["pages"]
out_path = sys.argv[5]
by_res = OrderedDict()
for t, v in pages.items():
    if v["content"]:
        by_res.setdefault(v["resolved"], {"v": v, "requested": []})["requested"].append(t)

# parent region from region pages' sub-lists
PARENT = {}
for page, d in by_res.items():
    c = wp.strip_comments(d["v"]["content"])
    if not re.search(r"\{\{\s*Infobox[ _]Region", c, re.I):
        continue
    for name, body in wp.sections(c).items():
        if SUBLIST_SECTIONS.match(name):
            for s in sublinks(body):
                PARENT.setdefault(s, page)

KEEP_SECTIONS = OrderedDict([
    ("sites_of_grace", r"sites? of grace"), ("bosses", r"bosses|boss"), ("field_bosses", r"field bosses"),
    ("npcs", r"npcs?|characters"), ("enemies", r"enemies"), ("notable_loot", r"notable loot|loot|items|treasure"),
    ("crafting_materials", r"crafting materials|materials"), ("sub_regions", r"sub-?regions|sub-?areas|areas"),
    ("dungeons", r"dungeons|legacy dungeons|minor dungeons"), ("landmarks", r"landmarks"),
    ("points_of_interest", r"points of interest"), ("merchants", r"merchants?"), ("notes", r"notes"),
])

locs = []
for page, d in by_res.items():
    v = d["v"]
    c = wp.strip_comments(v["content"])
    c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, c)
    box = next(wp.find_templates(c, r"Infobox[ _](?:legacy[ _]dungeon|Dungeon|Region|Location|Landmark|Area|"
                                       r"Sub[ _]?region|Place)[^|}\n]*"), None)
    nav_info = None
    for t in [page] + d["requested"]:
        if t in NAV_GROUP:
            nav_info = NAV_GROUP[t]
            break
    in_hub = page in HUB_LINKS or any(t in HUB_LINKS for t in d["requested"])
    if not box and not nav_info and not in_hub:
        continue
    p = wp.template_params(box[2]) if box else OrderedDict()
    tname = re.match(r"\{\{\s*(?:Template:)?([^|\n}]+)", box[2]).group(1).strip().replace("_", " ") if box else None
    L = OrderedDict()
    L["name"] = wp.clean(p.get("title", ""), page, br=" ") or page
    L["wiki_page"] = page
    L["url"] = wp.wiki_url(page)
    kind = None
    if tname:
        kind = {"infobox legacy dungeon": "Legacy Dungeon", "infobox region": "Region",
                "infobox dungeon": "Dungeon"}.get(tname.lower(), tname.replace("Infobox", "").strip().title())
    if nav_info and nav_info[2] == "legacy dungeon":
        kind = "Legacy Dungeon"
    sub = wp.value(p.get("type"), page)
    L["kind"] = kind or ("Region" if nav_info and nav_info[2] == "region page" else
                         "Evergaol" if "Evergaol" in page else None)
    if sub and sub != L["kind"]:
        L["subtype"] = sub
    region = wp.value(p.get("region"), page)
    if isinstance(region, str):
        region = region.split(";")[0].strip()
    if not region and page in PARENT:
        region = PARENT[page]
    if not region and nav_info:
        region = nav_info[0] if nav_info[0] not in ("General Locations", "Outside the Mainland") else None
    if not region and L["kind"] == "Region":
        region = page
    L["region"] = region or None
    dlc = (nav_info[1] if nav_info else False) or page in DLC_HUB or (region in wp.DLC_REGIONS if region else False)
    L["source"] = "Shadow of the Erdtree" if dlc else wp.dlc_from_intro(v["content"])
    if nav_info:
        L["navbox_group"] = nav_info[0]
    info = OrderedDict((k, wp.value(val, page)) for k, val in p.items()
                       if k not in {"image", "image1", "image2", "title", "caption", "_positional", "position"}
                       and wp.value(val, page) is not None)
    if info:
        L["infobox"] = info
    secs = wp.sections(c)
    intro = secs["_intro"]
    for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
        if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|quote|DISPLAYTITLE)", raw, re.I):
            intro = intro.replace(raw, "")
    L["summary"] = wp.clean(intro.split("<tabber>")[0], page) or None
    ov = next((b for n, b in secs.items() if re.fullmatch(r"overview", n, re.I)), None)
    if ov:
        lines = wp.bullets(ov, page)
        if lines:
            L["overview"] = lines
    for field, rx in KEEP_SECTIONS.items():
        vals = []
        for name, body in secs.items():
            if re.fullmatch(rx, name, re.I):
                vals += [x for x in (wp.bullets(body, page) if field == "notes" else entries(body, page))
                         if x not in vals]
        if vals:
            L[field] = vals
    locs.append(L)

order = {"Region": 0, "Legacy Dungeon": 1}
locs.sort(key=lambda x: (x["source"] != "Base game", order.get(x["kind"], 2), x["region"] or "~", x["name"]))
meta = OrderedDict([
    ("source_pages", ["https://eldenring.wiki.gg/wiki/Locations", "https://eldenring.wiki.gg/wiki/Template:Navbox_Locations"]),
    ("retrieved", "2026-10-31"),
    ("count", len(locs)),
    ("counts_by_source", dict(Counter(x["source"] for x in locs))),
    ("counts_by_kind", dict(Counter(x["kind"] for x in locs))),
    ("field_notes", OrderedDict([
        ("source", "'Shadow of the Erdtree' when the wiki places the location in the Realm of Shadow (navbox group / Locations page / DLC region), else from the page intro."),
        ("kind / subtype", "From the page infobox (Region, Legacy Dungeon, Dungeon + its type such as Cave/Catacombs/Tunnel...)."),
        ("region", "Infobox 'region' field, else the region page listing it, else its Navbox Locations group."),
        ("sites_of_grace / bosses / npcs / enemies / notable_loot / ...", "Entries listed in the corresponding sections of the page (names, sometimes with a short condition)."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("locations", locs)]), open(out_path, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("locations:", len(locs), meta["counts_by_source"], meta["counts_by_kind"])
