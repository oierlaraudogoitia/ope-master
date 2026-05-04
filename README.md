# OPE Master · Osakidetza 23-24-25

Web app móvil-first en español para preparar el examen tipo test de la **OPE 23-24-25 de Osakidetza** (categoría: Técnico Superior de Administración y Gestión). Examen el 19 de junio de 2026.

Incluye **650 preguntas** extraídas de los PDFs oficiales (200 de la batería común + 450 del temario específico), organizadas en 30+ bloques temáticos, con explicaciones, modos de estudio variados y un plan de 30 días.

---

## Stack

- React 18 + TypeScript estricto
- Vite (build estática · `base: './'`, abre desde el sistema de archivos)
- Tailwind CSS con tipografías **Fraunces** + **DM Sans**
- `react-router-dom` (HashRouter, sirve sin servidor)
- `lucide-react` para iconos
- Persistencia local en `localStorage` (`osakidetza-progress` y `osakidetza-meta`)
- 100 % offline tras la primera carga

## Modos disponibles

- **Aprender** — Lectura por bloque temático con respuesta y explicación visibles. No puntúa.
- **Test rápido** — 10 / 20 / 50 preguntas aleatorias con corrección inmediata, opcionalmente filtradas por bloque.
- **Flashcards** — Repetición espaciada SM-2 simplificada (cajas: 1, 1, 3, 7, 15, 30, 60 días). Máx. 25 cartas/día.
- **Solo falladas** — Repaso de las preguntas con la última respuesta incorrecta.
- **Simulacro** — 25 / 50 / 100 preguntas cronometradas (30 / 60 / 90 min) con índice de navegación, marcador de revisión y resultados al final.
- **Estadísticas** — Acierto global y por bloque, racha, heatmap de 30 días, top 10 más difíciles, histórico de simulacros, reset.
- **Plan de 30 días** — Sesión recomendada para cada día hasta el examen.

---

## Instalación

Necesitas Node.js 18+ y npm.

```bash
cd "OPE Master"
npm install
```

## Desarrollo local

```bash
npm run dev
```

Abre `http://localhost:5173` (también accesible desde tu red local en `http://<tu-ip>:5173`).

## Build de producción

```bash
npm run build
```

La carpeta `dist/` resultante es **completamente estática y autosuficiente**. Puedes:

- Servirla con cualquier servidor estático: `npx serve dist`
- Abrir `dist/index.html` directamente con doble click (incluso en el móvil) — funciona porque usamos `HashRouter` y `base: './'`.

---

## Cómo usarla en tu móvil

### Opción 1 — Servir desde tu PC (recomendado para uso diario)

1. En tu PC: `npm run dev`. Vite mostrará una URL tipo `http://192.168.1.42:5173`.
2. En tu móvil, abre esa URL en el navegador. Quedará disponible mientras tu PC esté encendido y en la misma WiFi.
3. En iOS: añade a la pantalla de inicio para que parezca una app nativa (Safari → Compartir → "Añadir a pantalla de inicio").

### Opción 2 — Sube la build a internet (gratis y permanente)

Para usarla sin depender de tu PC.

#### Netlify (drag & drop, lo más rápido)

1. `npm run build`
2. Ve a https://app.netlify.com/drop e arrastra la carpeta `dist/`.
3. Te dará una URL tipo `https://ope-master-XXX.netlify.app`. Ya puedes abrirla desde el móvil.

#### Vercel (CLI)

```bash
npm i -g vercel
vercel deploy --prod  # responde a las preguntas; cuando pida output dir, pon "dist"
```

#### GitHub Pages

1. Crea un repo en GitHub (público) y haz push del proyecto.
2. En `vite.config.ts` deja `base: './'` (ya está así).
3. Tras `npm run build`, haz push del contenido de `dist/` a una rama `gh-pages` (o usa la action `peaceiris/actions-gh-pages`).
4. Activa Pages en Settings → Pages → Source: rama `gh-pages`.

### Opción 3 — Carpeta local (offline puro)

Copia la carpeta `dist/` al móvil (vía AirDrop, USB, Drive, etc.) y abre `index.html` con un navegador (Safari/Chrome). Funciona offline.

---

## Estructura de carpetas

```
OPE Master/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── scripts/                     ← utilidades (no van al build)
│   ├── extract.py               ← parsea los PDFs → questions.json
│   ├── cleanup_text.py          ← limpia restos de marca de agua
│   ├── apply_explanations.py    ← genera explicaciones plantilla
│   └── manual_explanations.py   ← explicaciones hechas a mano (impugnables, etc.)
├── src/
│   ├── components/              ← Layout, Button, Card, ProgressBar, QuestionView, BlockBadge
│   ├── pages/                   ← Home, Blocks, Study, Test, Flashcards, OnlyWrong, Simulacro, Stats, Plan
│   ├── hooks/                   ← useLocalStorage, useProgress
│   ├── lib/                     ← spacedRepetition, studyPlan, dateUtils, blockColors, data
│   ├── types/                   ← types.ts
│   ├── data/
│   │   └── questions.json       ← 650 preguntas + bloques
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── dist/                        ← build de producción (tras `npm run build`)
```

---

## Cómo añadir o editar preguntas

Las preguntas viven en `src/data/questions.json` con esta forma:

```jsonc
{
  "blocks": [
    { "id": 1, "name": "Profesiones Sanitarias", "law": "Ley 44/2003", "color": "amber" }
    // ...
  ],
  "questions": [
    {
      "id": 1,
      "blockId": 1,
      "law": "Ley 44/2003",
      "source": "comun",          // "comun" | "tecnico"
      "sourceNum": 1,
      "question": "...",
      "options": ["a", "b", "c", "d"],
      "correctIndex": 0,           // 0..3
      "impugnable": false,
      "explanation": "...",
      "mnemonic": null,            // o un string corto
      "difficulty": "medium"       // "easy" | "medium" | "hard"
    }
  ]
}
```

**Para añadir nuevas preguntas a mano**: edita `src/data/questions.json` añadiendo una entrada al array `questions` con un `id` único.

**Para reextraer desde un PDF nuevo**: ajusta `scripts/extract.py` (rutas + lista `BLOCKS` con sus patrones de detección) y ejecútalo:

```bash
python3 scripts/extract.py
python3 scripts/cleanup_text.py
python3 scripts/apply_explanations.py
python3 scripts/manual_explanations.py
```

Necesitas `poppler-utils` instalado: `brew install poppler` (macOS).

**Para añadir explicaciones de calidad a mano**: edita `scripts/manual_explanations.py` añadiendo entradas al diccionario `MANUAL` (clave: `(source, sourceNum)`, valor: `(explicación, mnemónica_o_None)`), y vuelve a correrlo.

---

## Notas sobre la calidad de los datos

- **Parsing**: los PDFs incluyen una marca de agua (`osakidetza@ugt-speuskadi.org`) fragmentada por las páginas como técnica anti-copia. El extractor (`scripts/extract.py`) la elimina y reconstruye marcadores partidos como `(Cor- … recta)` por reglas heurísticas de varias capas. El 100 % de las 650 preguntas se han recuperado correctamente.
- **Clasificación**: ~85 % de las preguntas se han clasificado en un bloque temático específico; el resto cae en el bloque genérico "Otros" y se puede recategorizar a mano editando `scripts/extract.py` y reextrayendo.
- **Explicaciones**: hay 14 escritas a mano en profundidad (las 7 impugnables + 7 muestras de las leyes principales) y 636 generadas con plantilla — cortas, factualmente correctas (citan la opción correcta) y útiles como punto de partida. Para profundizar más, edita `scripts/manual_explanations.py`.
- **Mnemotecnias**: solo activas en las 14 explicaciones manuales (campo `mnemonic`). El resto están a `null`.
- **Impugnables**: 7 preguntas marcadas como tal (badge naranja en la app), todas con explicación detallada del porqué de la controversia.

## Persistencia

Todo el progreso vive en `localStorage` del navegador donde uses la app:

- `osakidetza-progress` → caja SR, próximo repaso, vistas/aciertos/fallos por pregunta, marcador.
- `osakidetza-meta` → fecha de inicio, días estudiados, histórico de simulacros.

**Importante**: si borras los datos del navegador o cambias de dispositivo, pierdes el progreso. Para hacer copia de seguridad, abre DevTools → Application → Local Storage → exporta los dos valores como JSON.

---

## Licencia

Uso personal. Las preguntas son recopilación de UGT Euskadi para preparación de la OPE.
