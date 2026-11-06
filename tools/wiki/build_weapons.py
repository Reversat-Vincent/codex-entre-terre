"""Build a structured JSON of every melee armament from downloaded eldenring.wiki.gg wikitext.

Usage: build_weapons.py <index.json> <weapon_pages.json> <skill_pages.json> <out.json>
"""
import html
import json
import re
import sys
from collections import OrderedDict, Counter

index_path, pages_path, skills_path, aow_path, out_path = sys.argv[1:6]
_opts = dict(zip(sys.argv[6::2], sys.argv[7::2]))
SOURCE_PAGE = _opts.get("--source", "https://eldenring.wiki.gg/wiki/Melee_Armaments")
CLASS_PAGES_PATH = _opts.get("--classes")          # optional: class pages (Bows, Staves...) with class-level rules
REFERENCE_PATH = _opts.get("--reference")          # optional: another built JSON pooled for estimate statistics
OTHER_NAMES_PATH = _opts.get("--other-names")      # optional: extra weapon names (other dataset) for subject checks
sys.stdout.reconfigure(encoding="utf-8")

AFFINITIES = ["Standard", "Heavy", "Keen", "Quality", "Fire", "Flame Art", "Lightning",
              "Sacred", "Magic", "Cold", "Poison", "Blood", "Occult"]
ELEMENTS = ["physical", "magic", "fire", "lightning", "holy"]
ATTRS = ["str", "dex", "int", "fai", "arc"]

MACRO_REGIONS = [
    # Lands Between (base game)
    "Limgrave", "Stormhill", "Weeping Peninsula", "Stormveil Castle", "Roundtable Hold",
    "Liurnia of the Lakes", "Academy of Raya Lucaria", "Caelid", "Dragonbarrow",
    "Altus Plateau", "Mt. Gelmir", "Volcano Manor", "Capital Outskirts",
    "Leyndell, Royal Capital", "Leyndell, Ashen Capital", "Subterranean Shunning-Grounds",
    "Forbidden Lands", "Mountaintops of the Giants", "Consecrated Snowfield",
    "Miquella's Haligtree", "Elphael, Brace of the Haligtree", "Crumbling Farum Azula",
    "Siofra River", "Ainsel River", "Nokron, Eternal City", "Nokstella, Eternal City",
    "Deeproot Depths", "Lake of Rot", "Mohgwyn Palace",
    # Realm of Shadow (Shadow of the Erdtree)
    "Gravesite Plain", "Belurat, Tower Settlement", "Castle Ensis", "Scadu Altus",
    "Shadow Keep", "Specimen Storehouse", "Scaduview", "Hinterland", "Cerulean Coast",
    "Stone Coffin Fissure", "Jagged Peak", "Abyssal Woods", "Midra's Manse",
    "Ancient Ruins of Rauh", "Rauh Base", "Charo's Hidden Grave", "Enir-Ilim",
]
REGION_ALIASES = {
    "Leyndell": "Leyndell, Royal Capital", "Raya Lucaria": "Academy of Raya Lucaria",
    "Farum Azula": "Crumbling Farum Azula", "Haligtree": "Miquella's Haligtree",
    "Elphael": "Elphael, Brace of the Haligtree", "Nokron": "Nokron, Eternal City",
    "Nokstella": "Nokstella, Eternal City", "Mohgwyn": "Mohgwyn Palace",
    "Shunning-Grounds": "Subterranean Shunning-Grounds", "Liurnia": "Liurnia of the Lakes",
    "Mt. Gelmir": "Mt. Gelmir", "Mount Gelmir": "Mt. Gelmir", "Altus": "Altus Plateau",
    "Belurat": "Belurat, Tower Settlement", "Mountaintops": "Mountaintops of the Giants",
    "Snowfield": "Consecrated Snowfield",
}

# ----------------------------------------------------------------- wikitext helpers

def strip_comments(s):
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    return s


def match_close(text, start, open_tok, close_tok):
    """Index just after the token closing the one opened at `start`."""
    depth, i = 0, start
    while i < len(text):
        if text.startswith(open_tok, i):
            depth += 1
            i += len(open_tok)
            continue
        if text.startswith(close_tok, i):
            depth -= 1
            i += len(close_tok)
            if depth == 0:
                return i
            continue
        i += 1
    return len(text)


def find_templates(text, name_regex):
    """Yield (start, end, raw) for every {{name ...}} matching name_regex."""
    for m in re.finditer(r"\{\{\s*(?:Template:)?(?:" + name_regex + r")\s*(?=[|}\n])", text, re.I):
        end = match_close(text, m.start(), "{{", "}}")
        yield m.start(), end, text[m.start():end]


def split_top(s, sep="|"):
    """Split on `sep` outside of [[...]] and {{...}}."""
    parts, cur, sq, cu, i = [], [], 0, 0, 0
    while i < len(s):
        two = s[i:i + 2]
        if two == "[[":
            sq += 1; cur.append(two); i += 2; continue
        if two == "]]" and sq:
            sq -= 1; cur.append(two); i += 2; continue
        if two == "{{":
            cu += 1; cur.append(two); i += 2; continue
        if two == "}}" and cu:
            cu -= 1; cur.append(two); i += 2; continue
        if s[i] == sep and sq == 0 and cu == 0:
            parts.append("".join(cur)); cur = []; i += 1; continue
        cur.append(s[i]); i += 1
    parts.append("".join(cur))
    return parts


def template_params(raw):
    parts = split_top(raw[2:-2])
    params = OrderedDict()
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            if "[[" in k or "{{" in k:
                continue
            params[k.strip()] = v.strip()
    return params


def remove_files(s, keep_name=False):
    out, i = [], 0
    while True:
        m = re.search(r"\[\[\s*(?:File|Image)\s*:", s[i:], re.I)
        if not m:
            out.append(s[i:]); break
        a = i + m.start()
        out.append(s[i:a])
        b = match_close(s, a, "[[", "]]")
        if keep_name:
            name = s[a:b][2:-2].split("|")[0].split(":", 1)[1]
            out.append(" " + re.sub(r"\.(png|jpg|jpeg|gif|webp|svg)$", "", name.strip(), flags=re.I) + " ")
        i = b
    return "".join(out)


def clean(s, page="", br=" ", keep_files=False):
    """Convert a wikitext fragment to plain text."""
    if s is None:
        return ""
    s = strip_comments(s)
    s = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, s)
    s = re.sub(r"\{\{\s*ER\s*\}\}", "Elden Ring", s)
    s = re.sub(r"\{\{\s*SOTE\s*(\|[^{}]*)?\}\}", "Shadow of the Erdtree", s, flags=re.I)
    s = re.sub(r"\{\{\s*TP\s*\}\}", "Tarnished Pack", s)
    s = re.sub(r"\{\{\s*snd\s*\}\}", " – ", s, flags=re.I)
    s = re.sub(r"\{\{\s*sic\s*(\|[^{}]*)?\}\}", " [sic]", s, flags=re.I)
    prev = None
    while prev != s:  # drop remaining (presentational) templates, innermost first
        prev = s
        s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = remove_files(s, keep_name=keep_files)
    s = re.sub(r"\[\[\s*(?:Category|[a-z]{2,3}(?:-[a-z]{2,4})?)\s*:[^\]]*\]\]", "", s)  # categories / interwiki
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[(?:[^|\]\[]*\|)?([^\]\[]*)\](?!\])", r"\1", s)  # malformed link with a single ']'
    s = re.sub(r"\[https?://[^\s\]]+\s*([^\]]*)\]", r"\1", s)
    s = re.sub(r"'{2,}", "", s)
    s = re.sub(r"<br\s*/?>", br, s, flags=re.I)
    s = re.sub(r"<sup>\s*", " ", s, flags=re.I)
    s = re.sub(r"</?[a-zA-Z][^>]*>", "", s)
    s = html.unescape(s)
    s = s.replace(" ", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"\s+([,.;:!?)])", r"\1", s)
    s = re.sub(r"\(\s+", "(", s)
    return s.strip()


def sections(text):
    """Split page on level-2 headings into {heading: body}; headings stripped of icons.
    '_intro' = text before the first heading. Level-3+ headings stay inside their section."""
    out = OrderedDict()
    parts = re.split(r"^==(?!=)[ \t]*(.*?)[ \t]*(?<!=)==[ \t]*$", text, flags=re.M)
    out["_intro"] = parts[0]
    for i in range(1, len(parts), 2):
        name = clean(remove_files(parts[i]))
        out[name] = out.get(name, "") + "\n" + parts[i + 1]
    return out


def bullets(text, page, drop=()):
    """Bullet/paragraph lines -> list of strings; nested bullets prefixed with '→'."""
    out = []
    text = re.sub(r"\{\|.*?\n\|\}", "", text, flags=re.S)       # drop tables
    text = re.sub(r"<tabber>.*?</tabber>", "", text, flags=re.S)
    text = re.sub(r"<gallery.*?</gallery>", "", text, flags=re.S | re.I)
    for _, _, raw in list(find_templates(text, r"[^|{}]+")):
        if "\n" in raw:                                       # multi-line templates (upgrade data…)
            text = text.replace(raw, "")
    for line in text.split("\n"):
        if not line.strip():
            continue
        hm = re.match(r"^\s*=+\s*(.*?)\s*=+\s*$", line)
        if hm:
            h = clean(remove_files(hm.group(1)), page)
            if h:
                out.append("[" + h + "]")
            continue
        m = re.match(r"^\s*([*#:]+)\s*(.*)$", line)
        depth, body = (len(m.group(1)), m.group(2)) if m else (0, line)
        c = clean(body, page)
        if not c or any(re.search(d, c, re.I) for d in drop):
            continue
        out.append(("→" * (depth - 1) + " " if depth > 1 else "") + c)
    return out


def num(v):
    if v is None:
        return None
    t = clean(str(v)).replace(",", "").strip()
    if t in ("", "-", "–", "?", "??", "N/A", "n/a"):
        return None
    # Le wiki écrit parfois les décimales sans zéro initial (".3068") : elles sont acceptées.
    m = re.fullmatch(r"[-+]?(?:\d+(?:\.\d+)?|\.\d+)", t)
    if not m:
        return None
    f = float(t)
    return int(f) if f.is_integer() and "." not in t else f


def grade(v):
    t = clean(v or "").strip()
    return t if re.fullmatch(r"[SABCDE]", t) else None


def text_or_none(v, page=""):
    t = clean(v or "", page)
    return t or None


# ----------------------------------------------------------------- skills

skill_pages = json.load(open(skills_path, encoding="utf-8"))["pages"]
AOW_EXISTS = {t.split(":", 1)[1].strip(): bool(v["content"])
              for t, v in json.load(open(aow_path, encoding="utf-8"))["pages"].items()}


def yesno(v):
    t = clean(v or "").strip().lower()
    return True if t == "yes" else False if t == "no" else None


def skill_info(target):
    page = skill_pages.get(target)
    if not page or not page["content"]:
        return {}
    c = strip_comments(page["content"])
    info = {"page": page["resolved"],
            "url": "https://eldenring.wiki.gg/wiki/" + page["resolved"].replace(" ", "_")}
    box = next(find_templates(c, r"Infobox[ _]Item"), None)
    p = template_params(box[2]) if box else {}
    t = clean(p.get("type", ""))
    base = re.sub(r"^(Unique Skill|Skill|Ash of War)\s*:\s*", "", page["resolved"]).strip()
    if "unique" in t.lower() or page["resolved"].startswith("Unique Skill"):
        info["type"] = "Unique Skill"
        info["ash_of_war_available"] = False
    else:
        aow = AOW_EXISTS.get(base)
        info["ash_of_war_available"] = aow
        info["type"] = "Ash of War skill" if aow else "Standard skill (no Ash of War item)"
    desc = next(find_templates(c, r"Description"), None)
    if desc:
        dp = template_params(desc[2])
        en = [dp[k] for k in dp if re.fullmatch(r"EN(_line\d+)?", k)]
        d = clean("\n\n".join(en), br=" ")
        info["description"] = d or None
    for key, out in (("stamina_cost", "stamina_cost_wiki"), ("attack_type", "attack_type"),
                     ("affinity", "default_affinity")):
        v = text_or_none(p.get(key))
        if v and v not in ("-", "- (- -)"):
            info[out] = v
    props = {k: yesno(p.get(k)) for k in ("hold", "charge", "follow_up", "combo", "channel", "parryable")}
    props = {k: v for k, v in props.items() if v is not None}
    if props:
        info["properties"] = props
    return info


# ----------------------------------------------------------------- upgrade data

LEVEL_RE = re.compile(r"^(?P<aff>[A-Za-z][A-Za-z ]*?)?\s*(?P<lvl>\+\s*\d+)?$")
COLOR_ELEM = {"red": "fire", "yellow": "lightning", "orange": "holy", "cyan": "magic",
              "#ff9900": "fire", "#fbfb02": "lightning", "#e9bb8e": "holy", "#3fbddd": "magic"}
AFF_ELEM = {"Fire": "fire", "Flame Art": "fire", "Lightning": "lightning", "Sacred": "holy",
            "Magic": "magic", "Cold": "magic"}


def level_label(t):
    t = clean(t).strip()
    if re.match(r"^(↑|&uarr;)", t) or t.lower().startswith("per lv"):
        return (None, "growth_per_level")
    m = LEVEL_RE.match(t)
    if not t or not m or (not m.group("aff") and not m.group("lvl")):
        return None
    aff = (m.group("aff") or "").strip()
    if aff and aff not in AFFINITIES:
        return None
    return (aff or None, (m.group("lvl") or "+0").replace(" ", ""))


def map_column(name, idx):
    n = re.sub(r"\s+", " ", name.lower()).strip()
    if not n:
        return "level" if idx == 0 else None
    if n.startswith("level") or n in ("lv", "lvl"):
        return "level"
    if "stamina" in n or "poise" in n or "stance" in n:
        return None
    if "sorcery" in n or "incant" in n:
        return "spell_buff"
    if "passive" in n:
        return "passive"
    if "boost" in n:
        return "guard_boost"
    if "critical" in n or re.search(r"\bcrit\b", n):
        return "crit"
    attr = next((a for a, pats in (("str", ("str",)), ("dex", ("dex",)), ("int", ("int",)),
                                   ("fai", ("fai", "fth")), ("arc", ("arc",)))
                 if any(re.search(r"\b" + p, n) for p in pats)), None)
    elem = next((e for e, pats in (("physical", ("phy",)), ("magic", ("mag",)), ("fire", ("fir",)),
                                   ("lightning", ("lit", "light")), ("holy", ("hol",)))
                 if any(re.search(r"\b" + p, n) for p in pats)), None)
    if attr and ("scal" in n or not elem):
        return "scale_" + attr
    if elem and any(k in n for k in ("guard", "defens", "negation")):
        return "guard_" + elem
    if any(k in n for k in ("attack", "atk", "damage")):
        if elem:
            return "atk_" + elem
        return "atk" if " / " not in n else None  # combined phys/elemental column (single header only)
    return None


def parse_wikitable(tbl):
    """Wikitext table -> grid (list of rows of cell dicts), rowspan/colspan expanded."""
    rows, cur = [], None
    lines = tbl.split("\n")[1:]
    last_cell = None
    for line in lines:
        s = line.strip()
        if s.startswith("|}"):
            break
        if s.startswith("|+"):
            continue
        if s.startswith("|-"):
            cur = []; rows.append(cur); last_cell = None
            continue
        if s.startswith("!") or s.startswith("|"):
            header = s.startswith("!")
            body = s[1:]
            chunks = re.split(r"!!|\|\|", body) if header else split_top_cells(body)
            if cur is None:
                cur = []; rows.append(cur)
            for ch in chunks:
                attrs, content = "", ch
                parts = split_top(ch)
                if len(parts) > 1 and re.fullmatch(r"\s*([\w-]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s\"']+)\s*)+", parts[0]):
                    attrs, content = parts[0], "|".join(parts[1:])
                rs = re.search(r"rowspan\s*=\s*\"?(\d+)", attrs)
                cs = re.search(r"colspan\s*=\s*\"?(\d+)", attrs)
                last_cell = {"h": header, "raw": content, "rs": int(rs.group(1)) if rs else 1,
                             "cs": int(cs.group(1)) if cs else 1}
                cur.append(last_cell)
        elif last_cell is not None:
            last_cell["raw"] += "\n" + line
    rows = [r for r in rows if r]
    grid, pending = [], {}
    for r, row in enumerate(rows):
        out, c, it = [], 0, iter(row)
        while True:
            while (r, c) in pending:
                out.append(pending.pop((r, c))); c += 1
            cell = next(it, None)
            if cell is None:
                break
            for _ in range(cell["cs"]):
                out.append(cell)
                for k in range(1, cell["rs"]):
                    pending[(r + k, c)] = cell
                c += 1
        grid.append(out)
    return grid


def split_top_cells(body):
    """Split a data-row line on '||' outside links/templates."""
    parts = split_top(body.replace("||", "\x00"), sep="\x00")
    return parts


def cell_value(cell, field, aff):
    raw = cell["raw"]
    txt = clean(raw, br=" ")
    if field.startswith("scale_"):
        g = re.search(r"(?<![A-Za-z])([SABCDE])(?![A-Za-z])", txt)
        # ".3068" doit donner 0.3068 et non 3068.0 (coefficients du Horn Bow, correctif P2 de data/CHANGELOG.md).
        n = re.search(r"\d+(?:\.\d+)?|\.\d+", txt)
        coef = float(n.group()) if n else None
        if not g and not coef:
            return None
        return {"grade": g.group(1) if g else None, "coef": coef}
    if field == "passive":
        return txt if txt not in ("", "-", "–", "?") else None
    return num(txt) if num(txt) is not None else (None if txt in ("", "-", "–", "?", "??") else txt)


def interpret_table(grid, aff_hint):
    """Return {aff: {level: {...}}} from an expanded grid, or None if not an upgrade table."""
    first_data = None
    for i, row in enumerate(grid):
        if row and level_label(row[0]["raw"]) is not None:
            first_data = i
            break
    if first_data is None or first_data == 0:
        return None
    ncols = max(len(r) for r in grid)
    names = []
    for c in range(ncols):
        seen, parts = set(), []
        for r in range(first_data):
            if c < len(grid[r]):
                cell = grid[r][c]
                if id(cell) in seen:
                    continue
                seen.add(id(cell))
                t = clean(cell["raw"], keep_files=True)
                if t and t not in parts:
                    parts.append(t)
        names.append(" / ".join(parts))
    fields = [map_column(n, i) for i, n in enumerate(names)]
    if "level" not in fields or not any(f and (f.startswith("atk") or f.startswith("scale_")) for f in fields):
        return None
    lcol = fields.index("level")
    result = OrderedDict()
    prev_label_cell = None
    for row in grid[first_data:]:
        if lcol >= len(row):
            continue
        lab = level_label(row[lcol]["raw"])
        if lab is None:
            continue
        aff = lab[0] or aff_hint or "Standard"
        lvl = lab[1]
        entry = result.setdefault(aff, OrderedDict()).setdefault(lvl, OrderedDict())
        continuation = row[lcol] is prev_label_cell
        prev_label_cell = row[lcol]
        for c, f in enumerate(fields):
            if f in (None, "level") or c >= len(row):
                continue
            cell = row[c]
            if f == "atk":
                if lvl == "growth_per_level":
                    if not continuation:
                        entry["atk"] = clean(cell["raw"])
                    continue
                v = cell_value(cell, "atk", aff)
                if not continuation:
                    entry["atk_physical"] = v
                else:
                    m = re.search(r"color\s*:\s*([#a-z0-9]+)", cell["raw"], re.I)
                    elem = COLOR_ELEM.get(m.group(1).lower()) if m else AFF_ELEM.get(aff)
                    if v not in (None, 0):
                        entry["atk_" + (elem or "elemental")] = v
                continue
            if continuation:
                continue
            if lvl == "growth_per_level":
                t = clean(cell["raw"])
                if t and t not in ("-", "–"):
                    entry[f] = t
            else:
                entry[f] = cell_value(cell, f, aff)
    return result or None


def tabber_segments(text):
    """Yield (label, content) for each tab of every <tabber> block; plus (None, rest)."""
    rest = text
    for m in re.finditer(r"<tabber>(.*?)</tabber>", text, re.S):
        rest = rest.replace(m.group(0), "")
        for seg in m.group(1).split("|-|"):
            mm = re.match(r"\s*([^=\n{|]+?)\s*=\s*\n?(.*)$", seg, re.S)
            if mm:
                yield clean(mm.group(1)), mm.group(2)
    yield None, rest


def level_entry_to_schema(e):
    e = {k: v for k, v in e.items() if v is not None}
    out = OrderedDict()
    atk = OrderedDict((el, e.get("atk_" + el)) for el in ELEMENTS if ("atk_" + el) in e)
    if "atk_elemental" in e:
        atk["elemental"] = e["atk_elemental"]
    if "atk" in e:
        atk["all"] = e["atk"]
    if atk:
        out["attack"] = atk
    if "crit" in e:
        out["critical"] = e["crit"]
    sc = OrderedDict()
    for a in ATTRS:
        for k in ("scale_" + a, "scale_" + {"fai": "fth"}.get(a, a)):
            if k in e:
                sc[a] = e[k]
    if sc:
        out["scaling"] = sc
    gd = OrderedDict((el, e.get("guard_" + el)) for el in ELEMENTS if ("guard_" + el) in e)
    if "guard_boost" in e:
        gd["boost"] = e["guard_boost"]
    if gd:
        out["guard"] = gd
    if e.get("spell_buff") is not None:
        out["spell_buff"] = e["spell_buff"]
    if e.get("passive"):
        out["passive"] = e["passive"]
    if e.get("runes") is not None:
        out["upgrade_cost_runes"] = e["runes"]
    return out


def parse_upgrade_templates(text):
    """Weapon_Upgrades_Somber / Weapon Upgrade (Affinity) templates -> {aff: {lvl: entry}}."""
    res = OrderedDict()
    kinds = []
    for _, _, raw in find_templates(text, r"Weapon[ _]Upgrades?[^|}\n]*"):
        name = re.match(r"\{\{\s*(?:Template:)?([^|\n}]+)", raw).group(1).strip()
        kinds.append(name)
        p = template_params(raw)
        tmp = OrderedDict()
        for k, v in p.items():
            m = re.fullmatch(r"(?P<aff>[A-Za-z_]+?)?\+(?P<lvl>\d+)_(?P<f>[a-z_]+)", k)
            if not m:
                continue
            aff = (m.group("aff") or "Standard").replace("_", " ")
            f = m.group("f")
            lvl = "+" + m.group("lvl")
            if f.endswith("_exact"):
                base = f[:-6]
                tmp.setdefault(aff, OrderedDict()).setdefault(lvl, OrderedDict()).setdefault("_exact", {})[base] = num(v)
                continue
            val = v.strip()
            if f.startswith("scale_"):
                val = grade(val)
            elif f == "passive":
                val = clean(val) or None
            else:
                val = num(val)
            tmp.setdefault(aff, OrderedDict()).setdefault(lvl, OrderedDict())[f] = val
        for aff, levels in tmp.items():
            for lvl, e in levels.items():
                exact = e.pop("_exact", {})
                for base, coef in exact.items():
                    if base in e and (e[base] or coef):
                        e[base] = {"grade": e[base], "coef": coef}
                for k in list(e):
                    if k.startswith("scale_") and isinstance(e[k], str):
                        e[k] = {"grade": e[k], "coef": None}
                if all(e.get("atk_" + el) is None for el in ELEMENTS):
                    continue  # empty level (template placeholder)
                res.setdefault(aff, OrderedDict())[lvl] = e
    return res, kinds


def lvl_key(k):
    return (1, 0) if k == "growth_per_level" else (0, int(k.lstrip("+")))


# ----------------------------------------------------------------- upgrade path classification

INFUSABLE_NEG_CONTEXT = re.compile(
    r"(outclassed by|than|unlike|compared (?:to|with)|other than|versus|vs\.?)\s+(?:\w+\s+){0,3}?infus[ai]ble|non-infus",
    re.I)
POSITIVE_INFUSE = [
    r"\bcan have its (?:affinity|skill|ash of war)",
    r"\bcan be (?:buffed and )?infused",
    r"\bwhen infused with\b", r"\bif (?:this weapon|it) is infused\b", r"\binfusing it with\b",
    r"\binfuse (?:the|it|this)\b", r"\bonce infused with\b",
]
POSITIVE_AOW = [
    r"\bcomes? (?:pre-)?equipped with (?:the )?(?:\[\[)?Ash of War",
    r"\bAsh of War: [^.]{0,60}?pre-equipped", r"pre-equipped with (?:the )?Ash of War",
]


ALL_WEAPON_NAMES = set()   # filled at run time (all weapon names, used to detect sentences about other weapons)
GENERIC_NAMES = set()      # weapon names that are also class words (Hammer, Greatsword, Dagger...)
_NAME_RE = [None]


def about_other_weapon(scan, start, own_name):
    """True if the sentence prefix before position `start` is about another weapon (relative clause or other name)."""
    prefix = scan[max(scan.rfind(".", 0, start), scan.rfind("\n", 0, start)) + 1:start]
    if re.search(r",\s*which\b", prefix):
        return True
    if _NAME_RE[0] is None:
        names = sorted((n for n in ALL_WEAPON_NAMES if n.lower() not in GENERIC_NAMES and len(n) > 3),
                       key=len, reverse=True)
        _NAME_RE[0] = re.compile(r"(?<![\w'])(" + "|".join(map(re.escape, names)) + r")(?!\w)", re.I)
    own = own_name.lower()
    return any(m.group(1).lower() != own and m.group(1).lower() not in own
               for m in _NAME_RE[0].finditer(prefix))


def classify_upgrade(kinds, tables, scan, has_compat_list, own_name=""):
    """Upgrade material / Ash of War / affinity flags, only from what the wiki states (or strict game rules)."""
    material = msrc = None
    if any("somber" in k.lower() for k in kinds):
        material, msrc = "Somber Smithing Stones", "wiki (upgrade template)"
    if not material and re.search(r"\b(?:is unupgradeable|cannot be (?:upgraded|reinforced)|"
                                  r"can't be (?:upgraded|reinforced)|unupgradeable)\b", scan, re.I):
        material, msrc = "Not upgradeable", "wiki (text)"
    if not material:
        m = (re.search(r"(?:upgrad\w*|reinforc\w*)\s+(?:\w+\s+){0,3}?(?:with|using|by)\s+"
                       r"(regular\s+|ordinary\s+|normal\s+)?(somber\s+)?smithing stones?", scan, re.I)
             or re.search(r"(?:^|[*•]\s*|\bit\s+|" + re.escape(own_name) + r"\s+)requires?\s+()(somber\s+)?smithing stones?",
                          scan, re.I | re.M)
             or re.search(r"\bit (?:needs|uses)\s+(regular\s+)?(somber\s+)?smithing stones?", scan, re.I))
        if m:
            material = "Somber Smithing Stones" if m.group(2) else "Smithing Stones"
            msrc = "wiki (text)"
    if not material and re.search(r"\bsomber (?:weapon|armament)", scan, re.I):
        material, msrc = "Somber Smithing Stones", "wiki (text)"
    levels = [lv for aff in tables.values() for lv in aff if lv != "growth_per_level"]
    max_lvl = max((int(lv.lstrip("+")) for lv in levels), default=None)
    if not material and max_lvl in (10, 25):
        material = "Somber Smithing Stones" if max_lvl == 10 else "Smithing Stones"
        msrc = "wiki (upgrade table max level)"

    aow = aff = csrc = None
    pos_inf = [p for p in POSITIVE_INFUSE if re.search(p, scan, re.I)]
    for mm in re.finditer(r"[^.\n]*\binfus[ai]ble\b[^.\n]*", scan, re.I):
        if not INFUSABLE_NEG_CONTEXT.search(mm.group(0)):
            pos_inf.append("described as infusable")
            break
    pos_aow = [p for p in POSITIVE_AOW if re.search(p, scan, re.I)] or (["compatible Ashes of War list"] if has_compat_list else [])
    affinity_tables = any(a != "Standard" for a in tables)
    if pos_inf or affinity_tables:
        aow = aff = True
        csrc = "wiki (text)" if pos_inf else "wiki (affinity upgrade tables)"
    elif pos_aow:
        aow, csrc = True, "wiki (text)"
    neg = []
    for mm in re.finditer(r"(?:cannot|can't|can not)\s+(?:\w+\s+){0,4}?(?:have its|be infused|be buffed or infused|"
                          r"be buffed or have its)(?![^.]*\bwith (?:most|some|certain)\b)[^.]*", scan, re.I):
        if not about_other_weapon(scan, mm.start(), own_name):
            neg.append(mm.group(0))
    neg += re.findall(r"nor can it be infused[^.]*", scan, re.I)
    negtxt = " ".join(neg).lower()
    if negtxt:
        if any(k in negtxt for k in ("affinit", "infus")):
            aff = False
        if any(k in negtxt for k in ("skill", "ash of war", "ashes of war", "infus")):
            aow = False
        csrc = "wiki (text)"
    # "can has/have its Ash of War changed, but not its Affinity" (typo-tolerant, partial capability)
    if re.search(r"\bcan ha(?:s|ve) its (?:ash of war|skill)", scan, re.I):
        aow, csrc = True, "wiki (text)"
    if re.search(r"\bbut not its affinit", scan, re.I):
        aff, csrc = False, "wiki (text)"
    if aow is False and aff is None:
        aff = False  # affinities are applied through Ashes of War
    if material is None and (aow or aff):
        material = "Smithing Stones"
        msrc = "deduced (wiki shows the weapon accepts Ashes of War/affinities; somber weapons cannot)"
    if material in ("Somber Smithing Stones", "Not upgradeable") and aow is None:
        aow = aff = False
        csrc = ("wiki rule (Ashes of War cannot be applied to weapons upgraded with Somber Smithing Stones)"
                if material.startswith("Somber") else csrc or "wiki (text)")
    buff = None
    if any(not about_other_weapon(scan, m.start(), own_name)
           for m in re.finditer(r"(?:cannot|can't) be buffed", scan, re.I)):
        buff = False
    elif any(not about_other_weapon(scan, m.start(), own_name)
             for m in re.finditer(r"\b(?:can|able to) be buffed\b", scan, re.I)):
        buff = True
    out = OrderedDict()
    out["material"] = material
    out["max_level"] = ({"Somber Smithing Stones": 10, "Smithing Stones": 25, "Not upgradeable": 0}[material]
                        if material else None)
    out["material_info_source"] = msrc
    out["ash_of_war_changeable"] = aow
    out["affinity_changeable"] = aff
    out["changeability_info_source"] = csrc
    if buff is not None:
        out["buffable"] = buff
    return out


# ----------------------------------------------------------------- main per-weapon parser

UPGRADE_LEGEND = [r"upper number in the Atk column", r"See the Weapon Scaling page",
                  r"All non-physical Affinities lower", r"negation receives the secondary",
                  r"denotes (Physical|elemental)"]


def parse_weapon(entry, content):
    page = entry["name"]
    c = strip_comments(content)
    # resolve the Great Épée style transclusions {{#lst:Page/Sub}}
    for m in re.finditer(r"\{\{\s*#lst:\s*([^}|]+?)\s*\}\}", c, re.I):
        sub = skill_pages.get(m.group(1).strip())
        if sub and sub["content"]:
            c = c.replace(m.group(0), strip_comments(sub["content"]))
    w = OrderedDict()
    box = next(find_templates(c, r"Infobox[ _]Weapon"), None)
    p = template_params(box[2]) if box else {}
    display = clean(p.get("title", "")) or re.sub(r"\s*\((weapon)\)$", "", page)
    w["name"] = display
    w["wiki_page"] = page
    w["url"] = entry["url"]
    w["category"] = entry["category"]
    w["weapon_type"] = text_or_none(p.get("type"))
    w["source"] = entry["source"]
    jp = text_or_none(p.get("japanese"))
    if jp:
        w["japanese_name"] = jp
    at = text_or_none(p.get("attack_type"))
    w["attack_type"] = [x.strip() for x in re.split(r"\s*[/&,]\s*|\s+and\s+", at) if x.strip()] if at else []

    # skill
    sk_raw = p.get("skills", "")
    sk_link = re.search(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", sk_raw)
    skill = OrderedDict()
    if sk_link and re.fullmatch(r"(?:(?:Skill|Ash of War)\s*:\s*)?No Skill", sk_link.group(1).strip(), re.I):
        skill["name"] = None
        skill["type"] = "No skill"
        skill["fp_cost"] = None
    elif sk_link:
        target = sk_link.group(1).strip()
        skill["name"] = clean(sk_link.group(2) or re.sub(r"^(Unique Skill|Skill|Ash of War)\s*:\s*", "", target))
        info = skill_info(target)
        skill["type"] = info.get("type") or ("Unique Skill" if target.startswith("Unique Skill") else None)
        if "ash_of_war_available" in info:
            skill["ash_of_war_available"] = info["ash_of_war_available"]
        skill["fp_cost"] = text_or_none(p.get("fp_cost"))
        for k in ("description", "attack_type", "stamina_cost_wiki", "default_affinity", "properties", "url"):
            if info.get(k):
                skill[{"url": "wiki_url"}.get(k, k)] = info[k]
    else:
        skill["name"] = text_or_none(sk_raw)
        skill["fp_cost"] = text_or_none(p.get("fp_cost"))
    w["skill"] = skill

    w["weight"] = num(p.get("weight"))
    w["attack_power"] = OrderedDict([(el, num(p.get(el + "_power"))) for el in ELEMENTS]
                                    + [("critical", num(p.get("critical")))])
    w["guarded_damage_negation"] = OrderedDict([(el, num(p.get(el + "_guarded"))) for el in ELEMENTS]
                                               + [("guard_boost", num(p.get("guard_boost")))])
    w["scaling"] = OrderedDict((a, grade(p.get(a + "_scale"))) for a in ATTRS)
    w["requirements"] = OrderedDict((a, num(p.get(a + "_req")) or 0) for a in ATTRS)
    for k, out in (("sorcery_scaling", "sorcery_scaling"), ("incant_scaling", "incantation_scaling"),
                   ("range", "range")):
        v = text_or_none(p.get(k))
        if v:
            w[out] = num(v) if num(v) is not None else v

    eff = clean(p.get("effects", ""), page, br="\n")
    effects = [e.strip(" .") for e in re.split(r"\n+", eff) if e.strip(" .-")]
    w["passive_effects"] = effects
    status = OrderedDict()
    for e in effects:
        for m in re.finditer(r"(blood ?loss|hemorrhage|frostbite|poison|scarlet rot|sleep|madness|death ?blight)\D{0,40}?\((\d+)\)", e, re.I):
            key = m.group(1).lower().replace(" ", "_").replace("hemorrhage", "blood_loss").replace("bloodloss", "blood_loss").replace("deathblight", "death_blight")
            status[key] = int(m.group(2))
    if status:
        w["status_buildup"] = status
    w["buy_price"] = num(p.get("buy_price"))
    w["sell_price"] = num(p.get("sell_price"))

    secs = sections(c)

    # description
    desc_text = None
    for _, _, raw in find_templates(secs.get("Description", c), r"Description"):
        dp = template_params(raw)
        en = [dp[k] for k in dp if re.fullmatch(r"EN(_line\d+)?", k)]
        desc_text = clean("\n\n".join(en), page, br=" ")
        if desc_text:
            break
    w["description"] = desc_text or None

    # acquisition
    acq = []
    cur = None
    acq_text = secs.get("Acquisition", "")
    acq_text = re.sub(r"\{\|.*?\n\|\}", "", acq_text, flags=re.S)
    acq_text = re.sub(r"<gallery.*?</gallery>", "", acq_text, flags=re.S | re.I)
    acq_text = re.sub(r"<tabber>.*?</tabber>", "", acq_text, flags=re.S)
    for line in acq_text.split("\n"):
        if not line.strip():
            continue
        hm = re.match(r"^\s*(?:<u>\s*)?'''\s*(?:<u>\s*)?([^'\n:]+?)\s*:?\s*(?:</u>\s*)?'''\s*:?\s*(?:</u>\s*)?(.*)$", line)
        if hm and not line.lstrip().startswith("*"):
            rest = hm.group(2)
            region = None
            sm = re.search(r"<sup>(.*?)</sup>", rest, re.S)
            if sm:
                region = clean(sm.group(1)).strip("() ") or None
                rest = rest.replace(sm.group(0), "")
            cur = OrderedDict([("method", clean(hm.group(1))), ("location", clean(rest, page) or None),
                               ("region", region), ("details", [])])
            acq.append(cur)
            continue
        m = re.match(r"^\s*([*#:]+)\s*(.*)$", line)
        depth, body = (len(m.group(1)), m.group(2)) if m else (0, line)
        t = clean(body, page)
        if not t:
            continue
        if cur is None:
            cur = OrderedDict([("method", None), ("location", None), ("region", None), ("details", [])])
            acq.append(cur)
        cur["details"].append(("→" * (depth - 1) + " " if depth > 1 else "") + t)
    w["acquisition"] = acq
    full_acq = clean(acq_text, page)
    regions = []
    for a in acq:
        for r in (a["region"], a["location"]):
            for part in re.split(r"\s*/\s*", r or ""):
                if part in MACRO_REGIONS and part not in regions:
                    regions.append(part)
    for r in MACRO_REGIONS:
        if re.search(r"(?<![\w'])" + re.escape(r) + r"(?![\w'])", full_acq) and r not in regions:
            regions.append(r)
    for alias, target in REGION_ALIASES.items():
        if target not in regions and re.search(r"(?<![\w'])" + re.escape(alias) + r"(?![\w'])", full_acq):
            if not any(target.split(",")[0] in r for r in regions):
                regions.append(target)
    w["regions_mentioned"] = regions
    flags = []
    if re.search(r"Remembrance", full_acq):
        flags.append("remembrance_weapon")
    if re.search(r"starting (equipment|armament|weapon)|\borigins?\b", full_acq, re.I):
        flags.append("starting_equipment")
    if re.search(r"\b(sold|purchas\w*|buy|bought)\b", full_acq, re.I):
        flags.append("purchasable")
    if re.search(r"drop (rate|chance)|\d+(\.\d+)?\s*%", full_acq, re.I):
        flags.append("random_enemy_drop")
    if re.search(r"invad\w*|invasion|\bNPC\b|quest", full_acq, re.I):
        flags.append("npc_or_quest_related")
    w["acquisition_flags"] = flags

    # upgrade information
    up_body = "".join(secs.get(k, "") for k in secs if re.search(r"upgrad", k, re.I))
    upgrade = OrderedDict()
    tables, kinds = parse_upgrade_templates(up_body or "")
    for label, seg in tabber_segments(up_body):
        for tm in re.finditer(r"^\{\|.*?^\|\}", seg, re.S | re.M):
            res = interpret_table(parse_wikitable(tm.group(0)), label if label in AFFINITIES else None)
            if not res:
                continue
            for aff, levels in res.items():
                tgt = tables.setdefault(aff, OrderedDict())
                for lvl, e in levels.items():
                    if lvl not in tgt:
                        tgt[lvl] = e
    up_notes = bullets(up_body, page, drop=UPGRADE_LEGEND) if up_body else []
    notes_body = secs.get("Notes", "")
    scan = "\n".join(up_notes + bullets(notes_body, page) + [clean(secs.get("_intro", ""), page)])
    compat = []
    for _, _, raw in find_templates(c, r"Weapon-Compatible[ _]Ashes[ _]of[ _]War"):
        compat += [k for k, v in template_params(raw).items() if v.strip().lower() in ("y", "yes", "1")]
    upgrade.update(classify_upgrade(kinds, tables, scan, bool(compat), page))
    rule = CLASS_RULES.get(entry["category"])
    if rule:
        srcs = [upgrade["changeability_info_source"]] if upgrade["changeability_info_source"] else []
        tag = f"wiki (class page: {entry['category']})"
        if rule["no_ash_of_war"]:
            if upgrade["ash_of_war_changeable"] is not True and upgrade["affinity_changeable"] is not True:
                upgrade["ash_of_war_changeable"] = upgrade["affinity_changeable"] = False
                srcs.append(tag)
        elif rule["affinity_locked_standard"] and upgrade["affinity_changeable"] is None:
            upgrade["affinity_changeable"] = False
            srcs.append(tag)
        if rule["compatible_ashes_of_war"] and upgrade["material"] == "Smithing Stones" \
                and upgrade["ash_of_war_changeable"] is None:
            upgrade["ash_of_war_changeable"] = True
            srcs.append(tag + " + regular material")
        upgrade["changeability_info_source"] = " + ".join(dict.fromkeys(srcs)) or None
        upgrade["class_ash_of_war_rule"] = rule["rule"]
    if up_notes:
        upgrade["notes"] = up_notes
    if tables:
        clean_tables = OrderedDict()
        for aff in sorted(tables, key=lambda a: AFFINITIES.index(a) if a in AFFINITIES else 99):
            lv = OrderedDict()
            for k in sorted(tables[aff], key=lvl_key):
                lv[k] = level_entry_to_schema(tables[aff][k]) if k != "growth_per_level" else tables[aff][k]
            clean_tables[aff] = lv
        upgrade["tables"] = clean_tables
        # sanity check vs. infobox base values
        std0 = clean_tables.get("Standard", {}).get("+0")
        if std0 and std0.get("attack"):
            checks = []
            a0 = std0["attack"].get("physical")
            if a0 is not None and w["attack_power"]["physical"] is not None:
                checks.append(abs(float(a0) - float(w["attack_power"]["physical"])) < 1.01)
            cr = std0.get("critical")
            if isinstance(cr, (int, float)) and w["attack_power"]["critical"] is not None:
                checks.append(cr == w["attack_power"]["critical"])
            for a in ("str", "dex"):
                sv = (std0.get("scaling") or {}).get(a)
                if isinstance(sv, dict) and sv.get("grade") and w["scaling"][a]:
                    checks.append(sv["grade"] == w["scaling"][a])
            gd = std0.get("guard") or {}
            if any(k in gd for k in ELEMENTS) and w["guarded_damage_negation"]["physical"]:
                gp = gd.get("physical")
                checks.append(isinstance(gp, (int, float))
                              and abs(float(gp) - float(w["guarded_damage_negation"]["physical"])) < 1.01)
            upgrade["tables_consistent_with_infobox"] = all(checks) if checks else None
    w["upgrade"] = upgrade

    # compatible ashes of war (only on a few pages)
    for _, _, raw in find_templates(c, r"Weapon-Compatible[ _]Ashes[ _]of[ _]War"):
        comp = [k for k, v in template_params(raw).items() if v.strip().lower() in ("y", "yes", "1")]
        def title(k):
            words = k.replace("_", " ").split()
            small = {"of", "the", "and", "a", "to"}
            return " ".join((wd if (i and wd in small) else (wd[0].upper() + wd[1:] if wd[0] != "(" else "(" + wd[1:2].upper() + wd[2:]))
                            for i, wd in enumerate(words))
        w["compatible_ashes_of_war"] = [title(k) for k in comp]

    if secs.get("Effects", "").strip():
        w["effects_details"] = bullets(secs["Effects"], page)
    w["notes"] = bullets(notes_body, page)
    patch = secs.get("Patch Notes") or secs.get("Patch notes")
    if patch:
        rows = []
        for tm in re.finditer(r"^\{\|.*?^\|\}", patch, re.S | re.M):
            grid = parse_wikitable(tm.group(0))
            if not grid:
                continue
            head = [clean(cl["raw"]).lower() for cl in grid[0]]
            keys = ["version" if "patch" in h or "version" in h else
                    "official_notes" if "official" in h else
                    "community_notes" if "community" in h else (h or f"col{i}")
                    for i, h in enumerate(head)]
            for r in grid[1:]:
                entry = OrderedDict()
                for k, cl in zip(keys, r):
                    t = clean(cl["raw"], page)
                    if t and not re.fullmatch(r"-+", t):
                        entry[k] = t
                if entry:
                    rows.append(entry)
        w["patch_notes"] = rows or bullets(patch, page)
    return w


# ----------------------------------------------------------------- run

def load_class_rules(path):
    """Class pages (Bows, Staves, ...): the 'Ashes of War' section states class-wide compatibility rules."""
    rules = {}
    if not path:
        return rules
    for p in json.load(open(path, encoding="utf-8"))["query"]["pages"]:
        if "revisions" not in p:
            continue
        secs = sections(strip_comments(p["revisions"][0]["slots"]["main"]["content"]))
        body = next((v for k, v in secs.items() if re.fullmatch(r"ashes of war", k, re.I)), None)
        if body is None:
            continue
        lines = []
        for line in body.split("\n"):
            s = line.strip()
            if not s:
                continue
            if s.startswith(("{|", "|", "!", "*", "=", "{{")):
                if lines:
                    break
                continue
            lines.append(clean(s))
        text = " ".join(t for t in lines if t)
        compat = list(dict.fromkeys(m.group(1).strip() for m in re.finditer(r"\[\[\s*Ash of War:\s*([^\]|]+)", body)))
        rules[p["title"]] = OrderedDict([
            ("rule", text),
            ("compatible_ashes_of_war", compat),
            ("no_ash_of_war", bool(re.search(r"not compatible with any Ashes? of War", text, re.I))),
            ("affinity_locked_standard", bool(re.search(r"locked to Standard Affinity", text, re.I))),
            ("source", "https://eldenring.wiki.gg/wiki/" + p["title"].replace(" ", "_")),
        ])
    return rules


CLASS_RULES = load_class_rules(CLASS_PAGES_PATH)
index = json.load(open(index_path, encoding="utf-8"))
ALL_WEAPON_NAMES.update(e["name"] for e in index)
if OTHER_NAMES_PATH:
    ALL_WEAPON_NAMES.update(json.load(open(OTHER_NAMES_PATH, encoding="utf-8")))
ALL_WEAPON_NAMES.update(re.sub(r"\s*\((weapon|Lord|Light)\)$", "", n) for n in list(ALL_WEAPON_NAMES))
_cats = {e["category"] for e in index} | {"Light Bows", "Bows", "Greatbows", "Crossbows", "Ballistas", "Staves",
                                          "Sacred Seals", "Daggers", "Hammers", "Spears", "Halberds", "Whips",
                                          "Flails", "Greatswords", "Twinblades", "Greataxes", "Axes", "Katanas",
                                          "Great Katanas", "Backhand Blades", "Fists", "Claws", "Reapers"}
GENERIC_NAMES.update(c.lower() for c in _cats)
GENERIC_NAMES.update({"staves": "staff", "axes": "axe", "greataxes": "greataxe"}.get(c.lower(), c.lower().rstrip("s"))
                     for c in _cats)
pages = json.load(open(pages_path, encoding="utf-8"))["pages"]
weapons, problems = [], []
for e in index:
    pg = pages.get(e["name"])
    if not pg or not pg["content"]:
        problems.append(("missing page", e["name"]))
        continue
    try:
        weapons.append(parse_weapon(e, pg["content"]))
    except Exception as ex:  # report and continue
        import traceback
        traceback.print_exc()
        problems.append(("parse error", e["name"], repr(ex)))

# second pass: estimate for weapons whose page does not document the upgrade path
CATALYSTS = ("Staves", "Sacred Seals")


def est_group(w):
    if w["category"] in CATALYSTS:
        return "catalyst"
    return "unique" if w["skill"].get("type") == "Unique Skill" else "other"


def documented(ws):
    return [w for w in ws if w["upgrade"]["material"] in ("Smithing Stones", "Somber Smithing Stones")]


ref = json.load(open(REFERENCE_PATH, encoding="utf-8"))["weapons"] if REFERENCE_PATH else []
pools = {
    "unique": [w for w in documented(weapons) + documented(ref) if est_group(w) == "unique"],
    "other": [w for w in documented(weapons) if est_group(w) == "other"],
    "catalyst": [w for w in documented(weapons) if est_group(w) == "catalyst"],
}
GROUP_TEXT = {"unique": "weapons with a Unique Skill", "other": "weapons with a non-unique skill",
              "catalyst": "catalysts (staves/seals)"}
for w in weapons:
    u = w["upgrade"]
    if u["material"]:
        continue
    g = est_group(w)
    pool = pools[g]
    cnt = Counter(x["upgrade"]["material"] for x in pool)
    if not cnt:
        continue
    guess, k = cnt.most_common(1)[0]
    ratio = k / len(pool)
    label = "use Somber Smithing Stones" if guess.startswith("Somber") else "use regular Smithing Stones"
    basis = f"{k} of {len(pool)} wiki-documented {GROUP_TEXT[g]} {label}"
    if g == "unique" and ref:
        basis += " (this file + reference dataset pooled)"
    conf = "low" if len(pool) < 8 else ("high" if ratio >= 0.9 else "medium" if ratio >= 0.75 else "low")
    if conf == "low":
        continue  # too few / too mixed documented examples: a guess would be noise
    u["estimate_if_undocumented"] = OrderedDict([
        ("material", guess),
        ("ash_of_war_changeable", u["ash_of_war_changeable"] if u["ash_of_war_changeable"] is not None
         else (guess == "Smithing Stones")),
        ("confidence", conf),
        ("basis", basis),
    ])

meta = OrderedDict()
meta["source_page"] = SOURCE_PAGE
meta["source_wiki"] = "eldenring.wiki.gg (MediaWiki API, page wikitext)"
meta["retrieved"] = "2026-10-31"
meta["weapon_count"] = len(weapons)
meta["counts_by_source"] = dict(Counter(w["source"] for w in weapons))
meta["counts_by_category"] = dict(Counter(w["category"] for w in weapons))
meta["field_notes"] = OrderedDict([
    ("attack_power / guarded_damage_negation / scaling / requirements", "Base values at +0 (Standard affinity) from the page infobox. Scaling grades: S > A > B > C > D > E, null = no scaling."),
    ("skill.fp_cost", "Wiki notation 'X (Y Z)': X = FP cost of the skill itself, Y/Z = FP cost of the light/heavy follow-ups. '-' = none."),
    ("skill.type", "'Unique Skill' = exclusive skill (never sold as an Ash of War); 'Ash of War skill' = an 'Ash of War: <name>' item exists on the wiki; 'Standard skill (no Ash of War item)' = non-unique skill with no Ash of War item."),
    ("passive_effects / status_buildup", "Innate on-hit effects at +0 (status buildup values grow with upgrades for some weapons)."),
    ("upgrade.material", "Smithing Stones => max +25; Somber Smithing Stones => max +10 and the weapon cannot take Ashes of War. null = the wiki page does not document it."),
    ("upgrade.*_info_source", "Where the value comes from: 'wiki (...)' = stated on the weapon page (template, text or upgrade table); 'deduced (...)' / 'game rule (...)' = strict logical consequence of what the page states."),
    ("upgrade.estimate_if_undocumented", "Only present when the wiki page does not document the upgrade path AND the documented examples of the same group (unique skill / other skill / catalyst) support at least medium confidence: statistical guess with its basis. Treat as unverified."),
    ("upgrade.ash_of_war_changeable / affinity_changeable", "true/false only when stated by the wiki (or implied by somber material); null = not documented."),
    ("upgrade.tables", "Per-affinity reinforcement data when the page provides it (levels '+N'; 'growth_per_level' = % growth per level as shown on the wiki). Scaling values: grade + coefficient when available. Coverage varies between pages."),
    ("upgrade.tables_consistent_with_infobox", "false = the page's upgrade table +0 physical attack differs from the infobox (wiki data inconsistency, prefer the infobox)."),
    ("regions_mentioned", "Map regions detected in the acquisition text (helper for game-progression analysis)."),
    ("acquisition_flags", "Heuristic tags derived from the acquisition text."),
    ("notes / acquisition.details", "Bullet text from the wiki; nested bullets are prefixed with '→' (one per nesting level)."),
    ("description / skill.description", "English in-game descriptions (weapon page / skill page)."),
    ("skill.stamina_cost_wiki", "Same 'X (Y Z)' notation as fp_cost, from the skill page."),
    ("upgrade.buffable", "Only present when the wiki states whether the weapon can be buffed (grease/spells)."),
    ("patch_notes", "Balance changes listed on the weapon page: game version, official patch note, community explanation."),
    ("compatible_ashes_of_war", "Only on the few pages that list them."),
])
def _has(field):
    return any(field in w for w in weapons)


if _has("range") or _has("sorcery_scaling") or _has("incantation_scaling"):
    meta["field_notes"]["range"] = "Bow/crossbow/ballista range as shown in the infobox (in-game 'Range' value)."
    meta["field_notes"]["sorcery_scaling / incantation_scaling"] = "Catalysts: base spell power at +0 from the infobox (Sorcery Scaling for staves, Incantation Scaling for seals)."
    meta["field_notes"]["upgrade.tables.*.spell_buff"] = "Catalysts: sorcery/incantation scaling at that upgrade level ('?' on the wiki => omitted)."
if _has("effects_details"):
    meta["field_notes"]["effects_details"] = "Content of the page's 'Effects' section (e.g. which spells a seal boosts and by how much)."
if any(w["upgrade"]["material"] == "Not upgradeable" for w in weapons):
    meta["field_notes"]["upgrade.material = 'Not upgradeable'"] = "The wiki states the weapon cannot be reinforced (max_level 0)."
if CLASS_RULES:
    meta["field_notes"]["upgrade.class_ash_of_war_rule"] = "Class-wide Ash of War rule quoted from the weapon class page (see metadata.class_rules)."
    meta["class_rules"] = CLASS_RULES
meta["upgrade_path_documentation"] = OrderedDict([
    ("documented_by_wiki", sum(1 for w in weapons if w["upgrade"]["material"])),
    ("undocumented", sum(1 for w in weapons if not w["upgrade"]["material"])),
    ("undocumented_with_estimate", sum(1 for w in weapons if "estimate_if_undocumented" in w["upgrade"])),
])
meta["wiki_inconsistencies_flagged"] = [w["name"] for w in weapons
                                        if w["upgrade"].get("tables_consistent_with_infobox") is False]
out = OrderedDict([("metadata", meta), ("weapons", weapons)])
json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("weapons:", len(weapons))
print("problems:", problems)
