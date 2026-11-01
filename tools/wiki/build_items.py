"""Generic builder for item-like pages listed in 'All Items (Gallery)'.

Usage: build_items.py <gallery_index.json> <pages.json> <out.json> <kind> <section[/subsection]> [...]
kind: ashes_of_war | talismans | spirit_ashes | spells | armor | ammunition | tools | upgrade_materials |
      key_items | crafting_materials   (only changes a few promoted convenience fields)
"""
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikiparse as wp  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
index_path, pages_path, out_path, kind = sys.argv[1:5]
wanted = sys.argv[5:]

SKIP_KEYS = {"image", "image1", "image2", "caption", "title", "japanese", "position", "_positional", "app_ver"}
SKIP_SECTIONS = {"_intro", "Description", "Acquisition", "Notes", "Patch Notes", "Patch notes", "Trivia", "Gallery",
                 "References", "See also", "See Also", "Dialogue", "Lore", "Concept Art", "Videos", "Video"}
EFFECT_SECTIONS = re.compile(r"^(effects?|usage|use|uses|flask uses|mechanics|skill|how to use)$", re.I)
ACQ_SECTIONS = re.compile(r"^(acquisition|aquisition|acquistion|acquisiton|locations?|where to find|how to obtain|"
                          r"obtaining|merchants?)$", re.I)
CRAFT_SECTIONS = re.compile(r"^(crafting|required items|crafting materials|recipe|crafting recipe)$", re.I)
USED_IN_SECTIONS = re.compile(r"^(required for|used for|used in|crafting uses)$", re.I)
AFFINITIES = ["Standard", "Heavy", "Keen", "Quality", "Fire", "Flame Art", "Lightning", "Sacred", "Magic", "Cold",
              "Poison", "Blood", "Occult"]
WEAPON_CLASSES = ["Daggers", "Throwing Blades", "Straight Swords", "Light Greatswords", "Greatswords",
                  "Colossal Swords", "Thrusting Swords", "Heavy Thrusting Swords", "Curved Swords",
                  "Curved Greatswords", "Backhand Blades", "Katanas", "Great Katanas", "Twinblades", "Axes",
                  "Greataxes", "Hammers", "Flails", "Great Hammers", "Colossal Weapons", "Spears", "Great Spears",
                  "Halberds", "Reapers", "Whips", "Fists", "Hand-to-Hand", "Claws", "Beast Claws",
                  "Perfume Bottles", "Light Bows", "Bows", "Greatbows", "Crossbows", "Ballistas", "Staves",
                  "Sacred Seals", "Torches", "Small Shields", "Medium Shields", "Greatshields", "Thrusting Shields",
                  "Shields"]

index = json.load(open(index_path, encoding="utf-8"))
pages = json.load(open(pages_path, encoding="utf-8"))["pages"]


def selected(e):
    for w in wanted:
        sec, _, sub = w.partition("::")
        if e["section"] == sec and (not sub or e["subsection"] == sub):
            return True
    return False


def intro_text(c, page):
    intro = wp.sections(c)["_intro"].split("<tabber>")[0]
    for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
        # drop block templates (infobox, hatnotes...) but keep inline text templates like {{ER}} / {{SotE}}
        if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|DISPLAYTITLE|about|main|distinguish|redirect)",
                                   raw, re.I):
            intro = intro.replace(raw, "")
    return wp.clean(intro, page) or None


def build(entry, content):
    page = entry["name"]
    c = wp.strip_comments(content)
    c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page.replace("\\", "\\\\"), c)
    box = next(wp.find_templates(c, r"Infobox[ _][^|}\n]*"), None)
    p = wp.template_params(box[2]) if box else OrderedDict()
    info = OrderedDict()
    for k, v in p.items():
        if k in SKIP_KEYS:
            continue
        val = wp.value(v, page)
        if val is not None:
            info[k] = val
    it = OrderedDict()
    it["name"] = wp.clean(p.get("title", ""), br=" ") or re.sub(r"\s*\((?:[^)]*)\)$", "", page)
    it["wiki_page"] = page
    it["url"] = entry["url"]
    it["section"] = entry["section"]
    it["category"] = entry["category"]
    it["source"] = entry["source"]
    jp = wp.clean(p.get("japanese", ""), br=" ")
    if jp and jp not in ("-", "?"):
        it["japanese_name"] = jp
    if info.get("type") is not None:
        it["type"] = info["type"]
    if info.get("item_effect") is not None:
        it["effect"] = info["item_effect"]

    # ----- kind-specific convenience fields
    if kind == "spells":
        it["spell_type"] = "Sorcery" if entry["section"] == "Sorceries" else "Incantation"
        for k in ("sub_type", "fp_cost", "stamina_cost"):
            if k in info:
                it[k] = info[k]
        it["slots_used"] = wp.num(info.get("slots_used"))
        it["requirements"] = OrderedDict((a, wp.num(info.get(a + "_req")) or 0) for a in ("int", "fai", "arc"))
    elif kind == "armor":
        it["slot"] = entry["section"]
        it["weight"] = wp.num(info.get("weight"))
        it["damage_negation"] = OrderedDict(
            (k.replace("vs_", ""), info.get(k)) for k in
            ("physical", "vs_strike", "vs_slash", "vs_pierce", "magic", "fire", "lightning", "holy"))
        it["resistance"] = OrderedDict((k, info.get(k)) for k in ("immunity", "robustness", "focus", "vitality"))
        it["poise"] = info.get("poise")
        if "altered" in info:
            it["altered_version"] = info["altered"]
    elif kind == "talismans":
        it["weight"] = wp.num(info.get("weight"))
    elif kind == "ashes_of_war":
        it["affinity"] = info.get("affinity")
        it["fp_cost"] = info.get("fp_cost")
        it["affinity_group"] = entry["subsection"]
    elif kind == "spirit_ashes":
        for k in ("fp_cost", "hp_cost"):
            if k in info:
                it[k] = info[k]
    elif kind == "ammunition":
        it["attack_power"] = OrderedDict((k, wp.num(info.get(k + "_power"))) for k in
                                         ("physical", "magic", "fire", "lightning", "holy"))
        it["critical"] = wp.num(info.get("critical"))

    secs = wp.sections(c)
    it["summary"] = intro_text(c, page)
    it["description"] = wp.description_en(secs.get("Description", c), page)

    effect_lines, effect_tables = [], []
    for name, body in secs.items():
        if EFFECT_SECTIONS.match(name):
            effect_lines += wp.bullets(body, page)
            effect_tables += wp.section_tables(body, page)
    if effect_lines:
        it["effect_details"] = effect_lines
    if effect_tables:
        it["effect_tables"] = effect_tables

    if kind == "ashes_of_war":
        eff = " ".join(effect_lines)
        sk = re.search(r"\[\[\s*Skill:\s*([^\]|]+)", "\n".join(b for n, b in secs.items() if EFFECT_SECTIONS.match(n)))
        it["skill"] = sk.group(1).strip() if sk else None
        it["compatible_weapon_classes"] = [w for w in WEAPON_CLASSES if re.search(r"(?<!\w)" + re.escape(w) + r"(?!\w)", eff)]
        it["compatible_affinities"] = [a for a in AFFINITIES if re.search(r"(?<!\w)" + re.escape(a) + r"(?!\w)", eff)]
    if kind == "spirit_ashes":
        alltxt = " ".join(wp.bullets(secs.get("Notes", ""), page)) + " " + (it["summary"] or "")
        m = re.search(r"(Ghost|Grave) Glovewort", alltxt, re.I)
        it["upgrade_material"] = (m.group(1).title() + " Glovewort") if m else None

    acq_parts, region_secs = [], []
    for name, body in secs.items():
        if ACQ_SECTIONS.match(name):
            if re.match(r"merchants?$", name, re.I):
                body = "'''Purchase:'''\n" + body
            acq_parts.append(body)
        elif name in wp.MACRO_REGIONS:
            region_secs.append(name)
            acq_parts.append(f"'''Location:''' [[{name}]] <sup>([[{name}]])</sup>\n" + body)
    acq, regions, flags = wp.parse_acquisition("\n".join(acq_parts), page)
    it["acquisition"] = acq
    it["regions_mentioned"] = regions
    it["acquisition_flags"] = flags
    for field, rx in (("crafting", CRAFT_SECTIONS), ("used_in_crafting", USED_IN_SECTIONS)):
        lines, tabs = [], []
        for name, body in secs.items():
            if rx.match(name):
                lines += wp.bullets(body, page)
                tabs += wp.section_tables(body, page)
        if lines or tabs:
            it[field] = OrderedDict([("text", lines)] + ([("tables", tabs)] if tabs else []))
    notes = wp.bullets(secs.get("Notes", ""), page)
    if notes:
        it["notes"] = notes
    patch = secs.get("Patch Notes") or secs.get("Patch notes")
    if patch and patch.strip():
        it["patch_notes"] = wp.parse_patch_notes(patch, page)
    other = OrderedDict()
    for name, body in secs.items():
        if name in SKIP_SECTIONS or EFFECT_SECTIONS.match(name) or ACQ_SECTIONS.match(name) \
                or CRAFT_SECTIONS.match(name) or USED_IN_SECTIONS.match(name) or name in region_secs \
                or not body.strip():
            continue
        lines, tabs = wp.bullets(body, page), wp.section_tables(body, page)
        if lines or tabs:
            other[name] = OrderedDict([("text", lines)] + ([("tables", tabs)] if tabs else []))
    if other:
        it["other_sections"] = other
    it["infobox"] = info
    return it


items, problems = [], []
for e in index:
    if not selected(e):
        continue
    pg = pages.get(e["name"])
    if not pg or not pg["content"]:
        problems.append(("missing page", e["name"]))
        continue
    try:
        items.append(build(e, pg["content"]))
    except Exception as ex:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        problems.append(("parse error", e["name"], repr(ex)))

meta = OrderedDict([
    ("source_page", "https://eldenring.wiki.gg/wiki/All_Items_(Gallery)"),
    ("gallery_sections", wanted),
    ("source_wiki", "eldenring.wiki.gg (MediaWiki API, page wikitext)"),
    ("retrieved", "2026-10-31"),
    ("count", len(items)),
    ("counts_by_source", dict(Counter(i["source"] for i in items))),
    ("counts_by_category", dict(Counter(i["category"] for i in items))),
    ("field_notes", OrderedDict([
        ("source", "'Base game', 'Shadow of the Erdtree' (DLC) or 'Tarnished Pack' (DLC), from the DLC icon next to the item in the wiki gallery."),
        ("summary", "Opening paragraph of the wiki page (often contains exact values, e.g. talisman percentages)."),
        ("effect / effect_details / effect_tables", "Infobox effect line + content of the page's Effect/Usage sections."),
        ("infobox", "All infobox fields of the page, cleaned (numbers parsed when purely numeric)."),
        ("acquisition", "method / location / region / details from the Acquisition section; nested bullets prefixed with '→'."),
        ("other_sections", "Remaining gameplay sections (text bullets and tables); Trivia/Gallery/References are excluded."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("items", items)]), open(out_path, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print(kind, "items:", len(items), "problems:", problems[:10], len(problems))
