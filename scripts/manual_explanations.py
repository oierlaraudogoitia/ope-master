#!/usr/bin/env python3
"""Aplica explicaciones detalladas y hechas a mano para preguntas seleccionadas
(impugnables y muestras representativas). Sobreescribe la explicación generada
plantilladamente.

Identificación: (source, sourceNum) -> (explanation, mnemonic_or_None).
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QPATH = ROOT / "src" / "data" / "questions.json"

MANUAL: dict[tuple[str, int], tuple[str, str | None]] = {

    # --- IMPUGNABLES (7) ---
    ("comun", 8): (
        "Pregunta IMPUGNABLE. La respuesta oficial es la (d) «Ninguna de las anteriores», pero las opciones (a), (b) y (c) recogen frases muy próximas a la literalidad del art. 9 de la Ley 44/2003 (actuación en equipo: jerarquización preferente atendiendo a conocimientos, competencia y titulación). Son distinguibles entre sí por matices casi idénticos, lo que ha generado controversia. Memoriza la opción oficial pero ten claro el contenido real del art. 9.",
        "Equipo de profesionales: jerarquía PREFERENTE (no obligatoria) según conocimiento + competencia + titulación.",
    ),
    ("comun", 32): (
        "Pregunta IMPUGNABLE. Oficialmente correcta la (c): el personal estatutario puede compatibilizar funciones sanitarias y docentes (art. 77 Ley 55/2003 + Ley 53/1984 art. 3). La controversia: la Ley 53/1984 también extiende el régimen de incompatibilidades del personal funcionario al estatutario, lo que hace defendible la opción (b).",
        "Estatutario: puede compatibilizar SANITARIA + DOCENTE (la opción educativa siempre cuela).",
    ),
    ("comun", 92): (
        "Pregunta IMPUGNABLE. Oficial: (b), porque el art. 4.3 de la Ley 41/2002 amplía la garantía del derecho de información al equipo asistencial y no solo al facultativo responsable. Polémica: algunas opciones citan literalmente parte del precepto y se discute si \"y el personal de enfermería\" cabría también.",
        "Información al paciente: garantizan TODO el equipo asistencial, no solo el médico responsable.",
    ),
    ("comun", 142): (
        "Pregunta IMPUGNABLE. Oficial: (c) «Corresponsabilidad». Los Valores Fundamentales del Pacto Vasco de Salud son Universalidad, Equidad y Corresponsabilidad. Sostenibilidad y Eficiencia son principios operativos, no valores fundamentales — pero la redacción ha generado dudas entre opositoras.",
        "Pacto Vasco · Valores: U-E-C → Universalidad, Equidad, Corresponsabilidad.",
    ),
    ("comun", 189): (
        "Pregunta IMPUGNABLE. Oficial: (b) cada 15 días, dejando constancia en la historia clínica (art. 8.1 LO 3/2021). La controversia surge porque el plazo se interpreta como \"al menos cada 15 días\" entre proceso deliberativo y decisión, lo que da margen interpretativo en función del contexto clínico.",
        "Eutanasia · Consulta facultativo-paciente: cada 15 días MÍN. con anotación en historia clínica.",
    ),
    ("comun", 191): (
        "Pregunta IMPUGNABLE. Oficial: (b). Padecimiento grave, crónico e imposibilitante (art. 3.b LO 3/2021) = limitación directa sobre la autonomía física y la capacidad de expresar la voluntad. La (a) confunde con \"enfermedad grave e incurable\" y la (d) con la situación terminal. El matiz es fino y por eso es impugnable.",
        "Padecimiento grave crónico imposibilitante: AUTONOMÍA FÍSICA + CAPACIDAD DE EXPRESAR VOLUNTAD.",
    ),
    ("comun", 192): (
        "Pregunta IMPUGNABLE. Oficial: (a) 24 horas. La LO 3/2021 fija que el facultativo responsable comunique la resolución favorable a la Comisión de Garantía y Evaluación dentro de las 24 horas siguientes. La (b) («día siguiente natural») se considera equivalente por algunas opositoras y de ahí la impugnación.",
        "Eutanasia · Comunicación a la Comisión: 24 HORAS desde resolución favorable.",
    ),

    # --- Constitución 1978: muestras frecuentes ---
    ("tecnico", 2): (
        "Correcta la (a). El art. 1.1 CE recoge expresamente como valores superiores del ordenamiento jurídico: libertad, justicia, igualdad y pluralismo político. La (b) cambia \"justicia\" por \"seguridad jurídica\" (que es un principio del 9.3, no un valor superior). La (c) sustituye \"pluralismo\" por \"jerarquía normativa\" (también principio del 9.3).",
        "Valores superiores (1.1 CE): Li-Ju-I-Pp → Libertad, Justicia, Igualdad, Pluralismo Político.",
    ),
    ("tecnico", 6): (
        "Correcta la (a). El art. 17.2 CE limita la detención preventiva a un máximo de 72 horas (sin perjuicio de prórroga judicial en delitos terroristas). 48 horas es plazo de presentación al juez en algunas legislaciones pero no el constitucional.",
        "Detención preventiva CE: 72 HORAS máximo.",
    ),
    ("tecnico", 1): (
        "Correcta la (c). El art. 99.3 CE: el Rey nombra Presidente del Gobierno tras la confianza del Congreso; y el art. 100 CE: los demás miembros del Gobierno también son nombrados por el Rey, a propuesta del Presidente. La (a) y la (d) confunden quién nombra al Presidente; la (b) ignora que también participa el Rey en el nombramiento de los ministros.",
        "Nombramientos CE: Presidente → Rey (tras Congreso). Ministros → Rey a propuesta del Presidente.",
    ),

    # --- Ley 44/2003 Profesiones Sanitarias: muestra ---
    ("comun", 1): (
        "Correcta la (a). Art. 4.2 Ley 44/2003: la colegiación es requisito imprescindible cuando una ley estatal así lo establezca. Las opciones (b) y (c) son requisitos del art. 4.4, pero no de carácter general; solo aplican en supuestos concretos.",
        "Profesión sanitaria: colegiación si LEY ESTATAL la exige.",
    ),

    # --- Ley 41/2002 Autonomía: muestra ---
    ("comun", 89): (
        "Punto clave del art. 5 Ley 41/2002: el titular del derecho a la información asistencial es el paciente; las personas vinculadas (familiares) sólo cuando el paciente lo permita expresa o tácitamente. Trampa típica: opciones que invierten la regla (familiares por defecto).",
        "Información asistencial: titular = PACIENTE. Familia solo si él lo permite.",
    ),

    # --- Eutanasia (LO 3/2021): residencia mínima ---
    ("comun", 188): (
        "Punto clave LO 3/2021: la persona solicitante debe tener nacionalidad española, residencia legal en España o certificado de empadronamiento que acredite >12 meses. Trampa: la opción de \"6 meses\" o \"residencia efectiva\" suena igual pero no es lo recogido.",
        "Eutanasia · Residencia: 12 MESES de empadronamiento (regla del año).",
    ),

    # --- Estatuto Marco (Ley 55/2003) ---
    ("tecnico", 175): (
        "Art. 36-37 Ley 55/2003: los procedimientos de movilidad voluntaria del personal estatutario se convocan con carácter periódico, normalmente cada 2 años. Trampa: \"cada año\" o \"cada 4 años\" son distractores frecuentes.",
        "Movilidad voluntaria estatutaria: cada 2 AÑOS.",
    ),
}


def main() -> int:
    data = json.loads(QPATH.read_text())
    by_key = {(q["source"], q["sourceNum"]): q for q in data["questions"]}
    applied = 0
    missing: list[tuple[str, int]] = []
    for key, (expl, mnemo) in MANUAL.items():
        q = by_key.get(key)
        if q is None:
            missing.append(key)
            continue
        q["explanation"] = expl
        q["mnemonic"] = mnemo
        applied += 1
    QPATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Aplicadas: {applied}/{len(MANUAL)}")
    if missing:
        print("No encontradas:")
        for k in missing:
            print(f"  {k}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
