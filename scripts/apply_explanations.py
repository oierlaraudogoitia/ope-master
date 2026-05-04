#!/usr/bin/env python3
"""Genera explicaciones breves para todas las preguntas de questions.json.

Estrategia:
- Para cada pregunta sin explicación, genera una explicación basada en heurísticas
  según el patrón del enunciado y de la opción correcta.
- Las explicaciones son factualmente correctas (citan el dato de la opción correcta)
  y dan al menos el contexto del bloque.

Uso: python3 scripts/apply_explanations.py
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
QPATH = DATA / "questions.json"


def short(text: str, n: int = 120) -> str:
    text = text.strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0]
    return cut + "…"


def detect_pattern(question: str, options: list[str], correct_idx: int) -> str:
    """Return a category label for templating."""
    q_lower = question.lower()
    correct = options[correct_idx].lower()

    if "no es" in q_lower or "no forma parte" in q_lower or "falsa" in q_lower or "incorrecta" in q_lower:
        return "negative"
    if "todas" in correct[:30] and ("anteriores" in correct or "las opciones" in correct):
        return "all_above"
    if "ninguna" in correct[:25] and ("anteriores" in correct or "correcta" in correct):
        return "none"
    if any(w in correct for w in ["días", "meses", "años", "horas"]) and re.search(r"\b\d", correct):
        return "deadline"
    if re.search(r"\b\d{1,3}\s*%", correct) or "porcentaje" in q_lower:
        return "percent"
    return "default"


def gen_explanation(q: dict, block_name: str, law: str) -> str:
    correct = q["options"][q["correctIndex"]]
    letter = chr(ord("a") + q["correctIndex"])
    impugnable = q.get("impugnable", False)

    pattern = detect_pattern(q["question"], q["options"], q["correctIndex"])

    if impugnable:
        return (
            f"Pregunta IMPUGNABLE: la respuesta oficial es la ({letter}) "
            f"«{short(correct, 90)}», pero su validez está cuestionada. "
            f"Repasa el {law}; suele aparecer ambigüedad en el matiz."
        )

    if pattern == "all_above":
        return (
            f"Correcta la ({letter}): las tres opciones anteriores son válidas. "
            f"Trampa típica: cuando varias afirmaciones del {law} suenan correctas, "
            f"comprueba si hay opción que las englobe."
        )
    if pattern == "none":
        return (
            f"Correcta la ({letter}): las otras tres opciones contienen errores de matiz "
            f"frente al {law}. Trampa: aunque suenen plausibles, basta con que un dato "
            f"sea inexacto para descartarlas."
        )
    if pattern == "negative":
        return (
            f"La pregunta pide la opción FALSA o que NO encaja: es la ({letter}) "
            f"«{short(correct, 90)}». El resto sí están en el {law}."
        )
    if pattern == "deadline":
        return (
            f"Correcta la ({letter}): «{short(correct, 90)}». "
            f"Plazo concreto del {law} — no lo confundas con plazos parecidos de otras normas."
        )
    if pattern == "percent":
        return (
            f"Correcta la ({letter}): «{short(correct, 90)}». "
            f"Cifra concreta del {law} — memoriza el número exacto, los distractores juegan con valores cercanos."
        )

    # Default
    return (
        f"Correcta la ({letter}): «{short(correct, 100)}». "
        f"Punto clave del {law}; las otras opciones contienen variaciones que no encajan con la literalidad de la norma."
    )


def main() -> int:
    data = json.loads(QPATH.read_text())
    blocks = {b["id"]: b for b in data["blocks"]}

    written = 0
    skipped = 0
    for q in data["questions"]:
        if q.get("explanation"):
            skipped += 1
            continue
        b = blocks.get(q["blockId"], {"name": "—", "law": "—"})
        q["explanation"] = gen_explanation(q, b["name"], b["law"])
        written += 1

    QPATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Generadas: {written}  ·  Ya tenían: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
