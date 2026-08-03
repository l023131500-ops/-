#!/usr/bin/env python3
"""AI worker for the Haredi ad-design engine.

Invoked by the Node/Express server via child_process. Reads a single JSON
request from stdin and writes a single JSON response to stdout.

Auth: relies on the platform LLM API proxy env vars that are injected into the
server process when it is started with api_credentials=["llm-api:website"].
Child Python processes inherit those env vars automatically.

Commands (field "cmd"):
  - "copy":       Claude generates ad copy variants for given fields/context.
  - "concepts":   Claude reasons about a brief and returns concept directions.
  - "background": llm_api image model generates a decorative background (no text).

All user-facing text is Hebrew.
"""

import asyncio
import base64
import json
import os
import sys
import traceback

import requests

# מודל טקסט — Anthropic ישיר (מפתח בתשלום, נשמר גם לאחר פרסום דרך custom-cred proxy).
# ניתן לדרוס דרך משתנה סביבה.
TEXT_MODEL = os.environ.get("ANTHROPIC_TEXT_MODEL", "claude-sonnet-4-5-20250929")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def _read_request() -> dict:
    raw = sys.stdin.read()
    return json.loads(raw) if raw.strip() else {}


def _fail(msg: str, detail: str = "") -> None:
    print(json.dumps({"ok": False, "error": msg, "detail": detail[:800]}, ensure_ascii=False))
    sys.exit(0)


def _ok(payload: dict) -> None:
    payload["ok"] = True
    print(json.dumps(payload, ensure_ascii=False))
    sys.exit(0)


# ─────────────────────────────────────────────────────────────────────────────
# Claude text (Anthropic Messages API via platform proxy)
# ─────────────────────────────────────────────────────────────────────────────
def _claude(system: str, user: str, max_tokens: int = 1500) -> str:
    """Anthropic Messages API ישיר — המפתח מוזרק אוטומטית דרך פרוקסי ה-HTTPS
    כאשר השרת רץ עם api_credentials=["custom-cred:api.anthropic.com"].
    זהו הנתיב שממשיך לעבוד גם לאחר פרסום."""
    body = json.dumps({
        "model": TEXT_MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    # גיבוי: אם קיים מפתח מפורש בסביבה — נשלח אותו ישירות.
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        headers["x-api-key"] = key
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or True
    resp = requests.post(ANTHROPIC_URL, data=body, headers=headers, timeout=90, verify=ca)
    resp.raise_for_status()
    data = resp.json()
    parts = []
    for block in data.get("content", []):
        if block.get("type") == "text" and block.get("text"):
            parts.append(block["text"])
    return "".join(parts).strip()


def _extract_json(text: str):
    """Claude sometimes wraps JSON in prose/fences. Extract the JSON object/array."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1] if t.count("```") >= 2 else t
        if t.startswith("json"):
            t = t[4:]
        t = t.strip("` \n")
    # find first { or [
    for open_c, close_c in (("{", "}"), ("[", "]")):
        i = t.find(open_c)
        j = t.rfind(close_c)
        if i != -1 and j != -1 and j > i:
            try:
                return json.loads(t[i : j + 1])
            except Exception:
                continue
    return json.loads(t)


def cmd_copy(req: dict) -> None:
    """Generate Hebrew ad copy for given fields.

    req: { category, message, audience, mood[], tone, fields{title,subtitle,body,...},
           variants:int }
    Returns: { variants: [ {title, subtitle, body, cta, extra{...}} ] }
    """
    category = req.get("category", "")
    message = req.get("message", "")
    audience = req.get("audience", "")
    mood = ", ".join(req.get("mood", []) or [])
    fields = req.get("fields", {}) or {}
    n = int(req.get("variants", 3))

    system = (
        "אתה קופירייטר בכיר המתמחה בפרסום לציבור החרדי בישראל. "
        "אתה כותב עברית מדויקת, מכובדת ונאמנה למקורות, בשפה שמתאימה לקהל תורני. "
        "אתה מכיר את ניסוחי ההזמנות, שיעורי התורה, אירועים, שמחות, והכרזות קהילתיות. "
        "אתה משתמש בביטויים כמו 'בס\"ד', 'לזכות', 'מעמד', 'התוועדות', כשמתאים. "
        "אינך ממציא עובדות (תאריכים/שמות/מקומות) — אם חסר מידע תשאיר שדה ריק. "
        "החזר אך ורק JSON תקין ללא טקסט נוסף."
    )
    known = json.dumps(fields, ensure_ascii=False)
    user = (
        f"קטגוריה: {category or 'כללי'}\n"
        f"קהל יעד: {audience or 'כללי'}\n"
        f"אווירה: {mood or 'מכובד'}\n"
        f"המסר/רעיון של הלקוח: {message or '(לא נמסר)'}\n"
        f"שדות קיימים (השלם/שפר בהתאם): {known}\n\n"
        f"כתוב {n} וריאציות קופי למודעה. כל וריאציה כוללת: "
        "title (כותרת ראשית קצרה ועוצמתית), subtitle (משפט משנה), "
        "body (גוף קצר 1-3 שורות), cta (קריאה לפעולה אם רלוונטי). "
        "החזר JSON במבנה: {\"variants\":[{\"title\":\"\",\"subtitle\":\"\",\"body\":\"\",\"cta\":\"\"}]}"
    )
    try:
        out = _claude(system, user, max_tokens=1800)
        data = _extract_json(out)
        variants = data.get("variants") if isinstance(data, dict) else data
        if not isinstance(variants, list):
            variants = [data]
        _ok({"variants": variants})
    except Exception as e:
        _fail("שגיאה ביצירת קופי", f"{e}\n{traceback.format_exc()}")


def cmd_concepts(req: dict) -> None:
    """Given a brief, return refined concept directions with rationale.

    req: { category, audience, mood[], message, colorPref, refNotes, presets:[{key,name,studio,mood[]}] }
    Returns: { understanding: str, concepts: [ {presetKey, title, angle, why, palette, copyHint} ] }
    """
    presets = req.get("presets", []) or []
    presets_min = [
        {"key": p.get("key"), "name": p.get("name"), "studio": p.get("studio"), "mood": p.get("mood", [])}
        for p in presets[:12]
    ]
    system = (
        "אתה מנהל אמנותי ומנהל לקוח בכיר במשרד פרסום חרדי מוביל (ברמת בולטון-פוטנציאל / סטודיו 7). "
        "אתה מקבל בריף ראשוני ומנסח הבנת-רעיון קצרה, ואז מציע כיווני עיצוב (קונספטים) "
        "כשכל קונספט קשור לאחד מהפריסטים הנתונים. אתה מסביר בעברית מכובדת מדוע כל כיוון מתאים ללקוח. "
        "אל תמציא עובדות. החזר אך ורק JSON תקין."
    )
    user = (
        f"בריף:\n"
        f"- קטגוריה: {req.get('category','')}\n"
        f"- קהל יעד: {req.get('audience','')}\n"
        f"- אווירה: {', '.join(req.get('mood',[]) or [])}\n"
        f"- המסר: {req.get('message','')}\n"
        f"- העדפת צבע: {req.get('colorPref','')}\n"
        f"- רפרנסים שאהב: {req.get('refNotes','')}\n\n"
        f"פריסטים זמינים (בחר מהם presetKey): {json.dumps(presets_min, ensure_ascii=False)}\n\n"
        "החזר JSON: {\"understanding\":\"פסקה קצרה שמראה שהבנת בדיוק מה הלקוח רוצה\","
        "\"concepts\":[{\"presetKey\":\"\",\"title\":\"שם הקונספט\",\"angle\":\"הזווית הרעיונית\","
        "\"why\":\"למה מתאים ללקוח\",\"palette\":\"תיאור צבעוני קצר\",\"copyHint\":\"רמז לקופי\"}]}. "
        "הצע 3-4 קונספטים מגוונים (משרדים/סגנונות שונים)."
    )
    try:
        out = _claude(system, user, max_tokens=2000)
        data = _extract_json(out)
        _ok({
            "understanding": data.get("understanding", ""),
            "concepts": data.get("concepts", []),
        })
    except Exception as e:
        _fail("שגיאה בהצעת קונספטים", f"{e}\n{traceback.format_exc()}")


def cmd_background(req: dict) -> None:
    """Generate a decorative, text-free background/frame image.

    req: { prompt, aspectRatio, model, enhance:bool, imageBase64?, imageMediaType? }
    Returns: { dataUrl, prompt }
    """
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
    from generate_image import generate_image  # copied helper

    prompt = req.get("prompt", "")
    if not prompt:
        _fail("חסר תיאור לרקע")
    aspect = req.get("aspectRatio", "4:5")
    # llm_api supports 3:4 not 4:5 — map portrait ratios
    ratio_map = {"4:5": "3:4", "5:4": "4:3", "2:3": "3:4", "3:2": "4:3"}
    aspect = ratio_map.get(aspect, aspect)
    # gpt_image_* אינו מורשה לפריסט זה; ברירת מחדל nano_banana_pro (איכות גבוהה).
    model = req.get("model", "nano_banana_pro")
    allowed = {"nano_banana_pro", "nano_banana_2", "seedream_5"}
    if model not in allowed:
        model = "nano_banana_pro"

    guard = (
        " CRITICAL: the image must contain NO text, NO letters, NO Hebrew characters, "
        "NO numbers, NO people, NO human figures, NO faces. It is ONLY a decorative "
        "background/border/frame with an empty, uncluttered center area reserved for "
        "text that will be added later. Elegant, print-quality, high resolution."
    )
    final_prompt = (prompt + guard) if req.get("enhance", True) else prompt

    img_bytes = None
    media_type = None
    if req.get("imageBase64"):
        img_bytes = base64.b64decode(req["imageBase64"])
        media_type = req.get("imageMediaType", "image/png")

    async def _run():
        return await generate_image(
            final_prompt,
            image_bytes=img_bytes,
            image_media_type=media_type,
            aspect_ratio=aspect,
            model=model,
        )

    try:
        data = asyncio.run(_run())
        b64 = base64.b64encode(data).decode()
        _ok({"dataUrl": f"data:image/png;base64,{b64}", "prompt": final_prompt})
    except Exception as e:
        _fail("שגיאה ביצירת רקע AI", f"{e}\n{traceback.format_exc()}")


def main() -> None:
    try:
        req = _read_request()
    except Exception as e:
        _fail("בקשה לא תקינה", str(e))
        return
    cmd = req.get("cmd")
    if cmd == "copy":
        cmd_copy(req)
    elif cmd == "concepts":
        cmd_concepts(req)
    elif cmd == "background":
        cmd_background(req)
    else:
        _fail("פקודה לא מוכרת", str(cmd))


if __name__ == "__main__":
    main()
