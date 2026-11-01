"""Build bosses.json: one entry per boss page with its encounters (Infobox Boss / Infobox Enemy data).

Usage: build_bosses.py <navboxes.json> <hubs.json> <candidates.json> <boss_pages.json> <out.json> <loc_map_out.json>
"""
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikiparse as wp  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
nav_path, hubs_path, cand_path, pages_path, out_path, locmap_out = sys.argv[1:7]

nav = {p["title"]: p["revisions"][0]["slots"]["main"]["content"]
       for p in json.load(open(nav_path, encoding="utf-8"))["query"]["pages"] if "revisions" in p}
hubs = {p["title"]: p["revisions"][0]["slots"]["main"]["content"]
        for p in json.load(open(hubs_path, encoding="utf-8"))["query"]["pages"] if "revisions" in p}
cands = json.load(open(cand_path, encoding="utf-8"))
pages = json.load(open(pages_path, encoding="utf-8"))["pages"]

# ---------------------------------------------------------------- location -> region map (Navbox Locations)
LOC_REGION, LOC_DLC = {}, {}
c = nav["Template:Navbox Locations"]
for n, g in re.findall(r"\|\s*group(\d+)\s*=([^\n]*)", c):
    lst = re.search(r"\|\s*list" + n + r"\s*=(.*?)(?=\n\s*\|\s*(?:header|state|group|list)\d+|\n\}\})", c, re.S)
    region = wp.clean(wp.remove_files(g)).replace("Shadow of the Erdtree", "").strip()
    dlc = bool(re.search(r"SOTE", g, re.I))
    if not lst:
        continue
    for line in lst.group(1).split("\n"):
        for t in re.findall(r"\[\[([^\]|#]+)", line):
            t = t.strip()
            LOC_REGION.setdefault(t, region)
            LOC_DLC.setdefault(t, dlc or bool(re.search(r"SOTE", line, re.I)))
    LOC_REGION.setdefault(region, region)
    LOC_DLC.setdefault(region, dlc)
GROUP_LABELS = {"General Locations", "Outside the Mainland"}
for t in list(LOC_REGION):
    if t in wp.MACRO_REGIONS:
        LOC_REGION[t] = t                      # a macro region is its own region
    elif LOC_REGION[t] in GROUP_LABELS:
        del LOC_REGION[t]
for r in wp.MACRO_REGIONS:
    LOC_REGION.setdefault(r, r)
    LOC_DLC.setdefault(r, r in wp.DLC_REGIONS)
# optional: regions stated by each location page's infobox (locations dataset), which takes precedence
if len(sys.argv) > 7:
    for loc in json.load(open(sys.argv[7], encoding="utf-8"))["locations"]:
        reg = loc.get("region")
        if not reg:
            continue
        reg = re.sub(r"^Accessed via\s+", "", reg)
        reg = re.sub(r"\s*\(.*\)$", "", reg).strip()
        for key in {loc["name"], loc["wiki_page"]}:
            LOC_REGION[key] = reg
            LOC_DLC[key] = loc["source"] == "Shadow of the Erdtree"
json.dump({"location_to_region": LOC_REGION, "location_is_dlc": LOC_DLC}, open(locmap_out, "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- Bosses page lists (flags)
bp = hubs["Bosses"]


NOT_BOSSES = {"Shadow of the Erdtree", "Elden Ring: Shadow of the Erdtree", "Great Runes", "Shardbearers",
              "Leyndell, Royal Capital"}


def links_in(text):
    return [t.strip() for t in re.findall(r"\[\[([^\]|#]+)", text) if t.strip() not in NOT_BOSSES]


def between(text, start_pat, end_pat):
    m = re.search(start_pat, text)
    if not m:
        return ""
    rest = text[m.end():]
    e = re.search(end_pat, rest)
    return rest[:e.start()] if e else rest


mand_base = between(bp, r"==Mandatory bosses==", r"Two bosses must be defeated")
mand_access = between(bp, r"Two bosses must be defeated in order to access", r"Similarly, the bosses mandatory")
mand_dlc = between(bp, r"Similarly, the bosses mandatory", r"===Shardbearers===")
shard = between(bp, r"===Shardbearers===", r"====Facing the shardbearers")
rem_base = between(bp, r"====Base game====", r"====Shadow of the Erdtree====")
rem_dlc = between(bp, r"====Shadow of the Erdtree====", r"</gallery>")
FLAG_LISTS = {
    "mandatory_base_game": [t for t in links_in(re.sub(r"<ref>.*?</ref>", "", mand_base, flags=re.S))
                            if t not in ("Great Runes", "Leyndell, Royal Capital", "Shardbearers")],
    "required_to_access_dlc": links_in(mand_access),
    "mandatory_dlc": links_in(mand_dlc),
    "shardbearer": [t for t in links_in(shard) if not t.startswith(("Great Runes", "Leyndell", "Shardbearers"))],
    "remembrance_base_game": [t for t in links_in(rem_base)],
    "remembrance_dlc": [t for t in links_in(rem_dlc) if t != "Shadow of the Erdtree"],
}

# resolved page name for every requested title
resolve = {t: v["resolved"] for t, v in pages.items()}


def res(t):
    return resolve.get(t, t)


FLAGS_BY_PAGE = {}
for flag, titles in FLAG_LISTS.items():
    for t in titles:
        FLAGS_BY_PAGE.setdefault(res(t), set()).add(flag)

TIER_BY_PAGE, NAV_DLC, LINKS_BY_PAGE = {}, {}, {}
for t, v in cands.items():
    r = res(t)
    TIER_BY_PAGE.setdefault(r, [])
    for tier, dlc in zip(v["tiers"], v["navbox_dlc"]):
        LINKS_BY_PAGE.setdefault(r, []).append((t, tier, dlc))
        if tier not in TIER_BY_PAGE[r]:
            TIER_BY_PAGE[r].append(tier)
    NAV_DLC.setdefault(r, set()).update(v["navbox_dlc"])
TIER_CONFLICTS = []


def page_tiers(page, encs):
    """Navbox tiers of a page, ignoring links whose navbox (base vs DLC) contradicts all of the page's encounters
    (e.g. a DLC navbox link that wrongly redirects to a base-game boss page)."""
    out = []
    srcs = {e["source"] for e in encs}
    for link, tier, dlc in LINKS_BY_PAGE.get(page, []):
        if srcs and ((dlc and srcs == {"Base game"}) or (not dlc and srcs == {"Shadow of the Erdtree"})):
            TIER_CONFLICTS.append({"navbox_link": link, "resolves_to": page, "tier_ignored": tier,
                                   "link_navbox": "Shadow of the Erdtree" if dlc else "Base game"})
            continue
        if tier not in out:
            out.append(tier)
    return out

# ---------------------------------------------------------------- encounter parsing
DMG_NEG = [("standard", "standard"), ("strike", "strike"), ("slash", "slash"), ("pierce", "pierce"),
           ("magic", "magic"), ("fire", "fire"), ("lightning", "lightning"), ("holy", "holy")]
STATUS = [("poison", "poison"), ("rot", "scarlet_rot"), ("bleed", "blood_loss"), ("frost", "frostbite"),
          ("sleep", "sleep"), ("madness", "madness"), ("death", "death_blight")]
DMG_TYPES = ["standard", "strike", "slash", "pierce", "magic", "fire", "lightning", "holy", "frost", "poison",
             "rot", "bleed", "sleep", "madness", "death"]
KNOWN = {"title", "japanese", "image", "position", "location", "hp", "runes", "drops", "type", "summon", "defense",
         "poise", "parry", "crit", "strong spot", "weak spot", "weakness", "ashes_summon", "npc_summon",
         "_positional", "image desc", "resistances", "aka", "ost"} | {"res " + k for k, _ in DMG_NEG + STATUS} \
        | {"dmg " + k for k in DMG_TYPES}


def numbers(text):
    return [int(x.replace(",", "")) for x in re.findall(r"(?<![\w.])\d{1,3}(?:,\d{3})+(?![\d.])|(?<![\w.,])\d{3,}(?![\d.,])", text or "")]


def yn(v):
    t = wp.clean(v or "").strip().lower()
    return True if t in ("yes", "y", "true") else False if t in ("no", "n", "false") else None


def split_list(v, page):
    t = wp.clean(re.sub(r"<br\s*/?>|\n\*|\n", "\n", v or ""), page, br="\n")
    return [x.strip(" *;,") for x in re.split(r"\n+", t) if x.strip(" *;,-")]


SUBLOC_RE = re.compile(r"(?<![\w'])(" + "|".join(sorted((re.escape(k) for k in LOC_REGION if len(k) > 4),
                                                        key=len, reverse=True)) + r")(?![\w'])")


def encounter_source(loc_raw, loc_clean, page, hint=""):
    regions, dlc_flags = [], []
    for t in re.findall(r"\[\[([^\]|#]+)", loc_raw or ""):
        t = t.strip()
        if t in LOC_REGION:
            if LOC_REGION[t] not in regions:
                regions.append(LOC_REGION[t])
            dlc_flags.append(LOC_DLC.get(t, False))
    for text in (loc_clean or "", hint if not regions else ""):
        for m in SUBLOC_RE.finditer(text):
            t = m.group(1)
            if LOC_REGION[t] not in regions:
                regions.append(LOC_REGION[t])
                dlc_flags.append(LOC_DLC.get(t, False))
        for r in wp.regions_in(text):
            if r not in regions:
                regions.append(r)
                dlc_flags.append(r in wp.DLC_REGIONS)
    if re.search(r"SOTE", loc_raw or "", re.I):
        dlc_flags.append(True)
    if dlc_flags:
        if all(dlc_flags):
            return regions, "Shadow of the Erdtree"
        if not any(dlc_flags):
            return regions, "Base game"
        return regions, "Base game + Shadow of the Erdtree"
    nd = NAV_DLC.get(page, set())
    if nd == {True}:
        return regions, "Shadow of the Erdtree"
    if nd == {False}:
        return regions, "Base game"
    return regions, wp.dlc_from_intro(pages_by_res[page]["content"])


def tab_label_before(c, pos):
    seg = c[:pos]
    m = list(re.finditer(r"(?:<tabber>|\|-\|)\s*([^=\n{}|]+?)\s*=\s*$", seg, re.M))
    return wp.clean(m[-1].group(1)) if m else None


PLACEHOLDERS = {"location": "location", "hp": "hp", "runes": "runes", "drops": "items"}


def unplaceholder(p):
    """Drop unfilled template placeholders such as 'location = Location' or 'hp = HP'."""
    for k, ph in PLACEHOLDERS.items():
        if k in p and wp.clean(p[k]).strip().lower() in (ph, ph + "s", "tba", "?", "-"):
            p[k] = ""
    return p


def parse_encounter(raw, c, pos, page):
    p = unplaceholder(wp.template_params(raw))
    e = OrderedDict()
    title = wp.clean(p.get("title", ""), page, br=" ")
    if not title and p.get("_positional"):
        cand = wp.clean(p["_positional"][0].split("\n")[0], page, br=" ")
        if cand and not re.search(r"\.(png|jpe?g|webp|gif)\b", cand, re.I):
            title = cand
    label = tab_label_before(c, pos)
    name = title or (page + (f" ({label})" if label and label != page else ""))
    base = re.split(r",| \(", page)[0].lower()
    e["name"] = name if base in name.lower() else f"{page} – {name}"
    if label:
        e["variant"] = label
    tp = wp.value(p.get("type"))
    if tp:
        e["type"] = tp
    loc_raw = p.get("location", "")
    e["location"] = wp.clean(loc_raw, page, br="; ").replace("\n", " ") or None
    e["regions"], e["source"] = encounter_source(loc_raw, e["location"], page, hint=" ".join(filter(None, [label, title])))
    e["hp"] = wp.clean(p.get("hp", ""), page, br="; ").replace("\n", " ") or None
    e["hp_values"] = numbers(wp.clean(p.get("hp", "")))
    e["runes"] = wp.clean(p.get("runes", ""), page, br="; ").replace("\n", " ") or None
    e["runes_values"] = numbers(wp.clean(p.get("runes", "")))
    e["drops"] = split_list(p.get("drops", ""), page)
    neg = OrderedDict()
    for k, out in DMG_NEG:
        v = p.get("res " + k)
        if v is not None and wp.clean(v).strip():
            t = wp.clean(v).strip().rstrip("%").strip()
            neg[out] = wp.num(t) if wp.num(t) is not None else wp.clean(v)
    if neg:
        e["damage_negation_percent"] = neg
    st = OrderedDict()
    for k, out in STATUS:
        v = p.get("res " + k)
        if v is not None and wp.clean(v).strip():
            t = wp.clean(v, br="; ").strip()
            st[out] = "Immune" if re.fullmatch(r"(?i)immune", t) else (wp.num(t) if wp.num(t) is not None else t)
    if st:
        e["status_resistance"] = st
    dealt = [k for k in DMG_TYPES if yn(p.get("dmg " + k))]
    if dealt:
        e["damage_types_dealt"] = dealt
    for k, out in (("weakness", "weakness"), ("weak spot", "weak_spot"), ("strong spot", "strong_spot")):
        v = wp.value(p.get(k), page)
        if v:
            e[out] = v
    for k, out in (("parry", "parryable"), ("crit", "critable")):
        v = yn(p.get(k))
        if v is not None:
            e[out] = v
    for k in ("defense", "poise"):
        v = wp.value(p.get(k))
        if v is not None:
            e[k] = v
    for k, out in (("ashes_summon", "spirit_ashes_allowed"), ("npc_summon", "npc_summon_available")):
        v = yn(p.get(k))
        if v is not None:
            e[out] = v
    if p.get("summon") and wp.clean(p["summon"]).strip():
        e["summons_available"] = wp.clean(p["summon"], page, br="; ")
    extra = OrderedDict((k, wp.value(v, page)) for k, v in p.items()
                        if k not in KNOWN and not k.startswith("image") and wp.value(v, page) is not None)
    if extra:
        e["other_infobox_fields"] = extra
    return e


pages_by_res = {}
for t, v in pages.items():
    pages_by_res.setdefault(v["resolved"], v)

STRAT = re.compile(r"^(boss fight|strateg(y|ies)|tips|fight|boss|bosses|notes)$", re.I)
bosses = []
for page, v in pages_by_res.items():
    if not v["content"] or page in ("Bosses",):
        continue
    c = wp.strip_comments(v["content"])
    c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, c)
    encs = []
    for start, end, raw in wp.find_templates(c, r"Infobox[ _](?:Boss|Enemy)"):
        p = unplaceholder(wp.template_params(raw))
        if not any(wp.clean(p.get(k, "")).strip() for k in ("hp", "runes", "drops")):
            continue
        encs.append(parse_encounter(raw, c, start, page))
    in_nav = page in TIER_BY_PAGE and TIER_BY_PAGE[page]
    flags = sorted(FLAGS_BY_PAGE.get(page, []))
    if not encs and not in_nav and not flags:
        continue
    b = OrderedDict()
    char = next(wp.find_templates(c, r"Infobox[ _]Character"), None)
    cp = wp.template_params(char[2]) if char else {}
    b["name"] = wp.clean(cp.get("title", ""), br=" ") or page
    b["wiki_page"] = page
    b["url"] = wp.wiki_url(page)
    srcs = sorted({e["source"] for e in encs}) or [
        "Shadow of the Erdtree" if NAV_DLC.get(page) == {True} else
        "Base game" if NAV_DLC.get(page) == {False} else wp.dlc_from_intro(v["content"])]
    b["source"] = srcs[0] if len(srcs) == 1 else " + ".join(
        sorted({s for x in srcs for s in x.split(" + ")}, key=lambda s: s != "Base game"))
    b["tier"] = page_tiers(page, encs)
    b["flags"] = flags
    if cp.get("location"):
        b["character_location"] = wp.clean(cp["location"], page, br="; ")
    secs = wp.sections(c)
    intro = secs["_intro"]
    for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
        if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|quote|DISPLAYTITLE)", raw, re.I):
            intro = intro.replace(raw, "")
    b["summary"] = wp.clean(intro.split("<tabber>")[0], page) or None
    b["encounters"] = encs
    if not encs:
        b["encounter_data_note"] = "No HP/runes/drops infobox on the wiki page."
    fight = []
    for name, body in secs.items():
        if STRAT.match(name):
            lines = wp.bullets(body, page)
            if lines:
                fight += (["[" + name + "]"] if len(fight) or name.lower() != "boss fight" else []) + lines
    if fight:
        b["fight_notes"] = fight
    bosses.append(b)

bosses.sort(key=lambda b: (b["source"] != "Base game", b["name"]))
meta = OrderedDict([
    ("source_pages", ["https://eldenring.wiki.gg/wiki/Bosses", "https://eldenring.wiki.gg/wiki/Template:Navbox_Bosses",
                      "https://eldenring.wiki.gg/wiki/Template:Navbox_Bosses_Shadow",
                      "https://eldenring.wiki.gg/wiki/Category:Bosses"]),
    ("retrieved", "2026-10-31"),
    ("boss_pages", len(bosses)),
    ("encounters", sum(len(b["encounters"]) for b in bosses)),
    ("counts_by_source", dict(Counter(b["source"] for b in bosses))),
    ("encounters_by_source", dict(Counter(e["source"] for b in bosses for e in b["encounters"]))),
    ("counts_by_tier", dict(Counter(t for b in bosses for t in b["tier"]))),
    ("flag_lists_from_bosses_page", FLAG_LISTS),
    ("navbox_tier_conflicts_ignored", TIER_CONFLICTS),
    ("field_notes", OrderedDict([
        ("source", "Per encounter: from the encounter location (wiki Navbox Locations: Realm of Shadow regions = 'Shadow of the Erdtree'), else from the boss navbox (Navbox Bosses vs Navbox Bosses Shadow). Page-level source = union of its encounters."),
        ("tier", "Group of the wiki boss navbox (matches the in-game victory banner: God / Demigod / Legend / Great Enemy / Enemy; plus invaders & minibosses)."),
        ("flags", "From the wiki 'Bosses' page: mandatory_base_game, required_to_access_dlc, mandatory_dlc, shardbearer, remembrance_base_game, remembrance_dlc."),
        ("encounters", "One per Infobox Boss / Infobox Enemy with HP, runes or drops (a page can describe several fights / locations)."),
        ("hp / runes", "Text as on the wiki (may list several locations or NG+ values); *_values = all numbers found in it."),
        ("damage_negation_percent", "Boss damage absorption per damage type, in % (higher = more resistant; negative = weak)."),
        ("status_resistance", "Buildup resistance per status effect (number, text with per-location values, or 'Immune')."),
        ("damage_types_dealt", "Damage types the boss inflicts (wiki 'dmg X = yes' fields), when documented."),
        ("parryable / critable", "Whether the boss can be parried / critically hit, when documented."),
        ("fight_notes", "Text of the Boss Fight / Strategy / Notes sections (moveset tables excluded)."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("bosses", bosses)]), open(out_path, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("boss pages:", len(bosses), "encounters:", meta["encounters"], meta["counts_by_source"],
      meta["encounters_by_source"])
print("flags:", {k: len(v) for k, v in FLAG_LISTS.items()})
missing_flag_pages = [t for k, v in FLAG_LISTS.items() for t in v if res(t) not in {b["wiki_page"] for b in bosses}]
print("flagged titles not in output:", missing_flag_pages)
