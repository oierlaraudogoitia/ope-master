#!/usr/bin/env python3
"""Audit src/data/questions.json against the source PDFs.
Read-only: prints discrepancies, modifies nothing. Exit code 0 iff perfect."""
from __future__ import annotations
import json
import sys
from pathlib import Path

# Reuse the robust parser from fix_correct_indices.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_correct_indices import parse_pdf, PDF_COMUN, PDF_TEC, LETTERS  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "questions.json"


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    qs = data["questions"]
    print("Parsing PDFs…")
    pdf_comun = parse_pdf(PDF_COMUN, max_qnum=200)
    pdf_tec = parse_pdf(PDF_TEC, max_qnum=450)

    mismatches: list[tuple[dict, str, str]] = []
    missing: list[dict] = []
    impugnable_diff: list[tuple[dict, bool]] = []
    for q in qs:
        src = pdf_comun if q["source"] == "comun" else pdf_tec
        info = src.get(q["sourceNum"])
        if info is None or (info["correct"] is None and not info["impugnable"]):
            missing.append(q)
            continue
        if info["impugnable"] != q.get("impugnable", False):
            impugnable_diff.append((q, info["impugnable"]))
        if info["correct"] is not None:
            json_letter = LETTERS[q["correctIndex"]]
            if info["correct"] != json_letter:
                mismatches.append((q, info["correct"], json_letter))

    print()
    print(f"== AUDITORÍA ==")
    print(f"Discrepancias correctIndex: {len(mismatches)}")
    print(f"Sin detectar en PDF:        {len(missing)}")
    print(f"Diferencias impugnable:     {len(impugnable_diff)}")
    if mismatches:
        print("\nMismatches:")
        for q, pdf, jsn in mismatches[:30]:
            print(f"  [{q['source']:7} #{q['sourceNum']:3}] id={q['id']:3} JSON={jsn} PDF={pdf}")
        if len(mismatches) > 30:
            print(f"  ... y {len(mismatches) - 30} más")
    if missing:
        print("\nSin detectar:")
        for q in missing[:30]:
            print(f"  [{q['source']:7} #{q['sourceNum']:3}] id={q['id']}")
    if impugnable_diff:
        print("\nImpugnable diff:")
        for q, expected in impugnable_diff[:30]:
            print(f"  [{q['source']:7} #{q['sourceNum']:3}] id={q['id']} JSON={q.get('impugnable')} PDF={expected}")

    ok = not (mismatches or missing or impugnable_diff)
    print("\n✅ PERFECTO" if ok else "\n❌ Hay discrepancias")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
