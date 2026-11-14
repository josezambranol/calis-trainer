import type { DayOfWeek } from '../types';

export const DAYS_MAP: { id: DayOfWeek; name: string; short: string }[] = [
  { id: 'lunes', name: 'Lunes', short: 'Lun' },
  { id: 'martes', name: 'Martes', short: 'Mar' },
  { id: 'miercoles', name: 'Miércoles', short: 'Mié' },
  { id: 'jueves', name: 'Jueves', short: 'Jue' },
  { id: 'viernes', name: 'Viernes', short: 'Vie' },
  { id: 'sabado', name: 'Sábado', short: 'Sáb' },
  { id: 'domingo', name: 'Domingo', short: 'Dom' },
];

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ];
  return days[new Date().getDay()];
};
