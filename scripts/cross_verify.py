#!/usr/bin/env python3
"""Exhaustive cross-verification of every question's correctIndex against the PDFs.

Read-only. For every of the 650 questions:
  - Compute the bbox-based answer.
  - Compare with JSON.
  - On discrepancy or "no resolution", print the question + PDF excerpt so the
    user can manually verify or fix.

Exit code 0 iff every question matches and only the known structural artifacts
remain unresolved (id 227, 539, 546)."""
from __future__ import annotations
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_correct_indices import (  # type: ignore
    parse_pdf, parse_bbox, PDF_COMUN, PDF_TEC, LETTERS, QUESTION_RE
)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "questions.json"
KNOWN_STRUCTURAL = {227, 539, 546}


def excerpt_for(items, qn: int, max_qnum: int) -> str:
    starts = [(i, it) for i, it in enumerate(items) if QUESTION_RE.match(it.t) and int(QUESTION_RE.match(it.t).group(1)) == qn]
    if not starts:
        return "(no se localiza)"
    si = starts[0][0]
    ei = len(items)
    for i, it in enumerate(items[si + 1:], start=si + 1):
        m = QUESTION_RE.match(it.t)
        if m and int(m.group(1)) == qn + 1:
            ei = i
            break
    out = []
    for it in items[si:ei]:
        flag = ""
        if "(Correcta)" in it.t:
            flag = "  <<<C"
        elif "(Incorrecta)" in it.t:
            flag = "  <<<I"
        out.append(f"  p{it.p} y={it.y:7.2f} x={it.x:6.2f} {it.t[:90]}{flag}")
    return "\n".join(out)


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    print("Parsing PDFs (bbox)…")
    items_c = parse_bbox(PDF_COMUN)
    items_t = parse_bbox(PDF_TEC)
    from fix_correct_indices import resolve_pdf
    ans_c = resolve_pdf(items_c, 200)
    ans_t = resolve_pdf(items_t, 450)

    real_disc: list = []
    unresolved: list = []
    for q in data["questions"]:
        ans = ans_c if q["source"] == "comun" else ans_t
        info = ans[q["sourceNum"]]
        json_letter = LETTERS[q["correctIndex"]]
        if info["correct"] is None:
            unresolved.append(q)
        elif info["correct"] != json_letter:
            real_disc.append((q, info["correct"]))

    print(f"\n== VERIFICACIÓN ==")
    print(f"Total preguntas:        {len(data['questions'])}")
    print(f"Discrepancias REALES:   {len(real_disc)}")
    print(f"Sin resolver por PDF:   {len(unresolved)}")

    if real_disc:
        print("\n❌ DISCREPANCIAS REALES (REVISAR):")
        for q, pdf_l in real_disc:
            print(f"\n--- id {q['id']} ({q['source']} #{q['sourceNum']}) ---")
            print(f"  JSON correctIndex = {q['correctIndex']} ({LETTERS[q['correctIndex']]})")
            print(f"  PDF correct       = {pdf_l}")
            print(f"  Excerpt PDF:")
            its = items_c if q["source"] == "comun" else items_t
            mx = 200 if q["source"] == "comun" else 450
            print(excerpt_for(its, q["sourceNum"], mx))

    unknown = [q for q in unresolved if q["id"] not in KNOWN_STRUCTURAL]
    if unknown:
        print("\n⚠️  Sin resolver desconocidos (NO eran de los 3 estructurales conocidos):")
        for q in unknown:
            print(f"\n--- id {q['id']} ({q['source']} #{q['sourceNum']}) ---")
            print(f"  JSON correctIndex = {q['correctIndex']} ({LETTERS[q['correctIndex']]})")
            its = items_c if q["source"] == "comun" else items_t
            mx = 200 if q["source"] == "comun" else 450
            print(excerpt_for(its, q["sourceNum"], mx))

    known_unresolved = [q for q in unresolved if q["id"] in KNOWN_STRUCTURAL]
    if known_unresolved:
        print(f"\nSin resolver conocidos (3 artefactos estructurales):")
        for q in known_unresolved:
            print(f"  id={q['id']} [{q['source']} #{q['sourceNum']}]")

    ok = (not real_disc) and (not unknown)
    print("\n✅ TODO BIEN" if ok else "\n❌ Revisar discrepancias")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
