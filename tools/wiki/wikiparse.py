"""Shared helpers to turn eldenring.wiki.gg wikitext into clean structured data."""
import html
import re
from collections import OrderedDict

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
    "Ancient Ruins of Rauh", "Rauh Base", "Charo's Hidden Grave", "Enir-Ilim", "Land of the Tower",
]
DLC_REGIONS = set(MACRO_REGIONS[MACRO_REGIONS.index("Gravesite Plain"):]) | {"Realm of Shadow", "Land of Shadow"}
REGION_ALIASES = {
    "Leyndell": "Leyndell, Royal Capital", "Raya Lucaria": "Academy of Raya Lucaria",
    "Farum Azula": "Crumbling Farum Azula", "Haligtree": "Miquella's Haligtree",
    "Elphael": "Elphael, Brace of the Haligtree", "Nokron": "Nokron, Eternal City",
    "Nokstella": "Nokstella, Eternal City", "Mohgwyn": "Mohgwyn Palace",
    "Shunning-Grounds": "Subterranean Shunning-Grounds", "Liurnia": "Liurnia of the Lakes",
    "Mount Gelmir": "Mt. Gelmir", "Altus": "Altus Plateau",
    "Belurat": "Belurat, Tower Settlement", "Mountaintops": "Mountaintops of the Giants",
    "Snowfield": "Consecrated Snowfield",
}


def strip_comments(s):
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    return s


def match_close(text, start, open_tok, close_tok):
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
    for m in re.finditer(r"\{\{\s*(?:Template:)?(?:" + name_regex + r")\s*(?=[|}\n])", text, re.I):
        end = match_close(text, m.start(), "{{", "}}")
        yield m.start(), end, text[m.start():end]


def split_top(s, sep="|"):
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
    params, positional = OrderedDict(), []
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            if "[[" in k or "{{" in k:
                positional.append(p.strip())
                continue
            params[k.strip()] = v.strip()
        else:
            positional.append(p.strip())
    if positional:
        params["_positional"] = positional
    return params


def remove_files(s, keep_name=False):
    out, i = [], 0
    while True:
        m = re.search(r"\[\[\s*(?:File|Image)\s*:", s[i:], re.I)
        if not m:
            out.append(s[i:])
            break
        a = i + m.start()
        out.append(s[i:a])
        b = match_close(s, a, "[[", "]]")
        # a target like 'link=Cookbook [1]' ends with ']]]': include the bracket that closes '[1]'
        while s[a:b].count("[") > s[a:b].count("]") and b < len(s) and s[b] == "]":
            b += 1
        if keep_name:
            name = s[a:b][2:-2].split("|")[0].split(":", 1)[1]
            out.append(" " + re.sub(r"\.(png|jpg|jpeg|gif|webp|svg)$", "", name.strip(), flags=re.I) + " ")
        i = b
    return "".join(out)


def clean(s, page="", br=" ", keep_files=False):
    if s is None:
        return ""
    s = strip_comments(s)
    s = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, s)
    s = re.sub(r"\{\{\s*ER\s*\}\}", "Elden Ring", s)
    s = re.sub(r"\{\{\s*SOTE\s*(\|[^{}]*)?\}\}", "Shadow of the Erdtree", s, flags=re.I)
    s = re.sub(r"\{\{\s*TP\s*\}\}", "Tarnished Pack", s)
    s = re.sub(r"\{\{\s*snd\s*\}\}", " – ", s, flags=re.I)
    s = re.sub(r"\{\{\s*sic\s*(\|[^{}]*)?\}\}", " [sic]", s, flags=re.I)
    s = re.sub(r"\{\{\s*(?:R|icon\|runes?)\s*\}\}", "", s, flags=re.I)
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = remove_files(s, keep_name=keep_files)
    s = re.sub(r"\[\[\s*(?:Category|[a-z]{2,3}(?:-[a-z]{2,4})?)\s*:[^\]]*\]\]", "", s)
    # links whose target/label contains [n] brackets, e.g. [[Cookbook 4|Cookbook [4] ]] or [[Bell Bearing [1]]]
    s = re.sub(r"\[\[[^\[\]|]*(?:\[[^\[\]]*\][^\[\]|]*)*\|([^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\[\]|]*\[[^\[\]]*\][^\[\]|]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[(?:[^|\]\[]*\|)?([^\]\[]*)\](?!\])", r"\1", s)
    s = re.sub(r"\[https?://[^\s\]]+\s*([^\]]*)\]", r"\1", s)
    s = re.sub(r"'{2,}", "", s)
    s = re.sub(r"<br\s*/?>", br, s, flags=re.I)
    s = re.sub(r"<sup>\s*", " ", s, flags=re.I)
    s = re.sub(r"</?[a-zA-Z][^>]*>", "", s)
    s = html.unescape(s).replace(" ", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"\s+([,.;:!?)])", r"\1", s)
    s = re.sub(r"\(\s+", "(", s)
    return s.strip()


def sections(text):
    out = OrderedDict()
    parts = re.split(r"^==(?!=)[ \t]*(.*?)[ \t]*(?<!=)==[ \t]*$", text, flags=re.M)
    out["_intro"] = parts[0]
    for i in range(1, len(parts), 2):
        name = clean(remove_files(parts[i]))
        out[name] = out.get(name, "") + "\n" + parts[i + 1]
    return out


def bullets(text, page="", drop=()):
    out = []
    text = re.sub(r"^\{\|.*?^\|\}", "", text, flags=re.S | re.M)
    text = re.sub(r"<tabber>.*?</tabber>", lambda m: re.sub(r"\|-\|", "\n", m.group(0)), text, flags=re.S)
    text = re.sub(r"<gallery.*?</gallery>", "", text, flags=re.S | re.I)
    for _, _, raw in list(find_templates(text, r"[^|{}]+")):
        if "\n" in raw:
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
        if re.match(r"^\s*[A-Za-z][\w ]*=\s*$", line) or re.match(r"^\s*\|-\|", line) \
                or re.match(r"^\s*</?tabber>\s*$", line):   # tabber labels / separators like 'Retail=' or '|-|Repaired='
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
    # Le wiki écrit parfois les décimales sans zéro initial (".3068") : elles sont acceptées.
    if not re.fullmatch(r"[-+]?(?:\d+(?:\.\d+)?|\.\d+)", t):
        return None
    f = float(t)
    return int(f) if f.is_integer() and "." not in t else f


def value(v, page=""):
    """Clean an infobox value: number if purely numeric, else text (None if empty / placeholder)."""
    t = clean(v or "", page, br="; ")
    if t in ("", "-", "–", "?", "??", "N/A", "n/a", "None", "none"):
        return None
    n = num(t)
    return n if n is not None else t


def split_top_cells(body):
    return split_top(body.replace("||", "\x00"), sep="\x00")


def parse_wikitable(tbl):
    rows, cur, last_cell = [], None, None
    for line in tbl.split("\n")[1:]:
        s = line.strip()
        if s.startswith("|}"):
            break
        if s.startswith("|+"):
            continue
        if s.startswith("|-"):
            cur = []
            rows.append(cur)
            last_cell = None
            continue
        if s.startswith("!") or s.startswith("|"):
            header = s.startswith("!")
            body = s[1:]
            chunks = re.split(r"!!|\|\|", body) if header else split_top_cells(body)
            if cur is None:
                cur = []
                rows.append(cur)
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
                out.append(pending.pop((r, c)))
                c += 1
            cell = next(it, None)
            if cell is None:
                break
            for _ in range(min(cell["cs"], 50)):
                out.append(cell)
                for k in range(1, min(cell["rs"], 200)):
                    pending[(r + k, c)] = cell
                c += 1
        grid.append(out)
    return grid


def table_records(tbl, page=""):
    """Wikitable -> list of {column: value} using the leading header rows as column names."""
    grid = parse_wikitable(tbl)
    if not grid:
        return []
    nhead = 0
    for row in grid:
        if row and all(c["h"] for c in row):
            nhead += 1
        else:
            break
    if nhead == 0:
        return [[clean(c["raw"], page, br="; ") for c in row] for row in grid]
    ncols = max(len(r) for r in grid)
    names = []
    for ci in range(ncols):
        parts, seen = [], set()
        for r in grid[:nhead]:
            if ci < len(r) and id(r[ci]) not in seen:
                seen.add(id(r[ci]))
                t = clean(r[ci]["raw"], page, keep_files=False)
                if t and t not in parts:
                    parts.append(t)
        names.append(" / ".join(parts) or f"col{ci + 1}")
    recs = []
    for row in grid[nhead:]:
        rec, seen = OrderedDict(), set()
        for ci, cell in enumerate(row):
            if ci >= len(names):
                break
            t = clean(cell["raw"], page, br="; ")
            if t in ("", "-"):
                continue
            key = names[ci]
            if key in rec and id(cell) in seen:
                continue
            seen.add(id(cell))
            n = num(t)
            rec[key] = n if n is not None else t
        if rec:
            recs.append(rec)
    return recs


def section_tables(text, page=""):
    return [r for r in (table_records(m.group(0), page) for m in re.finditer(r"^\{\|.*?^\|\}", text, re.S | re.M)) if r]


def description_en(text, page=""):
    for _, _, raw in find_templates(text, r"Description"):
        dp = template_params(raw)
        en = [dp[k] for k in dp if re.fullmatch(r"EN(_line\d+)?", k)]
        d = clean("\n\n".join(en), page, br=" ")
        if d:
            return d
    return None


def regions_in(text, extra=()):
    regions = []
    for r in list(extra) + MACRO_REGIONS:
        if r and r in MACRO_REGIONS and r not in regions and \
                re.search(r"(?<![\w'])" + re.escape(r) + r"(?![\w'])", text):
            regions.append(r)
    for alias, target in REGION_ALIASES.items():
        if target not in regions and re.search(r"(?<![\w'])" + re.escape(alias) + r"(?![\w'])", text):
            if not any(target.split(",")[0] in r for r in regions):
                regions.append(target)
    return regions


def parse_acquisition(acq_text, page=""):
    acq_text = re.sub(r"^\{\|.*?^\|\}", "", acq_text, flags=re.S | re.M)
    acq_text = re.sub(r"<gallery.*?</gallery>", "", acq_text, flags=re.S | re.I)
    acq_text = re.sub(r"<tabber>|</tabber>|^\|-\|.*$", "", acq_text, flags=re.M)
    entries, cur = [], None
    for line in acq_text.split("\n"):
        if not line.strip():
            continue
        hm = re.match(r"^\s*(?:<u>\s*)?'''\s*(?:<u>\s*)?([^'\n:]+?)\s*:?\s*(?:</u>\s*)?'''\s*:?\s*(?:</u>\s*)?(.*)$", line)
        if hm and not line.lstrip().startswith("*"):
            rest, region = hm.group(2), None
            sm = re.search(r"<sup>(.*?)</sup>", rest, re.S)
            if sm:
                region = clean(sm.group(1)).strip("() ") or None
                rest = rest.replace(sm.group(0), "")
            cur = OrderedDict([("method", clean(hm.group(1))), ("location", clean(rest, page) or None),
                               ("region", region), ("details", [])])
            entries.append(cur)
            continue
        m = re.match(r"^\s*([*#:]+)\s*(.*)$", line)
        depth, body = (len(m.group(1)), m.group(2)) if m else (0, line)
        t = clean(body, page)
        if not t or re.fullmatch(r"[A-Za-z ]+=", t):
            continue
        if cur is None:
            cur = OrderedDict([("method", None), ("location", None), ("region", None), ("details", [])])
            entries.append(cur)
        cur["details"].append(("→" * (depth - 1) + " " if depth > 1 else "") + t)
    full = clean(acq_text, page)
    extra = []
    for a in entries:
        for r in (a["region"], a["location"]):
            extra += re.split(r"\s*/\s*", r or "")
    regions = regions_in(full, extra)
    flags = []
    if re.search(r"Remembrance", full):
        flags.append("remembrance_trade")
    if re.search(r"\b(sold|purchas\w*|buy|bought)\b", full, re.I):
        flags.append("purchasable")
    if re.search(r"drop (rate|chance)|\d+(\.\d+)?\s*%", full, re.I):
        flags.append("random_enemy_drop")
    if re.search(r"invad\w*|invasion|\bNPC\b|quest", full, re.I):
        flags.append("npc_or_quest_related")
    if re.search(r"\b(craft\w*|cookbook)\b", full, re.I):
        flags.append("craftable")
    return entries, regions, flags


def parse_patch_notes(text, page=""):
    rows = []
    for tm in re.finditer(r"^\{\|.*?^\|\}", text, re.S | re.M):
        grid = parse_wikitable(tm.group(0))
        if not grid:
            continue
        head = [clean(cl["raw"]).lower() for cl in grid[0]]
        keys = ["version" if "patch" in h or "version" in h else "official_notes" if "official" in h else
                "community_notes" if "community" in h else (h or f"col{i}") for i, h in enumerate(head)]
        for r in grid[1:]:
            e = OrderedDict()
            for k, cl in zip(keys, r):
                t = clean(cl["raw"], page)
                if t and not re.fullmatch(r"-+", t):
                    e[k] = t
            if e:
                rows.append(e)
    return rows or bullets(text, page)


def dlc_from_intro(content):
    """Fallback DLC label from the page's opening text."""
    intro = sections(strip_comments(content))["_intro"]
    if re.search(r"\{\{\s*TP\s*\}\}|Tarnished Pack|Tarnished Edition", intro):
        return "Tarnished Pack"
    if re.search(r"\{\{\s*SOTE\s*(\|[^}]*)?\}\}|Shadow of the Erdtree", intro, re.I):
        return "Shadow of the Erdtree"
    return "Base game"


def wiki_url(title):
    return "https://eldenring.wiki.gg/wiki/" + title.replace(" ", "_")


def shop_rows(text, page=""):
    """{{Shop table|row |name= |cost= |stock= |note=}} templates -> list of records."""
    rows = []
    for _, _, raw in find_templates(text, r"Shop[ _]table"):
        p = template_params(raw)
        if "row" not in [x.lower() for x in p.get("_positional", [])]:
            continue
        r = OrderedDict()
        for k in ("name", "cost", "stock", "note"):
            v = value(p.get(k), page)
            if v is not None:
                r["item" if k == "name" else k] = v
        if r:
            rows.append(r)
    return rows


def resolve_lst(content, source_pages):
    """Replace {{#lst:Page|Section}} (labeled section transclusion) with the referenced content.
    source_pages: {title: wikitext}. Unknown pages/sections are left as an empty string."""
    def repl(m):
        page, _, sect = m.group(1).partition("|")
        src = source_pages.get(page.strip())
        if src is None:
            return ""
        if not sect.strip():
            return src
        s = re.escape(sect.strip())
        mm = re.search(r'<section\s+begin\s*=\s*"?' + s + r'"?\s*/>(.*?)<section\s+end\s*=\s*"?' + s + r'"?\s*/>',
                       src, re.S | re.I)
        return mm.group(1) if mm else ""
    return re.sub(r"\{\{\s*#lst:\s*([^{}]+?)\s*\}\}", repl, content, flags=re.I)
