"""Starting origins (classes). Usage: build_origins.py <titles.json> <origin_pages.json> <out.json>"""
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikiparse as wp  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
titles = json.load(open(sys.argv[1], encoding="utf-8"))
pages = json.load(open(sys.argv[2], encoding="utf-8"))["pages"]
ATTRS = ["vigor", "mind", "endurance", "strength", "dexterity", "intelligence", "faith", "arcane"]
DEF = ["physical", "vs_strike", "vs_slash", "vs_pierce", "magic", "fire", "lightning", "holy"]
RES = ["immunity", "robustness", "focus", "vitality"]


def equipment(text, page):
    groups, cur = OrderedDict(), "Other"
    for line in text.split("\n"):
        s = line.strip()
        if not s or s.startswith(("{{", "[[Category", "<")):
            continue
        m = re.match(r"^(\*+)\s*(.*)$", s)
        if not m:
            h = wp.clean(re.sub(r"^=+|=+$", "", s), page).rstrip(":. ")
            if h:
                cur = h
            continue
        item = wp.clean(m.group(2), page)
        if not item or item.lower() == "none":
            groups.setdefault(cur, [])
            continue
        if len(m.group(1)) > 1 and groups.get(cur):
            groups[cur][-1] += " + " + item          # e.g. Longbow + Arrow x20
        else:
            groups.setdefault(cur, []).append(item)
    return groups


origins = []
for t in titles:
    v = pages.get(t)
    if not v or not v["content"]:
        continue
    page = v["resolved"]
    c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, wp.strip_comments(v["content"]))
    box = next(wp.find_templates(c, r"Infobox[ _]Class"), None)
    p = wp.template_params(box[2]) if box else {}
    o = OrderedDict()
    o["name"] = wp.clean(p.get("title", ""), page) or page
    o["wiki_page"] = page
    o["url"] = wp.wiki_url(page)
    o["source"] = wp.dlc_from_intro(v["content"])
    o["level"] = wp.num(p.get("level"))
    o["attributes"] = OrderedDict((a, wp.num(p.get(a))) for a in ATTRS)
    o["base_stats"] = OrderedDict((k, wp.value(p.get(src), page)) for k, src in
                                  (("hp", "hp"), ("fp", "fp"), ("stamina", "stamina"), ("equip_load", "equip"),
                                   ("discovery", "discovery"), ("poise", "poise")))
    o["defense"] = OrderedDict((k.replace("vs_", ""), wp.value(p.get("defense_" + k))) for k in DEF)
    o["damage_negation"] = OrderedDict((k.replace("vs_", ""), wp.value(p.get("negation_" + k))) for k in DEF)
    o["resistance"] = OrderedDict((k, OrderedDict((part, wp.value(p.get(f"{part}_{k}")))
                                                  for part in ("base", "equipment", "total")
                                                  if wp.value(p.get(f"{part}_{k}")) is not None)) for k in RES)
    quote = next(wp.find_templates(c, r"Quote"), None)
    if quote:
        q = wp.template_params(quote[2]).get("text")
        if q:
            o["in_game_description"] = wp.clean(q, page)
    secs = wp.sections(c)
    intro = secs["_intro"]
    for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
        if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|quote|DISPLAYTITLE)", raw, re.I):
            intro = intro.replace(raw, "")
    o["summary"] = wp.clean(intro, page) or None
    eq = next((b for n, b in secs.items() if re.fullmatch(r"starting equipment", n, re.I)), "")
    o["starting_equipment"] = equipment(eq, page)
    bo = next((b for n, b in secs.items() if re.fullmatch(r"build optimi[sz]ation", n, re.I)), "")
    if bo.strip():
        o["build_optimization"] = wp.bullets(bo, page)
    origins.append(o)

meta = OrderedDict([
    ("source_page", "https://eldenring.wiki.gg/wiki/Origins"),
    ("retrieved", "2026-10-31"),
    ("count", len(origins)),
    ("counts_by_source", dict(Counter(o["source"] for o in origins))),
    ("field_notes", OrderedDict([
        ("source", "'Tarnished Pack' = origin exclusive to ELDEN RING Tarnished Edition (Switch 2) or the Tarnished Pack DLC, as stated on its page."),
        ("attributes / level", "Starting level and the 8 attributes."),
        ("base_stats / defense / damage_negation / resistance", "Starting derived stats from the page infobox (resistance: base / equipment / total)."),
        ("starting_equipment", "Grouped as on the wiki (Armaments, Spells, Gear, Misc.); ammunition joined to its bow with '+'."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("origins", origins)]), open(sys.argv[3], "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("origins:", len(origins), meta["counts_by_source"])
