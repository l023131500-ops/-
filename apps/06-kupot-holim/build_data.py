#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build structured recommendation data from Bkalot health-fund comparison CSVs.
Uses ONLY our own data (no external research). Output: data/kupot_data.json
"""
import csv, collections, json, re, os

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")

FUNDS = ["כללית", "מכבי", "מאוחדת", "לאומית"]

def fund_family(best):
    b = (best or "").strip()
    for f in FUNDS:
        if b.startswith(f):
            return f
    return None

def clean(s):
    return re.sub(r"\s+", " ", (s or "").strip())

def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

funds_rows = load(os.path.join(DATA, "funds.csv"))
gov_rows = load(os.path.join(DATA, "gov.csv"))
ngo_rows = load(os.path.join(DATA, "ngo.csv"))

# ---- Topics (per-fund benefits) ----
topics = []
for x in funds_rows:
    cat = clean(x.get("קטגוריה"))
    topic = clean(x.get("נושא / זכות"))
    if not topic:
        continue
    topics.append({
        "catalog": clean(x.get("מס' קטלוגי")),
        "category": cat,
        "subCategory": clean(x.get("תת-קטגוריה")),
        "topic": topic,
        "audience": clean(x.get("קהל יעד")),
        "description": clean(x.get("תיאור הזכות")),
        "range": clean(x.get("טווח הטבה")),
        "clalit": clean(x.get("כללית")),
        "maccabi": clean(x.get("מכבי")),
        "meuhedet": clean(x.get("מאוחדת")),
        "leumit": clean(x.get("לאומית")),
        "bestFund": clean(x.get("הקופה המשתלמת")),
        "source": clean(x.get("מקור")),
    })

# ---- Category winner tally ----
cat_win = collections.defaultdict(collections.Counter)
for t in topics:
    fam = fund_family(t["bestFund"])
    if t["category"] and fam:
        cat_win[t["category"]][fam] += 1

categories = []
for cat, cnt in sorted(cat_win.items(), key=lambda kv: -sum(kv[1].values())):
    scored = sum(cnt.values())
    winner = cnt.most_common(1)[0][0] if cnt else None
    categories.append({
        "name": cat,
        "scoredTopics": scored,
        "totalTopics": sum(1 for t in topics if t["category"] == cat),
        "tally": dict(cnt),
        "winner": winner,
        "ranking": [{"fund": k, "wins": v} for k, v in cnt.most_common()],
    })

# ---- Overall ----
overall = collections.Counter()
for cnt in cat_win.values():
    overall += cnt

# ---- Life-situation profiles: map to categories from OUR data ----
# Each profile aggregates the winner across its relevant categories.
PROFILES = [
    {"id": "pregnancy", "title": "הריון, לידה ופריון", "icon": "baby",
     "desc": "זוגות בתהליך פוריות, נשים בהריון ולאחר לידה",
     "cats": ["הריון, לידה ופריון", "רפואה מונעת ובדיקות סקר"]},
    {"id": "children", "title": "משפחה עם ילדים", "icon": "users",
     "desc": "משפחות עם ילדים — התפתחות, חיסונים, מעקב",
     "cats": ["ילדים והתפתחות הילד", "רפואת שיניים", "רפואה מונעת ובדיקות סקר"]},
    {"id": "seniors", "title": "גיל שלישי וקשישים", "icon": "heart-pulse",
     "desc": "מבוגרים, גיל שלישי וטיפול בבית",
     "cats": ["רפואה בבית וגיל שלישי", "שיקום, הבראה ונופש", "אביזרים רפואיים ומכשור"]},
    {"id": "chronic", "title": "מחלות כרוניות ותרופות", "icon": "pill",
     "desc": "מטופלים כרוניים הזקוקים לתרופות ומעקב שוטף",
     "cats": ["תרופות", "לב, כלי דם וקרדיולוגיה", "רפואה מונעת ובדיקות סקר"]},
    {"id": "oncology", "title": "אונקולוגיה (סרטן)", "icon": "shield",
     "desc": "מטופלים אונקולוגיים ובני משפחותיהם",
     "cats": ["אונקולוגיה (סרטן)", "ניתוחים וטיפולים בחו\"ל", "תרופות"]},
    {"id": "dental", "title": "רפואת שיניים", "icon": "smile",
     "desc": "מי שזקוק לטיפולי שיניים לילדים או מבוגרים",
     "cats": ["רפואת שיניים"]},
    {"id": "vision", "title": "ראייה ואופטיקה", "icon": "eye",
     "desc": "משקפיים, עדשות וטיפולי עיניים",
     "cats": ["ראייה ואופטיקה"]},
    {"id": "complementary", "title": "רפואה משלימה ואורח חיים", "icon": "leaf",
     "desc": "מי שמעדיף רפואה משלימה, תזונה וספורט",
     "cats": ["רפואה משלימה ואורח חיים", "רפואה אסתטית"]},
    {"id": "surgery_abroad", "title": "ניתוחים וטיפולים בחו\"ל", "icon": "plane",
     "desc": "מי ששוקל ניתוח פרטי או טיפול בחו\"ל",
     "cats": ["ניתוחים וטיפולים בחו\"ל", "אביזרים רפואיים ומכשור"]},
]

def profile_reco(cats):
    tally = collections.Counter()
    per_cat = []
    for c in cats:
        cnt = cat_win.get(c)
        if not cnt:
            continue
        tally += cnt
        top = cnt.most_common(1)[0]
        per_cat.append({"category": c, "winner": top[0], "wins": top[1],
                        "ranking": [{"fund": k, "wins": v} for k, v in cnt.most_common()]})
    ranked = tally.most_common()
    return {
        "recommended": ranked[0][0] if ranked else None,
        "runnerUp": ranked[1][0] if len(ranked) > 1 else None,
        "tally": dict(tally),
        "ranking": [{"fund": k, "wins": v} for k, v in ranked],
        "perCategory": per_cat,
    }

profiles_out = []
for p in PROFILES:
    reco = profile_reco(p["cats"])
    # sample supporting topics (best-fund matches recommended) for evidence
    examples = [t for t in topics
                if t["category"] in p["cats"] and fund_family(t["bestFund"]) == reco["recommended"]][:6]
    profiles_out.append({
        **p,
        **reco,
        "examples": [{"topic": e["topic"], "range": e["range"], "bestFund": e["bestFund"],
                      "description": e["description"][:240]} for e in examples],
    })

out = {
    "meta": {
        "generatedFrom": "Bkalot health_funds_comparison CSVs (our own data)",
        "totalTopics": len(topics),
        "funds": FUNDS,
        "overallWins": [{"fund": k, "wins": v} for k, v in overall.most_common()],
    },
    "categories": categories,
    "profiles": profiles_out,
    "topics": topics,
    "ngo": [{"catalog": clean(x.get("מס' קטלוגי")), "category": clean(x.get("קטגוריה")),
             "org": clean(x.get("נושא / זכות")), "audience": clean(x.get("קהל יעד")),
             "description": clean(x.get("תיאור הזכות"))} for x in ngo_rows if clean(x.get("נושא / זכות"))],
    "gov": [{"catalog": clean(x.get("מס' קטלוגי")), "category": clean(x.get("קטגוריה")),
             "topic": clean(x.get("נושא / זכות")), "audience": clean(x.get("קהל יעד")),
             "description": clean(x.get("תיאור הזכות")), "range": clean(x.get("טווח הטבה"))}
            for x in gov_rows if clean(x.get("נושא / זכות"))],
}

with open(os.path.join(DATA, "kupot_data.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("topics:", len(topics), "| categories:", len(categories),
      "| profiles:", len(profiles_out), "| ngo:", len(out["ngo"]), "| gov:", len(out["gov"]))
print("\n=== profile recommendations ===")
for p in profiles_out:
    print(f"  {p['title']:32s} → {p['recommended']}  (runner-up: {p['runnerUp']})")
