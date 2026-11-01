"""Game mechanics pages -> mechanics.json. Usage: build_mechanics.py <candidates.json> <mechanics_pages.json> <out.json>"""
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikiparse as wp  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
cands = json.load(open(sys.argv[1], encoding="utf-8"), object_pairs_hook=OrderedDict)
pages = json.load(open(sys.argv[2], encoding="utf-8"))["pages"]
SKIP = re.compile(r"^(trivia|gallery|references|see also|dialogue|videos?|concept art|lore|history|notes and trivia)$", re.I)
SKIP_PAGES = {"Summoning (disambiguation)"}
DLC_TOPICS = {"Scadutree Fragment", "Revered Spirit Ash"}

topics, seen = [], set()
for category, titles in cands.items():
    for t in titles:
        v = pages.get(t)
        if not v or not v["content"]:
            continue
        page = v["resolved"]
        if page in seen or page in SKIP_PAGES:
            continue
        seen.add(page)
        c = re.sub(r"\{\{\s*PAGENAME\s*\}\}", page, wp.strip_comments(v["content"]))
        T = OrderedDict()
        T["topic"] = category
        T["title"] = page
        T["url"] = wp.wiki_url(page)
        T["source"] = "Shadow of the Erdtree" if page in DLC_TOPICS else wp.dlc_from_intro(v["content"])
        box = next(wp.find_templates(c, r"Infobox[ _][^|}\n]*"), None)
        if box:
            info = OrderedDict((k, wp.value(val, page)) for k, val in wp.template_params(box[2]).items()
                               if k not in {"image", "image1", "title", "caption", "_positional", "japanese"}
                               and wp.value(val, page) is not None)
            if info:
                T["infobox"] = info
        secs = wp.sections(c)
        intro = secs["_intro"]
        intro_tables = wp.section_tables(intro, page)
        for _, _, raw in list(wp.find_templates(intro, r"[^|{}]+")):
            if "\n" in raw or re.match(r"\{\{\s*(?:Infobox|for|stub|quote|DISPLAYTITLE|clear)", raw, re.I):
                intro = intro.replace(raw, "")
        T["summary"] = wp.bullets(intro.split("<tabber>")[0], page)
        if intro_tables:
            T["summary_tables"] = intro_tables
        S = OrderedDict()
        for name, body in secs.items():
            if name == "_intro" or SKIP.match(name) or not body.strip():
                continue
            lines, tabs = wp.bullets(body, page), wp.section_tables(body, page)
            if lines or tabs:
                S[name] = OrderedDict([("text", lines)] + ([("tables", tabs)] if tabs else []))
        T["sections"] = S
        topics.append(T)

meta = OrderedDict([
    ("source_pages", sorted(t["url"] for t in topics)),
    ("retrieved", "2026-10-31"),
    ("count", len(topics)),
    ("counts_by_topic", dict(Counter(t["topic"] for t in topics))),
    ("counts_by_source", dict(Counter(t["source"] for t in topics))),
    ("field_notes", OrderedDict([
        ("topic", "Grouping chosen for this file (attributes & stats, status effects, damage types, weapons & upgrades, combat, progression)."),
        ("source", "'Shadow of the Erdtree' for DLC-only mechanics (Scadutree Blessing, Revered Spirit Ash); general pages are 'Base game' even if they mention DLC items."),
        ("summary / sections", "Opening text and each section of the wiki page: text lines (nested bullets prefixed with '→', sub-headings as [Heading]) and tables as lists of records."),
    ])),
])
json.dump(OrderedDict([("metadata", meta), ("topics", topics)]), open(sys.argv[3], "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("mechanic pages:", len(topics), meta["counts_by_topic"], meta["counts_by_source"])
