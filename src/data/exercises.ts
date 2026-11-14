import type { Exercise } from '../types';

export const EXERCISE_DATABASE: Exercise[] = [
  // --- EMPUJE (PUSH) ---
  {
    id: 'push-wall-pushups',
    name: 'Flexiones en Pared',
    targetMuscle: 'Pectoral, Tríceps, Deltoides',
    category: 'push',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 12,
    restSeconds: 35,
    equipment: 'Pared',
    instructions: [
      'Colócate de pie frente a una pared a un brazo de distancia.',
      'Apoya las palmas en la pared a la altura del pecho y ancho de hombros.',
      'Flexiona los codos acercando el pecho a la pared manteniendo el cuerpo en línea recta.',
      'Empuja con fuerza hasta volver a extender los brazos.'
    ],
    tips: 'Excelente para aprender el patrón de empuje sin cargar todo el peso corporal.'
  },
  {
    id: 'push-knee-pushups',
    name: 'Flexiones con Rodillas en Suelo',
    targetMuscle: 'Pectoral, Tríceps, Core',
    category: 'push',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 45,
    equipment: 'Solo suelo',
    instructions: [
      'Apoya las rodillas y las palmas de las manos en el suelo.',
      'Mantén una línea recta desde la cabeza hasta las rodillas, apretando el abdomen.',
      'Baja el pecho hasta casi rozar el suelo con los codos a 45 grados del torso.',
      'Empuja el suelo con fuerza para subir de forma controlada.'
    ],
    tips: 'No dejes caer la cadera ni levantes los glúteos en exceso; mantén el core firme.'
  },
  {
    id: 'push-classic-pushups',
    name: 'Flexiones Clásicas en Suelo',
    targetMuscle: 'Pectoral Mayor, Tríceps, Deltoides Anterior',
    category: 'push',
    difficulty: 'intermedio',
    type: 'reps',
    defaultAmount: 12,
    restSeconds: 45,
    equipment: 'Solo suelo',
    instructions: [
      'Posición de plancha alta con manos un poco más abiertas que los hombros y pies juntos.',
      'Activa glúteos y abdomen para mantener el cuerpo como una tabla rígida.',
      'Baja controladamente hasta que el pecho quede a 2 cm del suelo.',
      'Empuja explosivamente hasta extender los codos sin hiperextender.'
    ],
    tips: 'Los codos deben formar una flecha (45°) con tu cuerpo, nunca una "T".'
  },
  {
    id: 'push-floor-dips',
    name: 'Fondos de Tríceps en Suelo (Crab Dips)',
    targetMuscle: 'Tríceps, Hombro Posterior',
    category: 'push',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 15,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Siéntate en el suelo con rodillas flexionadas y pies apoyados.',
      'Coloca las palmas en el suelo detrás de ti con los dedos apuntando hacia tus talones.',
      'Eleva la cadera unos centímetros del suelo.',
      'Flexiona los codos hacia atrás bajando la cadera y empuja extendiendo los brazos.'
    ],
    tips: 'Aísla el trabajo en los tríceps enfocando el movimiento solo en la flexión del codo.'
  },
  {
    id: 'push-pike-pushups',
    name: 'Flexiones Pica en Suelo (Pike Push-ups)',
    targetMuscle: 'Hombros (Deltoides), Tríceps, Trapecio',
    category: 'push',
    difficulty: 'intermedio',
    type: 'reps',
    defaultAmount: 8,
    restSeconds: 50,
    equipment: 'Solo suelo',
    instructions: [
      'Colócate en posición de V invertida (como perro boca abajo), con la cadera alta.',
      'Mira hacia tus pies para mantener el cuello neutral.',
      'Baja la cabeza diagonalmente hacia adelante entre tus manos.',
      'Empuja el suelo empujando tu cabeza hacia atrás a la posición inicial.'
    ],
    tips: 'Construye la fuerza vertical necesaria para dominar paradas de manos y hombros fuertes.'
  },
  {
    id: 'push-diamond-pushups',
    name: 'Flexiones Diamante',
    targetMuscle: 'Tríceps, Pectoral Interno, Core',
    category: 'push',
    difficulty: 'avanzado',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 60,
    equipment: 'Solo suelo',
    instructions: [
      'Posición de flexión con las manos juntas bajo el esternón formando un diamante con índices y pulgares.',
      'Mantén los codos pegados al cuerpo mientras desciendes.',
      'Baja hasta que el pecho toque las manos.',
      'Empuja con máxima tensión en los tríceps.'
    ],
    tips: 'Si cuesta mucho al inicio, haz las primeras repeticiones con las rodillas apoyadas.'
  },
  {
    id: 'push-decline-pushups',
    name: 'Flexiones Declinadas en Pared',
    targetMuscle: 'Haz Clavicular (Pecho Alto), Deltoides Anterior',
    category: 'push',
    difficulty: 'avanzado',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 60,
    equipment: 'Suelo y pared',
    instructions: [
      'Coloca las manos en el suelo y apoya las puntas de los pies en la pared a 30-50 cm de altura.',
      'Aprieta glúteos y abdomen para no arquear la zona lumbar.',
      'Baja el pecho de forma controlada hacia el suelo.',
      'Empuja con firmeza hasta la extensión completa.'
    ],
    tips: 'Mayor ángulo de inclinación transfiere más peso a la parte superior del pecho y hombros.'
  },

  // --- TRACCIÓN Y ESPALDA EN SUELO (PULL / POSTERIOR) ---
  {
    id: 'pull-superman-hold',
    name: 'Extensiones Lumbares Superman',
    targetMuscle: 'Erectores Espinales, Glúteos, Escápulas',
    category: 'pull',
    difficulty: 'principiante',
    type: 'time',
    defaultAmount: 30,
    restSeconds: 35,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca abajo con brazos estirados hacia adelante y piernas extendidas.',
      'Simultáneamente eleva el pecho, los brazos y los muslos del suelo unos centímetros.',
      'Siente la contracción en la espalda alta, lumbar y glúteos.',
      'Mantén la posición respirando con calma antes de descender con suavidad.'
    ],
    tips: 'No fuerces el cuello hacia arriba; mantén la mirada en el suelo para cuidar las cervicales.'
  },
  {
    id: 'pull-floor-scapular-pull',
    name: 'Jalones Escapulares en Suelo (Prone W to Y)',
    targetMuscle: 'Dorsales, Romboides, Trapecio Medio/Bajo',
    category: 'pull',
    difficulty: 'intermedio',
    type: 'reps',
    defaultAmount: 12,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Boca abajo con la frente a 2 cm del suelo y brazos en forma de Y.',
      'Eleva los brazos y junta las escápulas con fuerza.',
      'Lleva los codos hacia tus costillas formando una letra W, imaginando que jalas una barra pesada.',
      'Regresa a la posición de Y manteniendo los brazos sin tocar el suelo.'
    ],
    tips: 'El truco está en apretar las escápulas en la posición W como si quisieras aplastar una nuez entre ellas.'
  },
  {
    id: 'pull-swimmers',
    name: 'Nadadores Isométricos en Suelo',
    targetMuscle: 'Cadena Posterior, Deltoides Posterior, Glúteos',
    category: 'pull',
    difficulty: 'intermedio',
    type: 'time',
    defaultAmount: 35,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca abajo con brazos y piernas extendidos.',
      'Eleva brazo derecho y pierna izquierda de forma alterna con ritmo constante.',
      'Alterna con brazo izquierdo y pierna derecha simulando nadar en el suelo.',
      'Mantén el torso estable y el core activo.'
    ],
    tips: 'Movimientos fluidos y controlados, sin balanceos bruscos.'
  },
  {
    id: 'pull-elbow-press',
    name: 'Remo Isométrico de Codos en Suelo',
    targetMuscle: 'Dorsal Ancho, Romboides, Parte Media de la Espalda',
    category: 'pull',
    difficulty: 'avanzado',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 45,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba con rodillas dobladas y pies planos.',
      'Coloca los codos en el suelo a los costados del torso flexionados a 90 grados apuntando al techo.',
      'Clava los codos contra el suelo empujando con toda tu fuerza para despegar los omóplatos y espalda alta del suelo.',
      'Aguanta 2 segundos arriba contrayendo la espalda y desciende controlado.'
    ],
    tips: 'Excelente ejercicio para activar los dorsales sin barra ni pesas.'
  },

  // --- PIERNAS Y GLÚTEOS (LEGS) ---
  {
    id: 'legs-air-squats',
    name: 'Sentadillas Profundas Libres',
    targetMuscle: 'Cuádriceps, Glúteos, Aductores',
    category: 'legs',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 15,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Pies separados al ancho de hombros con puntas ligeramente hacia afuera.',
      'Inicia el movimiento llevando la cadera hacia atrás y abajo manteniendo el pecho erguido.',
      'Desciende hasta que los muslos queden al menos paralelos al suelo.',
      'Empuja a través de toda la planta del pie para levantarte.'
    ],
    tips: 'Las rodillas deben seguir la misma dirección que la punta de tus pies.'
  },
  {
    id: 'legs-glute-bridge',
    name: 'Puente de Glúteos en Suelo',
    targetMuscle: 'Glúteo Mayor, Isquiotibiales, Zona Lumbar',
    category: 'legs',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 16,
    restSeconds: 35,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba con rodillas flexionadas y talones cerca de los glúteos.',
      'Brazos a los lados para estabilidad.',
      'Empuja fuerte con los talones elevando la cadera hasta formar una línea recta de rodillas a hombros.',
      'Aprieta los glúteos arriba por 1 segundo y baja sin relajar del todo.'
    ],
    tips: 'No arquees la espalda baja; la fuerza proviene de apretar los glúteos.'
  },
  {
    id: 'legs-wall-sit',
    name: 'Sentadilla Isométrica en Pared (Wall Sit)',
    targetMuscle: 'Cuádriceps, Estabilidad Articular, Glúteos',
    category: 'legs',
    difficulty: 'intermedio',
    type: 'time',
    defaultAmount: 40,
    restSeconds: 45,
    equipment: 'Pared',
    instructions: [
      'Apoya la espalda completamente plana contra una pared.',
      'Deslízate hacia abajo hasta que tus rodillas queden flexionadas a 90 grados.',
      'Los muslos deben quedar paralelos al suelo y los pies apoyados firmes.',
      'Mantén los brazos cruzados en el pecho o a los lados, sin apoyarlos en las piernas.'
    ],
    tips: 'Respira rítmicamente y mantén la presión distribuida en los talones.'
  },
  {
    id: 'legs-walking-lunges',
    name: 'Zancadas Estáticas en Suelo (Lunges)',
    targetMuscle: 'Cuádriceps, Glúteos, Isquios, Equilibrio',
    category: 'legs',
    difficulty: 'intermedio',
    type: 'reps',
    defaultAmount: 12,
    restSeconds: 45,
    equipment: 'Solo suelo',
    instructions: [
      'Da un paso amplio hacia adelante con una pierna.',
      'Desciende verticalmente doblando ambas rodillas hasta unos 90 grados.',
      'La rodilla trasera debe quedar a 2 cm del suelo.',
      'Empuja con el pie delantero para regresar y cambia de pierna.'
    ],
    tips: 'Mantén el torso erguido como si llevaras un libro en la cabeza.'
  },
  {
    id: 'legs-calf-raises',
    name: 'Elevaciones de Talón en Suelo (Gemelos)',
    targetMuscle: 'Gemelos, Sóleo, Tobillos',
    category: 'legs',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 20,
    restSeconds: 30,
    equipment: 'Solo suelo',
    instructions: [
      'De pie con pies separados al ancho de caderas.',
      'Elévate sobre las puntas de los pies lo más alto posible.',
      'Aguanta un instante en el punto máximo de contracción.',
      'Baja lentamente de manera controlada.'
    ],
    tips: 'Para mayor intensidad, hazlo a una sola pierna.'
  },
  {
    id: 'legs-bulgarian-wall',
    name: 'Sentadilla Búlgara con Apoyo en Pared',
    targetMuscle: 'Cuádriceps, Glúteos, Cadena Unilateral',
    category: 'legs',
    difficulty: 'avanzado',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 50,
    equipment: 'Suelo y pared',
    instructions: [
      'De espaldas a la pared a medio metro de distancia.',
      'Apoya el empeine o punta de un pie contra la pared.',
      'Flexiona la pierna delantera bajando la cadera hasta que el muslo quede paralelo al piso.',
      'Empuja con el talón delantero para subir.'
    ],
    tips: 'Trabajo unilateral brutal de piernas sin necesidad de ninguna mancuerna ni banco.'
  },
  {
    id: 'legs-single-leg-bridge',
    name: 'Puente de Glúteos Unilateral',
    targetMuscle: 'Glúteo Mayor, Isquiotibiales',
    category: 'legs',
    difficulty: 'avanzado',
    type: 'reps',
    defaultAmount: 10,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba, flexiona una pierna y estira la otra hacia el techo.',
      'Empuja exclusivamente con el talón de la pierna apoyada para levantar la pelvis.',
      'Aprieta al máximo arriba y desciende suave.',
      'Completa las repeticiones y repite con la otra pierna.'
    ],
    tips: 'Duplica la carga sobre el glúteo sin requerir peso externo.'
  },

  // --- CORE Y ABDOMINALES (CORE) ---
  {
    id: 'core-elbow-plank',
    name: 'Plancha Frontal de Antebrazos',
    targetMuscle: 'Transverso Abdominal, Recto Abdominal, Hombros',
    category: 'core',
    difficulty: 'principiante',
    type: 'time',
    defaultAmount: 40,
    restSeconds: 35,
    equipment: 'Solo suelo',
    instructions: [
      'Apoya los antebrazos en el suelo alineando los codos justo debajo de los hombros.',
      'Estira las piernas apoyando las puntas de los pies.',
      'Aprieta glúteos, cuádriceps y mete el ombligo hacia la columna.',
      'Mantén el cuerpo en línea recta sin que caiga la cadera.'
    ],
    tips: 'Imagina que intentas juntar tus codos hacia tus pies con fuerza isométrica.'
  },
  {
    id: 'core-deadbug',
    name: 'Dead Bug / Bicho Muerto Controlado',
    targetMuscle: 'Core Profundo, Coordinación, Lumbar',
    category: 'core',
    difficulty: 'principiante',
    type: 'reps',
    defaultAmount: 14,
    restSeconds: 30,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba con brazos apuntando al techo y rodillas en 90 grados sobre caderas.',
      'Presiona la zona lumbar firmemente contra el suelo.',
      'Extiende brazo derecho hacia atrás y pierna izquierda hacia adelante sin tocar el suelo.',
      'Regresa al centro y alterna con brazo izquierdo y pierna derecha.'
    ],
    tips: 'La clave absoluta es no despegar la espalda baja del piso en ningún momento.'
  },
  {
    id: 'core-mountain-climbers',
    name: 'Escaladores en Suelo (Mountain Climbers)',
    targetMuscle: 'Abdomen, Flexores de Cadera, Cardio',
    category: 'core',
    difficulty: 'intermedio',
    type: 'time',
    defaultAmount: 35,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Posición de plancha alta con brazos extendidos y manos bajo hombros.',
      'Lleva una rodilla rápidamente hacia el pecho.',
      'Regrésala mientras llevas la otra rodilla al pecho en movimiento alterno dinámico.',
      'Mantén los hombros sobre las muñecas y la cadera nivelada.'
    ],
    tips: 'Excelente combinación de trabajo de core con activación metabólica y quema de calorías.'
  },
  {
    id: 'core-side-plank',
    name: 'Plancha Lateral en Suelo',
    targetMuscle: 'Oblicuos, Cuadrado Lumbar, Glúteo Medio',
    category: 'core',
    difficulty: 'intermedio',
    type: 'time',
    defaultAmount: 30,
    restSeconds: 35,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate de lado apoyando el antebrazo bajo el hombro y pies uno sobre el otro.',
      'Eleva la cadera hasta que el cuerpo forme una línea recta desde la cabeza a los tobillos.',
      'Brazo superior libre hacia el techo o en la cintura.',
      'Mantén la tensión en el costado y cambia de lado al terminar el tiempo.'
    ],
    tips: 'Si cuesta mantener el balance, apoya el pie superior adelante en el suelo.'
  },
  {
    id: 'core-leg-raises',
    name: 'Elevación de Piernas en Suelo',
    targetMuscle: 'Abdomen Bajo, Flexores de Cadera',
    category: 'core',
    difficulty: 'intermedio',
    type: 'reps',
    defaultAmount: 12,
    restSeconds: 40,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba con manos debajo de los glúteos o a los lados.',
      'Junta las piernas y elévalas estiradas hasta los 90 grados respecto al suelo.',
      'Baja las piernas lentamente sin que los talones toquen el suelo.',
      'Evita que la espalda baja se arquee al descender.'
    ],
    tips: 'Si sientes molestia lumbar, flexiona ligeramente las rodillas.'
  },
  {
    id: 'core-hollow-body',
    name: 'Hollow Body Hold (Postura de Barca)',
    targetMuscle: 'Cadena Anterior Completa, Recto Abdominal',
    category: 'core',
    difficulty: 'avanzado',
    type: 'time',
    defaultAmount: 30,
    restSeconds: 45,
    equipment: 'Solo suelo',
    instructions: [
      'Acuéstate boca arriba, aplasta la zona lumbar contra el suelo.',
      'Eleva los hombros y las piernas estiradas a unos 15 cm del piso.',
      'Brazos extendidos hacia atrás junto a las orejas.',
      'El cuerpo debe formar una forma de banana o barca rígida.'
    ],
    tips: 'El ejercicio rey de la calistenia para transferir fuerza a dominadas, flexiones y planchas.'
  }
];

export const getExercisesByLevel = (level: string): Exercise[] => {
  return EXERCISE_DATABASE.filter(ex => ex.difficulty === level);
};

export const getExercisesByCategory = (category: string): Exercise[] => {
  return EXERCISE_DATABASE.filter(ex => ex.category === category);
};
