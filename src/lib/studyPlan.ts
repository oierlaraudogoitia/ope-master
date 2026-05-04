import type { PlanDay, Block } from '../types/types';

// Plantilla del plan de 30 días. Los blockIds se rellenan en runtime con los bloques principales.
// Días 1-13: aprender + flashcards + tests por bloques temáticos.
// Día 14: repaso intermedio (solo falladas).
// Días 15-20: aprender + tests del resto de bloques.
// Día 21: SIMULACRO 1 (50 preguntas, 60 min).
// Días 22-23: repaso + flashcards de difíciles.
// Día 24: SIMULACRO 2 (50 preguntas, 60 min).
// Días 25-26: refuerzo de bloques peor %.
// Día 27: SIMULACRO 3 (60 preguntas, 70 min).
// Días 28-29: repasos finales.
// Día 30: descanso.

export function buildPlan(blocks: Block[]): PlanDay[] {
  // Bloques ordenados por relevancia para el examen (leyes densas primero)
  const PRIORITY_BLOCK_IDS = [
    1,  // Profesiones Sanitarias (Ley 44/2003)
    2,  // Cohesión SNS (Ley 16/2003)
    3,  // Estatuto Marco (Ley 55/2003)
    4,  // Ordenación Sanitaria Euskadi (Ley 8/1997)
    7,  // Autonomía paciente (Ley 41/2002)
    8,  // Voluntades Anticipadas (Ley 7/2002)
    9,  // Protección de Datos (LO 3/2018)
    10, // Igualdad / Violencia Machista (DL 1/2023)
    19, // Constitución 1978
    20, // Estatuto Autonomía PV
    21, // Procedimiento Administrativo (Ley 39/2015)
    22, // EBEP
    23, // Gobierno Vasco / Lehendakari
    25, // Contratación pública
    24, // Hacienda y Patrimonio
    11, // Plan de Salud Euskadi 2030
    12, // Pacto Vasco de Salud
    17, // Eutanasia
    18, // Incompatibilidades
  ];
  const available = new Set(blocks.map((b) => b.id));
  const main = PRIORITY_BLOCK_IDS.filter((id) => available.has(id));
  const rest = blocks.map((b) => b.id).filter((id) => !main.includes(id) && id !== 99);

  const blockName = (id: number): string => blocks.find((b) => b.id === id)?.name ?? '';

  const days: PlanDay[] = [];

  // Helper to push a study day with 1-2 blocks
  const studyDay = (day: number, ids: number[], minutes: number, moment: PlanDay['moment'], extra = ''): PlanDay => {
    const blkNames = ids.map(blockName).filter(Boolean).join(' + ');
    return {
      day,
      mode: day % 2 === 0 ? 'test' : 'aprender',
      blockIds: ids,
      description: extra || `${blkNames}`,
      minutes,
      moment,
    };
  };

  // Days 1-13: cycle through main blocks, ~2 per day, alternating Aprender/Test
  let mainIdx = 0;
  for (let d = 1; d <= 13; d++) {
    const a = main[mainIdx % main.length];
    const b = main[(mainIdx + 1) % main.length];
    mainIdx += 2;
    const minutes = d <= 4 ? 90 : d <= 9 ? 120 : 150;
    days.push(studyDay(d, [a, b], minutes, d % 2 === 0 ? 'tarde' : 'mañana'));
    // Insert flashcards on every 3rd day
    if (d === 3 || d === 6 || d === 9 || d === 12) {
      days[days.length - 1].mode = 'flashcards';
      days[days.length - 1].description = `Flashcards de los últimos bloques estudiados`;
    }
  }

  // Day 14: REPASO INTERMEDIO
  days.push({
    day: 14,
    mode: 'repaso',
    blockIds: [],
    description: 'Repaso intermedio: solo preguntas falladas hasta hoy',
    minutes: 90,
    moment: 'tarde',
  });

  // Days 15-20: rest of blocks + test
  let restIdx = 0;
  for (let d = 15; d <= 20; d++) {
    const ids: number[] = [];
    if (rest.length > 0) {
      ids.push(rest[restIdx % rest.length]);
      restIdx++;
      if (rest.length > 1) {
        ids.push(rest[restIdx % rest.length]);
        restIdx++;
      }
    } else {
      ids.push(main[mainIdx % main.length]);
      mainIdx++;
    }
    days.push(studyDay(d, ids, 120, d % 2 === 0 ? 'tarde' : 'mañana'));
  }

  // Day 21: SIMULACRO 1
  days.push({
    day: 21,
    mode: 'simulacro',
    blockIds: [],
    description: 'Simulacro 1: 50 preguntas en 60 minutos',
    minutes: 75,
    moment: 'mañana',
    testSize: 50,
    durationMin: 60,
  });

  // Days 22-23: repaso + flashcards
  days.push({
    day: 22,
    mode: 'repaso',
    blockIds: [],
    description: 'Repaso de fallos del simulacro 1',
    minutes: 90,
    moment: 'tarde',
  });
  days.push({
    day: 23,
    mode: 'flashcards',
    blockIds: [],
    description: 'Flashcards de las preguntas más difíciles',
    minutes: 75,
    moment: 'mañana',
  });

  // Day 24: SIMULACRO 2
  days.push({
    day: 24,
    mode: 'simulacro',
    blockIds: [],
    description: 'Simulacro 2: 50 preguntas en 60 minutos',
    minutes: 75,
    moment: 'mañana',
    testSize: 50,
    durationMin: 60,
  });

  // Days 25-26: refuerzo bloques peores
  days.push({
    day: 25,
    mode: 'repaso',
    blockIds: [],
    description: 'Refuerzo de bloques con peor % de acierto',
    minutes: 120,
    moment: 'tarde',
  });
  days.push({
    day: 26,
    mode: 'test',
    blockIds: main.slice(0, 4),
    description: 'Test rápido de las leyes principales',
    minutes: 90,
    moment: 'mañana',
  });

  // Day 27: SIMULACRO 3
  days.push({
    day: 27,
    mode: 'simulacro',
    blockIds: [],
    description: 'Simulacro 3: 60 preguntas en 70 minutos',
    minutes: 90,
    moment: 'mañana',
    testSize: 60,
    durationMin: 70,
  });

  // Days 28-29: repasos finales
  days.push({
    day: 28,
    mode: 'flashcards',
    blockIds: [],
    description: 'Flashcards finales: solo difíciles',
    minutes: 60,
    moment: 'tarde',
  });
  days.push({
    day: 29,
    mode: 'repaso',
    blockIds: [],
    description: 'Repaso ligero de fallos pendientes',
    minutes: 45,
    moment: 'mañana',
  });

  // Day 30: descanso
  days.push({
    day: 30,
    mode: 'descanso',
    blockIds: [],
    description: 'Día libre. Confía en lo que has estudiado y descansa.',
    minutes: 0,
    moment: 'libre',
  });

  return days;
}
