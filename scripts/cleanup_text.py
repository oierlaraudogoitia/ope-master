#!/usr/bin/env python3
"""Limpia restos de marca de agua / marcadores en los enunciados y opciones de
questions.json (que el extractor no haya pillado).

- Elimina apariciones de '(Correcta)' / '(Incorrecta)' incrustadas en el texto.
- Recombina palabras partidas con guion + salto: 'Orde- nación' -> 'Ordenación'.
- Normaliza dobles espacios.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QPATH = ROOT / "src" / "data" / "questions.json"

MARKER_RE = re.compile(r"\s*\((?:In)?[Cc]orrecta\)\s*")
HYPHEN_BREAK = re.compile(r"([a-záéíóúñA-ZÁÉÍÓÚÑ])-\s+([a-záéíóúñA-ZÁÉÍÓÚÑ])")
PARTIAL_MARKER_RE = re.compile(r"\s*\(?(?:Cor-|Inco-|recta\)|rrecta\)|Co-|Co?rrecta\))\s*")
DOUBLE_SPACE = re.compile(r"\s{2,}")
# Watermark fragments anywhere in text (full word boundary)
WATERMARK_FRAGS = ["t-sp", "di.o", "a@tz", "tz de", "speu", "a@", "t-", "sp", "eu",
                    "di.o rg", "rg ka", "ka ug", "ug t-", "iEstatuto"]
WM_RE = re.compile(
    r"\s*(?:" + "|".join(re.escape(f) for f in WATERMARK_FRAGS) + r")\s*$",
    re.IGNORECASE,
)
# Lone tokens (1-3 chars) at end of text that are likely watermark
TRAILING_JUNK_RE = re.compile(r"\s+(?:di\.o|rg|ka|ug|t-|sp|eu|s|a@|tz|de|ak|i|os|t-sp|a@tz|speu)\s*$",
                               re.IGNORECASE)


def clean(s: str) -> str:
    s = MARKER_RE.sub(" ", s)
    s = PARTIAL_MARKER_RE.sub(" ", s)
    # Recombine hyphenated word breaks (only mid-word, lowercase->lowercase).
    s = HYPHEN_BREAK.sub(r"\1\2", s)
    # Strip watermark trails (multiple passes since fragments can chain).
    for _ in range(4):
        new = TRAILING_JUNK_RE.sub("", s)
        new = WM_RE.sub("", new)
        if new == s:
            break
        s = new
    s = DOUBLE_SPACE.sub(" ", s).strip()
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    return s


def main() -> int:
    data = json.loads(QPATH.read_text())
    changed = 0
    for q in data["questions"]:
        new_q = clean(q["question"])
        if new_q != q["question"]:
            q["question"] = new_q
            changed += 1
        new_opts = [clean(o) for o in q["options"]]
        if new_opts != q["options"]:
            q["options"] = new_opts
            changed += 1
    QPATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Cambios: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
