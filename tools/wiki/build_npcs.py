"""NPCs: list from the wiki 'NPCs' page (galleries grouped by region), details from each NPC page.

Usage:
  build_npcs.py list <hubs.json> <out_index.json>
  build_npcs.py build <npc_index.json> <npc_pages.json> <out.json>
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

if mode == "list":
    hubs = {p["title"]: p["revisions"][0]["slots"]["main"]["content"]
            for p in json.load(open(sys.argv[2], encoding="utf-8"))["query"]["pages"] if "revisions" in p}
    c = wp.strip_comments(hubs["NPCs"])
    critical = OrderedDict()
    crit = re.search(r"==\s*Critical NPC Quick-Reference\s*==(.*?)\n==[^=]", c, re.S)
    for line in (crit.group(1) if crit else "").split("\n"):
        m = re.match(r"^\*\s*(.*)", line)
        if m:
            lk = re.search(r"\[\[([^\]|#]+)", m.group(1))
            if lk:
                critical[lk.group(1).strip()] = wp.clean(m.group(1))
    body = c.split("List of All NPCs", 1)[1] if "List of All NPCs" in c else c
    region = subregion = None
    index = OrderedDict()
    for line in body.split("\n"):
        h = re.match(r"^(={3,})\s*(.*?)\s*={3,}\s*$", line)
        if h:
            name = wp.clean(h.group(2))
            if len(h.group(1)) == 3:
                region, subregion = name, None
            else:
                subregion = name
            continue
        if re.match(r"^==[^=]", line):
            region = subregion = None
            continue
        if "|" in line and region and not line.strip().startswith(("{", "}", "<")):
            lk = re.search(r"\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]", line)
            if lk:
                t = lk.group(1).strip()
                index.setdefault(t, {"title": t, "label": wp.clean(lk.group(2) or t), "region": region,
                                     "subregion": subregion, "critical_note": critical.get(t)})
    for t, note in critical.items():
        index.setdefault(t, {"title": t, "label": t, "region": None, "subregion": None, "critical_note": note})
    # extra NPCs from wiki categories (merchants, invaders, quest NPCs missing from the hub page)
    for cat_file in sys.argv[4:]:
        for m in json.load(open(cat_file, encoding="utf-8"))["query"]["categorymembers"]:
            t = m["title"]
            if t in ("Cooperators", "NPCs", "Nomadic Merchants", "Merchants", "Invaders"):
                continue
            index.setdefault(t, {"title": t, "label": t, "region": None, "subregion": None,
                                 "critical_note": critical.get(t), "from_category": os.path.basename(cat_file)})
    json.dump(list(index.values()), open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(index), "NPCs;", Counter(v["region"] for v in index.values()))
    sys.exit(0)

index = json.load(open(sys.argv[2], encoding="utf-8"))
pages = json.load(open(sys.argv[3], encoding="utf-8"))["pages"]
out_path = sys.argv[4]
LST_SOURCES = {}
if len(sys.argv) > 6:   # pages transcluded with {{#lst:...}} (merchant inventories)
    LST_SOURCES = {t: v["content"] for t, v in json.load(open(sys.argv[6], encoding="utf-8"))["pages"].items()
                   if v["content"]}
LOC_REGION, LOC_DLC = {}, {}
if len(sys.argv) > 5:   # locations dataset: sub-location -> region / DLC
    for loc in json.load(open(sys.argv[5], encoding="utf-8"))["locations"]:
        reg = re.sub(r"\s*\(.*\)$", "", re.sub(r"^Accessed via\s+", "", loc.get("region") or "")).strip()
        for key in {loc["name"], loc["wiki_page"]}:
            if reg:
                LOC_REGION[key] = reg
            LOC_DLC[key] = loc["source"] == "Shadow of the Erdtree"
LOC_RE = re.compile(r"(?<![\w'])(" + "|".join(sorted(map(re.escape, (k for k in LOC_REGION if len(k) > 4)),
                                                    key=len, reverse=True)) + r")(?![\w'])") if LOC_REGION else None


def regions_of(text):
    regs, dlc = [], []
    if LOC_RE:
        for m in LOC_RE.finditer(text or ""):
            r = LOC_REGION[m.group(1)]
            if r not in regs:
                regs.append(r)
                dlc.append(LOC_DLC.get(m.group(1), False))
    for r in wp.regions_in(text or ""):
        if r not in regs:
            regs.append(r)
            dlc.append(r in wp.DLC_REGIONS)
    return regs, dlc

SECTION_FIELDS = OrderedDict([
    ("overview", r"overview"), ("character_information", r"character information|basic info"),
    ("shop_inventory", r"shop inventory|shop|wares|merchandise|items sold|inventory"),
    ("equipment", r"equipment"), ("quest_items", r"quest items|rewards"),
    ("questline", r"questline progression|questline|quest|quest progression|quest line"),
    ("location_details", r"locations?"), ("notes", r"notes"),
])
npcs, seen = [], set()
for e in index:
    v = pages.get(e["title"])
    if not v or not v["content"] or v["resolved"] in seen:
        continue
    seen.add(v["resolved"])
    page = v["resolved"]
    c = wp.strip_comments(wp.resolve_lst(v["content"], LST_SOURCES))
    c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, c)
    box = next(wp.find_templates(c, r"Infobox[ _](?:Character|NPC|Enemy)[^|}\n]*"), None)
    p = wp.template_params(box[2]) if box else OrderedDict()
    n = OrderedDict()
    n["name"] = wp.clean(p.get("title", ""), page, br=" ") or page
    n["wiki_page"] = page
    n["url"] = wp.wiki_url(page)
    loc_text = wp.clean(p.get("location", ""), page, br="; ")
    regs, regs_dlc = regions_of(loc_text)
    if e["region"]:
        dlc = e["region"] in ("Realm of Shadow",) or (e["region"] in wp.DLC_REGIONS)
    elif regs_dlc:
        dlc = all(regs_dlc)
    else:
        dlc = None
    n["source"] = ("Shadow of the Erdtree" if dlc else "Base game") if dlc is not None else wp.dlc_from_intro(v["content"])
    n["listed_region"] = e["region"]
    n["regions"] = regs
    if e.get("subregion"):
        n["listed_subregion"] = e["subregion"]
    if e.get("critical_note"):
        n["critical_npc_note"] = e["critical_note"]
    info = OrderedDict((k, wp.value(val, page)) for k, val in p.items()
                       if k not in {"image", "image1", "title", "caption", "_positional", "position", "ost", "voice"}
                       and wp.value(val, page) is not None)
    n["infobox"] = info
    secs = wp.sections(c)
    intro = secs["_intro"]
    for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
        if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|quote|DISPLAYTITLE)", raw, re.I):
            intro = intro.replace(raw, "")
    n["summary"] = wp.clean(intro.split("<tabber>")[0], page) or None
    for field, rx in SECTION_FIELDS.items():
        lines, tabs = [], []
        for name, body in secs.items():
            if re.fullmatch(rx, name, re.I):
                lines += wp.bullets(body, page)
                tabs += wp.section_tables(body, page)
                rows = wp.shop_rows(body, page)
                if rows:
                    tabs.append(rows)
        if lines or tabs:
            n[field] = OrderedDict([("text", lines)] + ([("tables", tabs)] if tabs else [])) \
                if tabs else lines
    npcs.append(n)

meta = OrderedDict([
    ("source_page", "https://eldenring.wiki.gg/wiki/NPCs"),
    ("retrieved", "2026-10-31"),
    ("count", len(npcs)),
    ("counts_by_source", dict(Counter(x["source"] for x in npcs))),
    ("counts_by_listed_region", dict(Counter(x["listed_region"] for x in npcs))),
    ("field_notes", OrderedDict([
        ("source", "'Shadow of the Erdtree' for NPCs listed under 'Realm of Shadow' on the wiki NPCs page, else from the page intro."),
        ("listed_region / listed_subregion", "Heading under which the NPC appears on the wiki NPCs page (where they are first met)."),
        ("critical_npc_note", "Present for the NPCs of the wiki 'Critical NPC Quick-Reference' list."),
        ("shop_inventory / equipment / quest_items", "Section text and tables (item, price, availability...) from the NPC page."),
        ("questline", "Questline Progression section (step-by-step quest), when the NPC has one."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("npcs", npcs)]), open(out_path, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("npcs:", len(npcs), meta["counts_by_source"])
