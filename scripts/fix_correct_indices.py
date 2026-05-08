#!/usr/bin/env python3
"""Fix correctIndex (and impugnable) in src/data/questions.json by re-parsing
the source PDFs as the source of truth using bbox-layout coordinates.

Why bbox-layout: pdftotext -layout (text) splits markers and options onto
separate textual lines because of large horizontal whitespace, but in the
SOURCE PDF the marker is on the SAME visual row as its option. bbox-layout
exposes the actual Y coordinates so we can re-pair them by Y proximity.

Heuristics applied per question (in order):
  R1 (block + inline-priority): each option's "block" is from its declaration
     line down to the next option's declaration line (same page). Markers
     inside the block belong to that option. If multiple markers conflict,
     inline (same row, Δy < 1pt) wins. The option whose final marker is
     (Correcta) is the answer.
  R2 (elimination): if exactly 3 options resolve to (Incorrecta) and 1 has no
     marker (or ambiguous), the unmarked one is the answer.

If neither rule yields a clean answer, the question is left untouched and
listed for manual review. Same for cases where the option text looks broken
(extraction artifact: < 4 chars, or just digits).

Usage:
    python3 scripts/fix_correct_indices.py [--dry-run]
"""
from __future__ import annotations
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "questions.json"
PDF_COMUN = Path("/Users/oierlaraudogoitia/Downloads/preguntas comun (1).pdf")
PDF_TEC = Path("/Users/oierlaraudogoitia/Downloads/tecnico superior (1).pdf")

WATERMARK_FRAGMENTS = {
    "di.o", "rg", "ka", "ug", "t-", "sp", "eu", "s", "a@", "tz", "de", "ak",
    "i", "os", "iEstatuto.", "iEstatuto",
}
LETTERS = ["a", "b", "c", "d"]


# -------------------- bbox parsing --------------------

PAGE_RE = re.compile(r'<page\s[^>]*>(.*?)</page>', re.DOTALL)
LINE_RE = re.compile(
    r'<line\s+xMin="([^"]+)"\s+yMin="([^"]+)"\s+xMax="([^"]+)"\s+yMax="([^"]+)">(.*?)</line>',
    re.DOTALL,
)
WORD_RE = re.compile(r'<word\s[^>]*>([^<]*)</word>')


class Item:
    __slots__ = ("p", "y", "x", "t")

    def __init__(self, p: int, y: float, x: float, t: str):
        self.p = p
        self.y = y
        self.x = x
        self.t = t


def _scrub(text: str) -> str:
    text = re.sub(r"\(Cor-\s+recta\)", "(Correcta)", text)
    text = re.sub(r"\(Co-\s+rrecta\)", "(Correcta)", text)
    text = re.sub(r"\(Inco-\s+rrecta\)", "(Incorrecta)", text)
    text = re.sub(r"\(Incor-\s+recta\)", "(Incorrecta)", text)
    text = re.sub(r"\(In-\s+correcta\)", "(Incorrecta)", text)
    return text


def _strip_glued(text: str) -> str:
    wm_re = "|".join(re.escape(f) for f in WATERMARK_FRAGMENTS if f.isalpha() and len(f) <= 3)
    return re.sub(rf"^(?:{wm_re})(?=\([abcd]\))", "", text)


def _is_watermark(s: str) -> bool:
    s = s.strip()
    if not s:
        return False
    if s in WATERMARK_FRAGMENTS:
        return True
    if re.fullmatch(r"[A-Za-z@\.\-]{1,5}", s) and s.lower() in {f.lower() for f in WATERMARK_FRAGMENTS}:
        return True
    return False


def parse_bbox(path: Path) -> list[Item]:
    xml = subprocess.check_output(["pdftotext", "-bbox-layout", str(path), "-"], text=True)
    items: list[Item] = []
    for pi, pm in enumerate(PAGE_RE.finditer(xml)):
        body = pm.group(1)
        for lm in LINE_RE.finditer(body):
            x = float(lm.group(1))
            y = float(lm.group(2))
            words = WORD_RE.findall(lm.group(5))
            text = " ".join(w.strip() for w in words if w.strip())
            if not text:
                continue
            text = _strip_glued(text)
            text = _scrub(text)
            if _is_watermark(text):
                continue
            items.append(Item(pi, y, x, text))
    items.sort(key=lambda it: (it.p, it.y, it.x))
    return items


# -------------------- per-question resolution --------------------

QUESTION_RE = re.compile(r"^(\d+)\.\s+")
OPTION_RE = re.compile(r"^\(([abcd])\)\s+(.*)$")
IMPUGNABLE_RE = re.compile(r"Soluci[óo]n\s*:\s*IMPUGNABLE", re.IGNORECASE)


def resolve_pdf(items: list[Item], max_qnum: int) -> dict[int, dict]:
    answers: dict[int, dict] = {q: {"correct": None, "impugnable": False, "mode": "none"} for q in range(1, max_qnum + 1)}

    # Locate question starts in monotonic order.
    q_idx: list[tuple[int, int]] = []
    expected = 1
    for i, it in enumerate(items):
        m = QUESTION_RE.match(it.t)
        if m:
            try:
                n = int(m.group(1))
            except ValueError:
                continue
            if n == expected and 1 <= n <= max_qnum:
                q_idx.append((n, i))
                expected = n + 1

    for k, (qn, start) in enumerate(q_idx):
        end = q_idx[k + 1][1] if k + 1 < len(q_idx) else len(items)
        region = items[start:end]

        opts: list[tuple[str, Item]] = []  # (letter, item)
        markers: list[tuple[str, Item]] = []  # ('C'/'I', item)
        impugnable = False

        for it in region:
            if IMPUGNABLE_RE.search(it.t):
                impugnable = True
            mo = OPTION_RE.match(it.t)
            if mo:
                opts.append((mo.group(1), it))
                tail = mo.group(2)
                if "(Correcta)" in tail:
                    markers.append(("C", it))
                elif "(Incorrecta)" in tail:
                    markers.append(("I", it))
                continue
            s = it.t.strip()
            if s == "(Correcta)" or s.endswith("(Correcta)"):
                markers.append(("C", it))
            elif s == "(Incorrecta)" or s.endswith("(Incorrecta)"):
                markers.append(("I", it))

        answers[qn]["impugnable"] = impugnable
        if not opts:
            continue

        # Per-option marker collection: for each marker, find option whose Y is closest
        # AND whose Y is <= marker.y (i.e. option starts at or above marker). Prefer
        # same-row (Δy < 1pt) — those are inline markers.
        per_opt: dict[str, list[tuple[str, float]]] = {l: [] for l, _ in opts}
        for mk, mit in markers:
            # Same page, option y <= marker y
            cand = [(l, it.y) for l, it in opts if it.p == mit.p and it.y <= mit.y + 0.5]
            if cand:
                cand.sort(key=lambda t: t[1])
                owner_letter = cand[-1][0]
                dy = abs(mit.y - dict((l, y) for l, y in cand)[owner_letter])
                per_opt[owner_letter].append((mk, dy))
            else:
                # Marker on a later page — attribute to last option of an earlier page
                prev = [(l, it.p, it.y) for l, it in opts if it.p < mit.p]
                if prev:
                    prev.sort(key=lambda t: (t[1], t[2]))
                    per_opt[prev[-1][0]].append((mk, 999.0))

        # Resolve each option's mark with inline priority.
        marks: dict[str, str | None] = {}
        for letter, _ in opts:
            ms = per_opt[letter]
            if not ms:
                marks[letter] = None
                continue
            # Inline = same row (Δy < 1.5)
            inline = [m for m, dy in ms if dy < 1.5]
            if inline:
                # Inline definitive
                if "C" in inline:
                    marks[letter] = "C"
                elif "I" in inline:
                    marks[letter] = "I"
                else:
                    marks[letter] = None
            else:
                # Floating only
                kinds = {m for m, _ in ms}
                if kinds == {"C"}:
                    marks[letter] = "C"
                elif kinds == {"I"}:
                    marks[letter] = "I"
                else:
                    marks[letter] = "AMB"

        # Decision rules
        c_count = sum(1 for v in marks.values() if v == "C")
        i_count = sum(1 for v in marks.values() if v == "I")
        amb_count = sum(1 for v in marks.values() if v == "AMB")
        none_count = sum(1 for v in marks.values() if v is None)

        if c_count == 1 and amb_count == 0:
            # R1
            for l, m in marks.items():
                if m == "C":
                    answers[qn]["correct"] = l
                    answers[qn]["mode"] = "block"
                    break
        elif c_count == 0 and i_count == 3 and (none_count + amb_count) == 1:
            # R2 by elimination
            for l, m in marks.items():
                if m != "I":
                    answers[qn]["correct"] = l
                    answers[qn]["mode"] = "elim"
                    break

    return answers


# -------------------- explanation update --------------------

EXPL_LEAD_QUOTED = re.compile(r"^Correcta la \(([abcd])\): «([^»]*)»")
EXPL_LEAD_PLAIN = re.compile(r"^Correcta la \(([abcd])\)")
# FALSA-style: captures the (letter) and the following «quote» if present.
EXPL_FALSA_QUOTED = re.compile(r"(\bopci[oó]n FALSA[^.()]*?)\(([abcd])\)(\s*«[^»]*»)?")


def truncate_for_quote(text: str, max_chars: int = 120) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def update_explanation(expl: str, old_letter: str, new_letter: str, new_option_text: str) -> str:
    if not expl or old_letter == new_letter:
        return expl
    new_quote = truncate_for_quote(new_option_text)
    if EXPL_LEAD_QUOTED.match(expl):
        return EXPL_LEAD_QUOTED.sub(f"Correcta la ({new_letter}): «{new_quote}»", expl, count=1)
    if EXPL_LEAD_PLAIN.match(expl):
        return EXPL_LEAD_PLAIN.sub(f"Correcta la ({new_letter})", expl, count=1)
    m = EXPL_FALSA_QUOTED.search(expl)
    if m:
        prefix, _letter, _quote = m.group(1), m.group(2), m.group(3)
        replacement = f"{prefix}({new_letter}) «{new_quote}»"
        return expl[: m.start()] + replacement + expl[m.end():]
    pat = re.compile(rf"\({re.escape(old_letter)}\)")
    return pat.sub(f"({new_letter})", expl, count=1)


# -------------------- driver --------------------

def parse_pdf(path: Path, max_qnum: int) -> dict[int, dict]:
    return resolve_pdf(parse_bbox(path), max_qnum)


def looks_broken(option_text: str) -> bool:
    """Heuristic for extraction artifacts: very short option text or "X." with X numeric."""
    s = option_text.strip()
    if len(s) < 4:
        return True
    if re.fullmatch(r"\d+\.?", s):
        return True
    return False


def main(dry_run: bool = False) -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    questions = data["questions"]

    print("Parsing PDFs (bbox-layout, Y-aligned markers)…")
    pdf_comun = parse_pdf(PDF_COMUN, max_qnum=200)
    pdf_tec = parse_pdf(PDF_TEC, max_qnum=450)

    changes_idx = 0
    changes_imp = 0
    expl_touched = 0
    touched: list[tuple[int, str, int, str, str]] = []
    skipped_broken: list[tuple[int, str, int]] = []
    unresolved: list[tuple[str, int, int]] = []

    for q in questions:
        src_dict = pdf_comun if q["source"] == "comun" else pdf_tec
        info = src_dict.get(q["sourceNum"], {"correct": None, "impugnable": False, "mode": "none"})
        new_imp = bool(info["impugnable"])
        new_letter = info["correct"]
        if new_letter is None:
            unresolved.append((q["source"], q["sourceNum"], q["id"]))
            if q.get("impugnable") != new_imp:
                q["impugnable"] = new_imp
                changes_imp += 1
            continue
        new_idx = LETTERS.index(new_letter)
        old_idx = q["correctIndex"]
        if new_idx != old_idx:
            # Skip if the new option text looks like an extraction artifact
            if looks_broken(q["options"][new_idx]):
                skipped_broken.append((q["id"], q["source"], q["sourceNum"]))
            else:
                old_letter = LETTERS[old_idx]
                new_option_text = q["options"][new_idx]
                new_expl = update_explanation(q.get("explanation", ""), old_letter, new_letter, new_option_text)
                if new_expl != q.get("explanation", ""):
                    q["explanation"] = new_expl
                    expl_touched += 1
                q["correctIndex"] = new_idx
                changes_idx += 1
                touched.append((q["id"], q["source"], q["sourceNum"], old_letter, new_letter))
        if q.get("impugnable") != new_imp:
            q["impugnable"] = new_imp
            changes_imp += 1

    print(f"\n== RESUMEN ==")
    print(f"correctIndex actualizados: {changes_idx}")
    print(f"impugnable actualizados:   {changes_imp}")
    print(f"Explicaciones tocadas:     {expl_touched}")
    print(f"Saltadas (texto roto):     {len(skipped_broken)}")
    print(f"Sin resolver:              {len(unresolved)}")

    if touched:
        print("\nIDs corregidos:")
        for tid, src, sn, ol, nl in touched:
            print(f"  id={tid:3} [{src:7} #{sn:3}] {ol} → {nl}")
    if skipped_broken:
        print("\nSaltadas por texto roto (revisar manualmente):")
        for tid, src, sn in skipped_broken:
            print(f"  id={tid:3} [{src:7} #{sn:3}]")
    if unresolved:
        print("\nSin resolver por PDF (revisar manualmente):")
        for src, sn, tid in unresolved:
            print(f"  id={tid:3} [{src:7} #{sn:3}]")

    if dry_run:
        print("\n(dry-run) No se ha escrito nada.")
        return 0

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    bak = DATA.with_suffix(f".json.bak.{ts}")
    shutil.copy2(DATA, bak)
    print(f"\nBackup → {bak.name}")
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Escrito {DATA.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(dry_run="--dry-run" in sys.argv))
