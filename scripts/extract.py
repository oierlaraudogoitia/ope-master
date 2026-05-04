#!/usr/bin/env python3
"""Extract OPE questions from the two source PDFs.

Usage:  python3 scripts/extract.py

Outputs:
  src/data/questions-raw.json  -> 650 entries with: id, blockId, law, source,
                                  question, options[4], correctIndex, impugnable,
                                  explanation: "", mnemonic: null, difficulty.
"""
from __future__ import annotations
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
DATA.mkdir(parents=True, exist_ok=True)

PDF_COMMON = Path("/Users/oierlaraudogoitia/Downloads/preguntas comun.pdf")
PDF_TECNICO = Path("/Users/oierlaraudogoitia/Downloads/tecnico superior.pdf")

# Fragments of the watermark "osakidetza@ugt-speuskadi.org" that pdftotext spreads
# as isolated lines or trailing tokens.
WATERMARK_FRAGMENTS = {
    "di.o", "rg", "ka", "ug", "t-", "sp", "eu", "s", "a@", "tz", "de", "ak", "i", "os",
    "iEstatuto.", "iEstatuto",
}

HEADER_PATTERNS = [
    r"^PREGUNTAS BATERIA COM[ÚU]N",
    r"^Preguntas Temario Espec[íi]fico",
    r"^osakidetza@ugt-speuskadi\.org",
    r"^Tel[ée]fono:\s*607",
    r"^En cumplimiento del Reglamento",
    r"^dos por ESFERA OPOSICIONES",
    r"^medio\.\s*Puede ejercer",
    r"^P[áa]gina \d+",
    r"^OSAKIDETZA",
    r"^OPE\s",
    r"^\s*RESPUESTAS",
    r"^\s*TEMARIOS OPE",
    r"^\s*ACTUALIZADOS",
    r"^Los contenidos de estas bater[íi]as",
    r"^UGT declina responsabilidad",
    r"^Es nuestro deseo",
    r"^Si tienes alguna incidencia",
    r"^Atenci[óo]n por email",
    r"^Consultas urgentes",
    r"^FECHAS, HORARIOS",
    r"^Y LUGAR DE EXAMEN",
    r"^Viernes,",
    r"^S[áa]bado,",
    r"^Domingo,",
    r"^ESCANEA EL C[ÓO]DIGO QR",
    r"^PARA M[ÁA]S",
    r"^INFORMACI[ÓO]N",
    r"^Aqu[íi] podr[áa]s realizar",
    r"^EXAMEN COMPLETO",
    r"^Administrazio eta",
    r"^Fisioterapeuta",
    r"^Laborategiko",
    r"^Zeladorea",
    r"^Erizaintzako",
    r"^Zerbitzuetako",
    r"^Erizaina",
    r"^Administrari",
    r"^Administraria",
]
HEADER_RE = re.compile("|".join(HEADER_PATTERNS))

QUESTION_RE = re.compile(r"^\s*(\d+)\.\s+(.*)$")
OPTION_RE = re.compile(r"^\s*\(([abcd])\)\s+(.*)$")
CORRECT_RE = re.compile(r"\(Correcta\)")
INCORRECT_RE = re.compile(r"\(Incorrecta\)")
IMPUGNABLE_RE = re.compile(r"Soluci[óo]n\s*:\s*IMPUGNABLE", re.IGNORECASE)


# ---------- BLOCK CLASSIFICATION ----------
# Order matters: first match wins. Specific patterns first.
BLOCKS = [
    {"id": 1, "name": "Profesiones Sanitarias", "law": "Ley 44/2003", "color": "amber",
     "patterns": [r"Ley\s*44/2003", r"profesi[oó]n(es)?\s+sanitaria",
                  r"ordenaci[óo]n\s+de\s+las\s+profesiones\s+sanitarias",
                  r"Registro\s+Estatal\s+de\s+Profesionales\s+Sanitarios"]},
    {"id": 2, "name": "Cohesión y Calidad SNS", "law": "Ley 16/2003", "color": "rose",
     "patterns": [r"Ley\s*16/2003", r"cohesi[oó]n\s+y\s+calidad"]},
    {"id": 3, "name": "Estatuto Marco", "law": "Ley 55/2003", "color": "emerald",
     "patterns": [r"Ley\s*55/2003", r"Estatuto\s+Marco",
                  r"personal\s+estatutario\s+(fijo|temporal)?",
                  r"condici[óo]n\s+de\s+personal\s+estatutario",
                  r"servicios\s+de\s+salud.*?estatutario"]},
    {"id": 5, "name": "Organizaciones Sanitarias Integradas", "law": "Decreto 100/2018", "color": "violet",
     "patterns": [r"Decreto\s*100/2018", r"Organizaciones?\s+Sanitarias\s+Integradas",
                  r"\bOSI\b\s+de\s+Tipo", r"OSI\s+\(", r"\bOSI\b.*?(integraci[óo]n|comarcal|hospital)"]},
    {"id": 4, "name": "Ordenación Sanitaria Euskadi", "law": "Ley 8/1997", "color": "sky",
     "patterns": [r"Ley\s*8/1997", r"Ordenaci[oó]n\s+Sanitaria\s+de\s+Euskadi",
                  r"ente\s+p[úu]blico\s+Osakidetza", r"Osakidetza[-‐]Servicio\s+Vasco\s+de\s+Salud",
                  r"organizaciones?\s+de\s+servicios\s+sanitarios",
                  r"organizaci[óo]n\s+central\s+de\s+administraci[óo]n",
                  r"organizaci[óo]n\s+central\s+del\s+ente\s+p[úu]blico",
                  r"Departamento\s+de\s+Sanidad",
                  r"\bOsakidetza\b",
                  r"Acuerdo\s+(regulador\s+)?(de\s+)?(las\s+)?condiciones\s+de\s+trabajo.*Osakidetza",
                  r"retribuciones\s+de\s+los\s+puestos\s+funcionales",
                  r"Decreto\s*186/2005", r"Decreto\s*186/2025",
                  r"Decreto\s*235/200\d.*condiciones\s+de\s+trabajo"]},
    {"id": 6, "name": "Derechos y Deberes pacientes", "law": "Decreto 147/2015", "color": "teal",
     "patterns": [r"Decreto\s*147/2015", r"derechos\s+y\s+deberes\s+de\s+las?\s+personas"]},
    {"id": 7, "name": "Autonomía paciente", "law": "Ley 41/2002", "color": "indigo",
     "patterns": [r"Ley\s*41/2002", r"autonom[ií]a\s+del\s+paciente"]},
    {"id": 8, "name": "Voluntades Anticipadas", "law": "Ley 7/2002", "color": "stone",
     "patterns": [r"Ley\s*7/2002", r"voluntades\s+anticipadas"]},
    {"id": 9, "name": "Protección de Datos", "law": "LO 3/2018", "color": "amber",
     "patterns": [r"LO\s*3/2018", r"Ley\s*Org[áa]nica\s*3/2018",
                  r"protecci[óo]n\s+de\s+datos\s+personales",
                  r"tratamiento\s+de\s+(los\s+)?datos(\s+personales)?",
                  r"\bRGPD\b", r"Reglamento\s+General\s+de\s+Protecci[óo]n\s+de\s+Datos",
                  r"\bvideovigilancia\b", r"datos\s+(con\s+)?fines\s+de"]},
    {"id": 10, "name": "Igualdad y Violencia Machista", "law": "DL 1/2023", "color": "rose",
     "patterns": [r"Decreto\s*Legislativo\s*1/2023", r"DL\s*1/2023",
                  r"Igualdad\s+de\s+Mujeres\s+y\s+Hombres",
                  r"violencia\s+machista", r"texto\s+refundido\s+de\s+la\s+Ley\s+para\s+la\s+Igualdad"]},
    {"id": 11, "name": "Plan de Salud Euskadi 2030", "law": "Plan", "color": "emerald",
     "patterns": [r"Plan\s+de\s+Salud\s+(de\s+)?Euskadi\s+2030"]},
    {"id": 12, "name": "Pacto Vasco de Salud", "law": "Pacto", "color": "sky",
     "patterns": [r"Pacto\s+Vasco\s+de\s+Salud"]},
    {"id": 13, "name": "Seguridad del Paciente 20-30", "law": "Estrategia", "color": "violet",
     "patterns": [r"Estrategia\s+de\s+Seguridad\s+del\s+Paciente",
                  r"Seguridad\s+del\s+Paciente\s+20[-‐]?30"]},
    {"id": 14, "name": "Plan Igualdad Osakidetza", "law": "Plan", "color": "teal",
     "patterns": [r"II\s+Plan\s+(para\s+la\s+)?Igualdad\s+(de\s+Mujeres\s+y\s+Hombres\s+)?en\s+Osakidetza",
                  r"\bI\s+Plan\s+(para\s+la\s+)?Igualdad.*Osakidetza",
                  r"Plan\s+(para\s+la\s+)?Igualdad\s+(de\s+Mujeres\s+y\s+Hombres\s+)?(en\s+)?Osakidetza",
                  r"plan\s+estrat[ée]gico\s+de\s+Osakidetza\s+en\s+materia\s+de\s+igualdad"]},
    {"id": 15, "name": "III Plan Normalización Euskera", "law": "Plan", "color": "indigo",
     "patterns": [r"III\s+Plan\s+(de\s+)?Normalizaci[óo]n\s+del?\s+Uso\s+del\s+Euskera",
                  r"Plan\s+de\s+Euskera\s+en\s+Osakidetza", r"Normalizaci[óo]n\s+del?\s+Euskera"]},
    {"id": 16, "name": "Plan Oncológico Integral", "law": "Plan", "color": "stone",
     "patterns": [r"Plan\s+Oncol[óo]gico\s+Integral"]},
    {"id": 17, "name": "Eutanasia", "law": "LO 3/2021", "color": "amber",
     "patterns": [r"LO\s*3/2021", r"Ley\s*Org[áa]nica\s*3/2021", r"eutanasia",
                  r"prestaci[óo]n\s+de\s+ayuda\s+para\s+morir"]},
    {"id": 18, "name": "Incompatibilidades", "law": "Ley 53/1984", "color": "rose",
     "patterns": [r"Ley\s*53/1984", r"Incompatibilidades\s+del\s+personal"]},
    {"id": 19, "name": "Constitución 1978", "law": "CE 1978", "color": "emerald",
     "patterns": [r"Constituci[óo]n\s+(Espa[ñn]ola\s+)?(de\s+)?1978",
                  r"Constituci[óo]n\s+Espa[ñn]ola"]},
    {"id": 20, "name": "Estatuto Autonomía País Vasco", "law": "EAPV (LO 3/1979)", "color": "sky",
     "patterns": [r"Estatuto\s+de\s+Autonom[íi]a\s+(para\s+)?(del?\s+)?(País|Pa[íi]s)\s+Vasco",
                  r"Estatuto\s+de\s+Gernika",
                  r"LO\s*3/1979", r"Ley\s*Org[áa]nica\s*3/1979",
                  r"Comunidad\s+Aut[óo]noma\s+(Vasca|del?\s+Pa[íi]s\s+Vasco|de\s+Euskadi)",
                  r"territorios?\s+hist[óo]ricos?",
                  r"\bcondici[oó]n\s+pol[íi]tica\s+de\s+vasco"]},
    {"id": 21, "name": "Procedimiento Administrativo", "law": "Ley 39/2015 + 40/2015", "color": "violet",
     "patterns": [r"Ley\s*39/2015", r"Ley\s*40/2015",
                  r"procedimiento\s+administrativo\s+com[úu]n",
                  r"procedimiento\s+administrativo\b",
                  r"R[ée]gimen\s+Jur[íi]dico\s+del\s+Sector\s+P[úu]blico",
                  r"personas?\s+interesadas?\s+en\s+(el\s+)?procedimiento",
                  r"\btr[áa]mite\s+de\s+audiencia\b",
                  r"obligaci[óo]n\s+de\s+resolver",
                  r"\bsilencio\s+administrativo\b",
                  r"\bnotificaci[óo]n\s+(electr[óo]nica|administrativa)\b",
                  r"acto\s+administrativo",
                  r"recurso\s+(de\s+)?(alzada|reposici[óo]n|extraordinario\s+de\s+revisi[óo]n)",
                  r"relacionarse\s+electr[óo]nicamente"]},
    {"id": 22, "name": "Estatuto Básico Empleado Público", "law": "EBEP", "color": "teal",
     "patterns": [r"Estatuto\s+B[áa]sico\s+del\s+Empleado\s+P[úu]blico", r"\bEBEP\b",
                  r"RDL\s*5/2015", r"Real\s+Decreto\s+Legislativo\s*5/2015",
                  r"derecho\s+de\s+reuni[óo]n\s+de\s+las?\s+personas?\s+empleadas?\s+p[úu]blicas?",
                  r"potestad\s+disciplinaria",
                  r"derechos\s+del\s+personal\s+estatutario",
                  r"r[ée]gimen\s+estatutario"]},
    {"id": 23, "name": "Gobierno Vasco / Lehendakari", "law": "Gobierno y Admón Vasca", "color": "indigo",
     "patterns": [r"\bLehendakari\b", r"\blehendakari\b", r"Gobierno\s+Vasco", r"Decreto\s*7/2021",
                  r"Ley\s*7/1981", r"Ley\s*8/2003", r"procedimiento\s+de\s+elaboraci[óo]n",
                  r"nombramiento\s+del\s+Gobierno",
                  r"\bDecreto[s]?\s+(del\s+)?Gobierno\b",
                  r"Decretos?\s+Legislativos?",
                  r"Gobierno\s+y\s+Administraci[óo]n"]},
    {"id": 24, "name": "Hacienda y Patrimonio", "law": "Hacienda Vasca", "color": "stone",
     "patterns": [r"Hacienda\s+General\s+del\s+Pa[íi]s\s+Vasco", r"Patrimonio\s+de\s+Euskadi",
                  r"presupuestos\s+generales", r"Tribunal\s+Vasco\s+de\s+Cuentas",
                  r"Patrimonio\s+de\s+la\s+Comunidad\s+Aut[óo]noma",
                  r"Comisi[óo]n\s+Mixta.*cupo",
                  r"\bcupo\b.*territorios?\s+hist[óo]ricos?"]},
    {"id": 25, "name": "Contratación pública", "law": "Ley 9/2017", "color": "amber",
     "patterns": [r"Ley\s*9/2017", r"contratos\s+del\s+sector\s+p[úu]blico",
                  r"contrataci[óo]n\s+p[úu]blica"]},
    {"id": 26, "name": "Subvenciones", "law": "Ley 38/2003", "color": "rose",
     "patterns": [r"Ley\s*38/2003", r"\bsubvenci[oó]n\b", r"\bsubvenciones\b"]},
    {"id": 27, "name": "Función pública vasca", "law": "Ley 11/2022", "color": "emerald",
     "patterns": [r"Ley\s*11/2022", r"Funci[óo]n\s+P[úu]blica\s+Vasca",
                  r"Ley\s*6/1989"]},
    {"id": 28, "name": "Negociación colectiva / Sindicatos", "law": "Repr. trabajadores", "color": "sky",
     "patterns": [r"Junta\s+de\s+Personal", r"negociaci[óo]n\s+colectiva",
                  r"libertad\s+sindical", r"derecho\s+de\s+huelga"]},
    {"id": 29, "name": "Gestión de RRHH y organizaciones", "law": "Temario gestión", "color": "violet",
     "patterns": [r"Recursos\s+Humanos", r"gesti[óo]n\s+por\s+competencias",
                  r"motivaci[óo]n\b", r"liderazgo", r"clima\s+laboral",
                  r"selecci[óo]n\s+de\s+personal"]},
    {"id": 30, "name": "Gestión de compras y almacén", "law": "Temario gestión", "color": "teal",
     "patterns": [r"compras?\s+en\s+la\s+empresa", r"\balmac[ée]n\b",
                  r"\baprovisionamiento\b", r"\bproveedor\b", r"\bnegociaci[óo]n\b",
                  r"gesti[óo]n\s+de\s+stocks?"]},
    {"id": 31, "name": "Contabilidad y finanzas", "law": "Temario gestión", "color": "indigo",
     "patterns": [r"\bcontabilidad\b", r"Plan\s+General\s+de\s+Contabilidad",
                  r"\bbalance\b", r"cuenta\s+de\s+p[ée]rdidas"]},
    {"id": 32, "name": "Marketing y comunicación", "law": "Temario gestión", "color": "stone",
     "patterns": [r"\bmarketing\b", r"\bpublicidad\b", r"comunicaci[óo]n\s+(corporativa|externa|interna)"]},
    {"id": 33, "name": "Ararteko (Defensor pueblo vasco)", "law": "Ley 3/1985", "color": "amber",
     "patterns": [r"\bArarteko\b", r"Ley\s*3/1985"]},
    {"id": 36, "name": "Transparencia y buen gobierno", "law": "Ley 19/2013", "color": "violet",
     "patterns": [r"Ley\s*19/2013", r"\btransparencia\b.*acceso", r"acceso\s+a\s+la\s+informaci[óo]n\s+p[úu]blica",
                  r"buen\s+gobierno"]},
    {"id": 37, "name": "Personal residente / MIR-EIR", "law": "RD 1146/2006", "color": "teal",
     "patterns": [r"RD\s*1146/2006", r"Real\s+Decreto\s+1146/2006",
                  r"relaci[óo]n\s+laboral\s+especial\s+de\s+resident"]},
    {"id": 38, "name": "Personas interesadas en el procedimiento", "law": "Ley 39/2015", "color": "violet",
     "patterns": [r"personas?\s+interesadas?\s+en\s+(el|un)\s+procedimiento",
                  r"actuaciones\s+con\s+varias\s+personas\s+interesadas",
                  r"publicaci[óo]n\s+oficial\s+de\s+normas"]},
    {"id": 34, "name": "Defensa de la competencia / Consumo", "law": "Temario gestión", "color": "rose",
     "patterns": [r"defensa\s+de\s+la\s+competencia", r"\bconsumidor(es)?\b",
                  r"\bcompetencia\s+desleal\b"]},
    {"id": 35, "name": "Empresa, organización y planificación", "law": "Temario gestión", "color": "emerald",
     "patterns": [r"\bempresa\b", r"\borganizaci[óo]n\s+empresarial\b",
                  r"\bplanificaci[óo]n\s+(estrat[ée]gica|operativa)\b",
                  r"\banálisis\s+DAFO\b", r"\bcuadro\s+de\s+mando\b",
                  r"\bcadena\s+de\s+valor\b", r"\bestrategia\s+(competitiva|empresarial)\b"]},
    {"id": 99, "name": "Otros", "law": "—", "color": "stone", "patterns": []},
]

DIFFICULTY_KEYWORDS_HARD = [
    r"\bplazo\b", r"\bd[íi]as?\b", r"\bmeses?\b", r"\bhoras?\b",
    r"\ba[ñn]os?\b", r"\bporcentaje\b", r"\b\d{1,3}\s*%",
]


def clean_text(line: str) -> str:
    """Strip watermark fragments, normalize whitespace."""
    s = line.rstrip()
    # Trailing watermark fragments at end of line
    for frag in sorted(WATERMARK_FRAGMENTS, key=len, reverse=True):
        s = re.sub(rf"\s+{re.escape(frag)}\s*$", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def is_skip_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if HEADER_RE.search(s):
        return True
    # Stand-alone watermark fragments
    if s in WATERMARK_FRAGMENTS:
        return True
    if re.fullmatch(r"[A-Za-z@\.\-]{1,5}", s) and s.lower() in {f.lower() for f in WATERMARK_FRAGMENTS}:
        return True
    if re.fullmatch(r"[\.\-_=]+", s):
        return True
    return False


def reassemble_markers(text: str) -> str:
    """Re-merge (Cor- ... recta) and (Inco- ... rrecta) split across the page."""
    # Same line: "(Cor-  recta)" → "(Correcta)"
    text = re.sub(r"\(Cor-\s+recta\)", "(Correcta)", text)
    text = re.sub(r"\(Inco-\s+rrecta\)", "(Incorrecta)", text)
    text = re.sub(r"\(In-\s+correcta\)", "(Incorrecta)", text)
    text = re.sub(r"\(Co-\s+rrecta\)", "(Correcta)", text)
    # Across lines (any whitespace incl. newlines, plus possible watermark fragments)
    wm = "(?:" + "|".join(re.escape(f) for f in sorted(WATERMARK_FRAGMENTS, key=len, reverse=True)) + ")"
    text = re.sub(rf"\(Cor-(?:[\s]|{wm})*recta\)", "(Correcta)", text)
    text = re.sub(rf"\(Inco-(?:[\s]|{wm})*rrecta\)", "(Incorrecta)", text)
    text = re.sub(rf"\(In-(?:[\s]|{wm})*correcta\)", "(Incorrecta)", text)
    text = re.sub(rf"\(Co-(?:[\s]|{wm})*rrecta\)", "(Correcta)", text)
    # INVERTED order: "recta)" appears before "(Cor-" due to PDF positioning.
    # Replace the orphan "recta)" with "(Correcta)" if a nearby "(Cor-" exists, then drop "(Cor-".
    # We do this conservatively, only if both appear within a 400-char window.
    def _invert_pass(t: str, head: str, tail: str, replacement: str) -> str:
        # Find all "tail)" positions and pair with the next "(head-" within 600 chars
        out_parts = []
        last = 0
        # Match orphan tail: tail) preceded by non-letter and followed by non-letter
        tail_pat = rf"(?<![A-Za-zñÑáéíóúÁÉÍÓÚ]){re.escape(tail)}"
        for m in re.finditer(tail_pat, t):
            if m.start() < last:
                continue
            window = t[m.end():m.end()+600]
            mh = re.search(rf"\({re.escape(head)}-", window)
            if mh:
                out_parts.append(t[last:m.start()])
                out_parts.append(replacement)
                head_abs_start = m.end() + mh.start()
                head_abs_end = m.end() + mh.end()
                out_parts.append(t[m.end():head_abs_start])
                last = head_abs_end
        out_parts.append(t[last:])
        return "".join(out_parts)

    text = _invert_pass(text, "Cor", "recta)", "(Correcta)")
    text = _invert_pass(text, "Inco", "rrecta)", "(Incorrecta)")
    return text


def strip_glued_watermark(text: str) -> str:
    """Some watermark fragments get glued to the option marker, e.g. 'os(d)'.
    Strip leading 1-3 letter alpha tokens immediately followed by '('."""
    # Specifically those that match watermark fragments
    wm_re = "|".join(re.escape(f) for f in WATERMARK_FRAGMENTS if f.isalpha() and len(f) <= 3)
    text = re.sub(rf"(?:^|\b)(?:{wm_re})(?=\([abcd]\))", "", text, flags=re.MULTILINE)
    # Also remove e.g. "iEstatuto." artifacts at line start
    text = re.sub(r"^\s*iEstatuto\.?\s*", "", text, flags=re.MULTILINE)
    return text


def extract_text(pdf_path: Path) -> str:
    res = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        capture_output=True, text=True, check=True,
    )
    raw = res.stdout
    raw = reassemble_markers(raw)
    raw = strip_glued_watermark(raw)
    return raw


def extract_text_raw(pdf_path: Path) -> str:
    """No -layout. Markers tend to land directly below each option."""
    res = subprocess.run(
        ["pdftotext", str(pdf_path), "-"],
        capture_output=True, text=True, check=True,
    )
    return res.stdout


def recover_correct_from_raw(raw_text: str, qnum: int) -> int | None:
    """For a question that failed primary parsing, find correct option using the
    no-layout text. Two-pass logic:
    1. Detect immediate markers (same line or directly below before next option).
    2. For options lacking an immediate marker, attribute trailing markers in order.
    """
    region_re = rf"^{qnum}\.\s.*?(?=^{qnum + 1}\.\s|\Z)"
    m = re.search(region_re, raw_text, re.MULTILINE | re.DOTALL)
    if not m:
        return None
    region = m.group(0)

    # Find all option positions and trailing markers in order.
    tokens: list[tuple[str, str]] = []  # ("opt", letter) | ("mark", "C"/"I")
    for line in region.splitlines():
        s = line.strip()
        if not s:
            continue
        opt = re.match(r"^\(([abcd])\)\s", s)
        if opt:
            letter = opt.group(1)
            tokens.append(("opt", letter))
            # In-line markers
            if "(Correcta)" in s:
                tokens.append(("mark", "C"))
            if "(Incorrecta)" in s:
                tokens.append(("mark", "I"))
            if s.endswith("recta)") and "(Correcta)" not in s:
                tokens.append(("mark", "C"))
            continue
        if s == "(Correcta)" or s.endswith("(Correcta)"):
            tokens.append(("mark", "C"))
        elif s == "(Incorrecta)" or s.endswith("(Incorrecta)"):
            tokens.append(("mark", "I"))
        elif s == "recta)":
            tokens.append(("mark", "C"))
        elif s == "(Cor-":
            pass  # consumed by recta) above; ignore the standalone "(Cor-"
        elif s == "rrecta)":
            tokens.append(("mark", "I"))

    # Walk tokens. Build per-option marker list. Options without an immediate
    # marker get queued; trailing orphan markers are assigned in order.
    options: list[str] = []  # marker per option, "" if pending
    pending: list[int] = []  # indices into options waiting for a marker
    for kind, val in tokens:
        if kind == "opt":
            options.append("")
            pending.append(len(options) - 1)
        else:
            # Assign to first pending option
            if pending:
                idx = pending.pop(0)
                options[idx] = val
            # If no pending (extra marker), ignore.
    if "C" in options:
        return options.index("C")
    # Fallback: if 3 are I, the missing one is C.
    if options.count("I") == 3 and len(options) == 4:
        return options.index("")
    return None


def parse_pdf(pdf_path: Path, source: str) -> list[dict]:
    """Parse a PDF into a list of question dicts."""
    raw = extract_text(pdf_path)
    raw_no_layout = extract_text_raw(pdf_path)
    lines = [l for l in raw.splitlines() if not is_skip_line(l)]

    # Build a stream of "logical" lines (clean watermark trails)
    cleaned = [clean_text(l) for l in lines if clean_text(l)]

    # Track per-question incorrect counts to recover correctIndex when needed.
    questions: list[dict] = []
    incorrect_counts_per_q: list[list[int]] = []  # [q][option] -> count of (Incorrecta)
    i = 0
    while i < len(cleaned):
        line = cleaned[i]
        m = QUESTION_RE.match(line)
        if not m:
            i += 1
            continue

        qnum = int(m.group(1))
        # Avoid false positives: headers like "1.- ..." inside text. The number
        # should be small enough and the text should reasonably be a question.
        if qnum < 1 or qnum > 600:
            i += 1
            continue

        question_text_parts = [m.group(2).strip()]
        i += 1
        # Accumulate question text until first option marker
        while i < len(cleaned) and not OPTION_RE.match(cleaned[i]):
            # Stop if a new question number appears
            if QUESTION_RE.match(cleaned[i]):
                break
            question_text_parts.append(cleaned[i].strip())
            i += 1

        # Now collect options until either next question or end.
        options_raw: list[str] = ["", "", "", ""]
        marker_per_opt: list[str] = ["", "", "", ""]  # "C" / "I" / ""
        pending_queue: list[int] = []  # option indices awaiting an orphan marker
        impugnable = False
        current_letter = None

        def assign(letter_idx: int, marker: str) -> None:
            if not marker_per_opt[letter_idx]:
                marker_per_opt[letter_idx] = marker
            # If marker contradicts (e.g. duplicated), we keep the first one.

        while i < len(cleaned):
            if QUESTION_RE.match(cleaned[i]):
                nxt = QUESTION_RE.match(cleaned[i])
                if nxt and int(nxt.group(1)) == qnum + 1:
                    break
                if not OPTION_RE.match(cleaned[i]):
                    break

            opt_match = OPTION_RE.match(cleaned[i])
            if opt_match:
                current_letter = opt_match.group(1)
                idx = ord(current_letter) - ord("a")
                text = opt_match.group(2)
                inline_marker = ""
                if CORRECT_RE.search(text):
                    inline_marker = "C"
                elif INCORRECT_RE.search(text):
                    inline_marker = "I"
                text = CORRECT_RE.sub("", text)
                text = INCORRECT_RE.sub("", text)
                options_raw[idx] = text.strip()
                if inline_marker:
                    assign(idx, inline_marker)
                else:
                    pending_queue.append(idx)
                i += 1
                continue

            if IMPUGNABLE_RE.search(cleaned[i]):
                impugnable = True
                i += 1
                continue

            line_text = cleaned[i].strip()
            # Check if it's a pure orphan marker (ignoring surrounding whitespace).
            is_orphan_correct = bool(re.fullmatch(r"\(?\s*Correcta\s*\)?", line_text))
            is_orphan_incorrect = bool(re.fullmatch(r"\(?\s*Incorrecta\s*\)?", line_text))
            has_correct_in_line = bool(CORRECT_RE.search(line_text))
            has_incorrect_in_line = bool(INCORRECT_RE.search(line_text))

            if is_orphan_correct or (has_correct_in_line and not is_orphan_incorrect and len(line_text) < 30):
                # Orphan (Correcta) on its own (or near-own) line — assign to next pending option.
                if pending_queue:
                    idx = pending_queue.pop(0)
                    assign(idx, "C")
                i += 1
                continue
            if is_orphan_incorrect or (has_incorrect_in_line and not has_correct_in_line and len(line_text) < 30):
                if pending_queue:
                    idx = pending_queue.pop(0)
                    assign(idx, "I")
                i += 1
                continue

            if current_letter is not None:
                idx = ord(current_letter) - ord("a")
                extra = line_text
                # Markers embedded mid-text — usually still belong to current option
                if CORRECT_RE.search(extra):
                    assign(idx, "C")
                    if idx in pending_queue:
                        pending_queue.remove(idx)
                if INCORRECT_RE.search(extra):
                    assign(idx, "I")
                    if idx in pending_queue:
                        pending_queue.remove(idx)
                extra = CORRECT_RE.sub("", extra)
                extra = INCORRECT_RE.sub("", extra)
                extra = extra.strip()
                if extra:
                    options_raw[idx] = (options_raw[idx] + " " + extra).strip()
                i += 1
            else:
                question_text_parts.append(line_text)
                i += 1

        # Determine correctIndex from per-option markers
        correct_idx: int | None = None
        for k, m_ in enumerate(marker_per_opt):
            if m_ == "C":
                correct_idx = k
                break
        # Backwards-compat counters for diagnostics
        incorrect_marks = [1 if m_ == "I" else 0 for m_ in marker_per_opt]
        correct_marks = [1 if m_ == "C" else 0 for m_ in marker_per_opt]

        question_text = re.sub(r"\s+", " ", " ".join(question_text_parts)).strip()
        opts = [re.sub(r"\s+", " ", o).strip() for o in options_raw]

        # Normalize: strip trailing periods doubled, leftover parens
        opts = [re.sub(r"\(\s*\)", "", o).strip() for o in opts]

        # Heuristic 1: if no (Correcta) found but exactly 3 of 4 options have (Incorrecta),
        # the remaining one is the correct answer.
        if correct_idx is None:
            no_incorrect = [k for k in range(4) if incorrect_marks[k] == 0]
            if len(no_incorrect) == 1:
                correct_idx = no_incorrect[0]

        # Heuristic 2: re-parse this question's region from no-layout text,
        # finding the option immediately above the (Correcta)/recta) marker.
        if correct_idx is None:
            recovered = recover_correct_from_raw(raw_no_layout, qnum)
            if recovered is not None:
                correct_idx = recovered

        questions.append({
            "_num": qnum,
            "source": source,
            "question": question_text,
            "options": opts,
            "correctIndex": correct_idx,
            "impugnable": impugnable,
            "_incorrect_marks": incorrect_marks,
            "_correct_marks": correct_marks,
        })

    return questions


def classify_block(text: str) -> tuple[int, str, str]:
    for blk in BLOCKS:
        for pat in blk["patterns"]:
            if re.search(pat, text, re.IGNORECASE):
                return blk["id"], blk["name"], blk["law"]
    return 99, "Otros", "—"


def guess_difficulty(q: dict) -> str:
    if q["impugnable"]:
        return "hard"
    text = q["question"].lower()
    # Hard if contains numeric/temporal data
    if any(re.search(p, text) for p in DIFFICULTY_KEYWORDS_HARD):
        return "hard"
    # Easy if very short or "señale la correcta" simple
    if len(text) < 80:
        return "easy"
    return "medium"


def main() -> int:
    print(f"Extrayendo de: {PDF_COMMON.name}")
    common = parse_pdf(PDF_COMMON, "comun")
    print(f"  -> {len(common)} preguntas")

    print(f"Extrayendo de: {PDF_TECNICO.name}")
    tecnico = parse_pdf(PDF_TECNICO, "tecnico")
    print(f"  -> {len(tecnico)} preguntas")

    all_q = common + tecnico
    out = []
    next_id = 1
    missing_correct: list[tuple[str, int]] = []

    for q in all_q:
        block_id, _block_name, law = classify_block(q["question"])
        difficulty = guess_difficulty(q)
        if q["correctIndex"] is None:
            missing_correct.append((q["source"], q["_num"]))
        out.append({
            "id": next_id,
            "blockId": block_id,
            "law": law,
            "source": q["source"],
            "sourceNum": q["_num"],
            "question": q["question"],
            "options": q["options"],
            "correctIndex": q["correctIndex"] if q["correctIndex"] is not None else 0,
            "impugnable": q["impugnable"],
            "explanation": "",
            "mnemonic": None,
            "difficulty": difficulty,
        })
        next_id += 1

    # Only include blocks that actually have at least one question
    counts: dict[int, int] = {}
    for q in out:
        counts[q["blockId"]] = counts.get(q["blockId"], 0) + 1
    used_blocks = [
        {"id": b["id"], "name": b["name"], "law": b["law"], "color": b["color"]}
        for b in BLOCKS if counts.get(b["id"], 0) > 0
    ]
    raw_out = {
        "blocks": used_blocks,
        "questions": out,
    }
    out_path = DATA / "questions.json"
    out_path.write_text(json.dumps(raw_out, ensure_ascii=False, indent=2))
    print(f"\nGuardado: {out_path}")
    print(f"Total: {len(out)} preguntas")

    # Summary by block
    print("\nPor bloque:")
    for b in BLOCKS:
        if counts.get(b["id"], 0) > 0:
            print(f"  [{b['id']:>2}] {b['name']:<40} {counts[b['id']]:>4}")

    if missing_correct:
        print(f"\n⚠️  {len(missing_correct)} preguntas SIN correctIndex (por watermark):")
        for src, num in missing_correct:
            print(f"   - {src}#{num}")

    impugnables = [q for q in out if q["impugnable"]]
    print(f"\nImpugnables: {len(impugnables)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
