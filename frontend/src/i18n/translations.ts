export type Locale = 'es' | 'en';

export interface TranslationDictionary {
  skipToContent: string;
  brandTag: string;
  brandSub: string;
  navStreak: string;
  navLevel: string;
  navDaySingular: string;
  navDayPlural: string;
  navPlans: string;
  navPro: string;
  navTestAlert: string;
  navSignIn: string;
  navSignOut: string;
  navAccountAria: string;
  offlineBanner: string;
  offlinePendingQueue: string;
  offlineSyncingNow: string;
  installPromptText: string;
  installBtn: string;
  serverError: string;
  retryBtn: string;
  guestKicker: string;
  guestTitle: string;
  guestSubtitle: string;
  guestCustomize: string;
  guestCreateAccount: string;
  heroTodayTag: string;
  heroRestBadge: string;
  heroTrainBadge: string;
  heroZeroEquipment: string;
  heroStartWorkout: string;
  heroTrainAnyway: string;
  heroAdjustPlan: string;
  heroCircuitTitle: string;
  heroMovesUnit: string;
  heroRestDesc1: string;
  heroRestDesc2: string;
  remindersTitle: string;
  remindersSub: string;
  remindersTimeLabel: string;
  remindersTimeSub: string;
  remindersDaysLabel: string;
  pushBgTitle: string;
  pushUnsupported: string;
  pushActiveSub: string;
  pushInactiveSub: string;
  pushProcessing: string;
  pushDisable: string;
  pushEnable: string;
  pushGuestHint: string;
  pushSendTest: string;
  pushTestLocal: string;
  overloadTitle: string;
  overloadSub: string;
  overloadDesc: string;
  overloadCurrent: string;
  overloadOptimal: string;
  overloadSofter: string;
  overloadBase: string;
  overloadHarder: string;
  overloadLogged: string;
  overloadBadge: string;
  analyticsTitle: string;
  analyticsSub: string;
  analyticsManage: string;
  analyticsUpgrade: string;
  analyticsVolume: string;
  analyticsSessionsUnit: string;
  analyticsRecent: string;
  analyticsWeeklySub: string;
  analyticsStreakAdapt: string;
  analyticsOverloadSub: string;
  analyticsFeedbackTitle: string;
  analyticsTooEasy: string;
  analyticsJustRight: string;
  analyticsTooHard: string;
  analyticsLoading: string;
  analyticsLockedTitle: string;
  analyticsLockedDesc: string;
  analyticsUnlockBtn: string;
  weeklyTitle: string;
  weeklySub: string;
  weeklyWorkLegend: string;
  weeklyRestLegend: string;
  weeklyToday: string;
  weeklyRest: string;
  weeklyTrain: string;
  weeklyTrainCta: string;
  libraryTitle: string;
  librarySub: string;
  librarySearchPlaceholder: string;
  libraryCatAll: string;
  libraryCatPush: string;
  libraryCatPull: string;
  libraryCatLegs: string;
  libraryCatCore: string;
  libraryLoading: string;
  libraryEmpty: string;
  libraryMuscle: string;
  libraryHideTech: string;
  libraryShowTech: string;
  libraryTip: string;
  historyTitle: string;
  historyFreeCapLink: string;
  historyPendingBadge: string;
  footerTagline: string;
  footerPrivacy: string;
  footerTerms: string;
  footerAccount: string;
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  es: {
    skipToContent: 'Saltar al contenido principal',
    brandTag: 'CERO EQUIPO',
    brandSub: 'Calistenia adaptativa y constancia diaria',
    navStreak: 'Racha',
    navLevel: 'Nivel',
    navDaySingular: 'día',
    navDayPlural: 'días',
    navPlans: 'Planes',
    navPro: 'PRO',
    navTestAlert: 'Probar Alerta',
    navSignIn: 'Iniciar Sesión',
    navSignOut: 'Cerrar sesión',
    navAccountAria: 'Abrir perfil, preferencias y privacidad',
    offlineBanner: 'Modo sin conexión activo: puedes consultar tu rutina cacheada y entrenar.',
    offlinePendingQueue: 'entrenamiento(s) en cola listos para sincronizarse al recuperar red.',
    offlineSyncingNow: 'Sincronizando cola offline...',
    installPromptText: 'Instala CalisHome como app nativa para iniciar entrenos al instante.',
    installBtn: 'Instalar App',
    serverError: 'No pudimos conectar con el servidor para actualizar tu plan.',
    retryBtn: 'Reintentar',
    guestKicker: 'SISTEMA DE CALISTENIA ADAPTATIVA EN CASA',
    guestTitle: 'Fuerza real con peso corporal. Sin excusas ni gimnasio.',
    guestSubtitle: 'Personaliza tu diagnóstico en menos de un minuto. Crea tu cuenta gratis para guardar racha, sobrecarga progresiva y recordatorios Web Push.',
    guestCustomize: 'Ajustar Diagnóstico',
    guestCreateAccount: 'Crear Cuenta Gratis',
    heroTodayTag: 'SESIÓN DE HOY ·',
    heroRestBadge: 'Recuperación Programada',
    heroTrainBadge: 'ENTRENAMIENTO ACTIVO',
    heroZeroEquipment: '100% sin equipo',
    heroStartWorkout: 'Iniciar Entrenamiento Guiado',
    heroTrainAnyway: 'Entrenar Sesión Libre Hoy',
    heroAdjustPlan: 'Configurar Plan',
    heroCircuitTitle: 'Circuito Programado',
    heroMovesUnit: 'ejercicios',
    heroRestDesc1: 'Hoy toca regeneración muscular y movilidad ligera.',
    heroRestDesc2: 'Hidratación y sueño consolidan tus ganancias.',
    remindersTitle: 'Alertas y Constancia',
    remindersSub: 'Recordatorio puntual en navegador y dispositivo',
    remindersTimeLabel: 'Hora del recordatorio',
    remindersTimeSub: 'Se dispara en tus días activos según tu zona horaria',
    remindersDaysLabel: 'Días programados',
    pushBgTitle: 'Web Push en segundo plano',
    pushUnsupported: 'Este navegador no soporta PushManager.',
    pushActiveSub: 'Alertas activas incluso con la pestaña cerrada.',
    pushInactiveSub: 'Actívalo para recibir avisos sin tener la web abierta.',
    pushProcessing: 'Procesando...',
    pushDisable: 'Desactivar Push',
    pushEnable: 'Activar Push',
    pushGuestHint: 'Inicia sesión para habilitar notificaciones Web Push en segundo plano.',
    pushSendTest: 'Enviar Push de prueba',
    pushTestLocal: 'Probar notificación local',
    overloadTitle: 'Sobrecarga Progresiva',
    overloadSub: 'Calibración automática según tu esfuerzo percibido',
    overloadDesc: 'El motor ajusta volumen, tiempo bajo tensión y variantes corporales entre -3 y +3 según cómo terminas cada sesión.',
    overloadCurrent: 'Índice de carga',
    overloadOptimal: 'Base Óptima (0)',
    overloadSofter: 'Recuperación (-3)',
    overloadBase: 'Base (0)',
    overloadHarder: 'Élite (+3)',
    overloadLogged: 'Sesiones visibles:',
    overloadBadge: 'Motor Servidor',
    analyticsTitle: 'Telemetría y Analíticas Pro',
    analyticsSub: 'Volumen acumulado, adherencia 7d/30d y balance de esfuerzo.',
    analyticsManage: 'Gestionar Suscripción',
    analyticsUpgrade: 'Pasar a Pro',
    analyticsVolume: 'Volumen Total',
    analyticsSessionsUnit: 'sesiones completadas',
    analyticsRecent: 'Últimos 7 / 30 días',
    analyticsWeeklySub: 'Consistencia semanal y mensual',
    analyticsStreakAdapt: 'Racha / Carga',
    analyticsOverloadSub: 'Escala de sobrecarga activa',
    analyticsFeedbackTitle: 'Distribución de Feedback',
    analyticsTooEasy: 'Ligero',
    analyticsJustRight: 'Óptimo',
    analyticsTooHard: 'Exigente',
    analyticsLoading: 'Calculando métricas Pro...',
    analyticsLockedTitle: 'Telemetría avanzada exclusiva de CalisHome Pro',
    analyticsLockedDesc: 'Desbloquea métricas de volumen, balance de intensidad, hasta 100 sesiones visibles y 5 dispositivos Push.',
    analyticsUnlockBtn: 'Ver Planes Pro',
    weeklyTitle: 'Estructura Semanal',
    weeklySub: 'División inteligente adaptada a tus días elegidos',
    weeklyWorkLegend: 'Entreno',
    weeklyRestLegend: 'Descanso',
    weeklyToday: 'HOY',
    weeklyRest: 'Descanso',
    weeklyTrain: 'Entreno',
    weeklyTrainCta: 'Entrenar',
    libraryTitle: 'Códice de Ejercicios Sin Material',
    librarySub: '24 movimientos con biomecánica, musculatura objetivo y técnica paso a paso',
    librarySearchPlaceholder: 'Buscar ejercicio o músculo...',
    libraryCatAll: 'Todos',
    libraryCatPush: 'Empuje',
    libraryCatPull: 'Tracción suelo',
    libraryCatLegs: 'Piernas',
    libraryCatCore: 'Core',
    libraryLoading: 'Cargando catálogo de ejercicios...',
    libraryEmpty: 'Ningún ejercicio coincide con tu filtro actual.',
    libraryMuscle: 'Músculo:',
    libraryHideTech: 'Ocultar técnica',
    libraryShowTech: 'Ver técnica',
    libraryTip: 'Clave técnica:',
    historyTitle: 'Registro de Sesiones',
    historyFreeCapLink: 'Mostrando últimas 5 (Plan Gratis) · Ampliar a Pro',
    historyPendingBadge: 'En cola offline',
    footerTagline: 'CalisHome — Ingeniería para entrenar en casa con cero equipamiento y constancia real.',
    footerPrivacy: 'Privacidad (Ley 1581)',
    footerTerms: 'Términos y Aviso Médico',
    footerAccount: 'Mi Cuenta y Datos',
  },
  en: {
    skipToContent: 'Skip to main content',
    brandTag: 'ZERO GEAR',
    brandSub: 'Adaptive bodyweight training & consistency',
    navStreak: 'Streak',
    navLevel: 'Level',
    navDaySingular: 'day',
    navDayPlural: 'days',
    navPlans: 'Plans',
    navPro: 'PRO',
    navTestAlert: 'Test Alert',
    navSignIn: 'Sign In',
    navSignOut: 'Sign out',
    navAccountAria: 'Open profile, preferences and privacy',
    offlineBanner: 'Offline mode active: you can view your cached routine and train.',
    offlinePendingQueue: 'workout(s) queued to sync automatically when back online.',
    offlineSyncingNow: 'Syncing offline queue...',
    installPromptText: 'Install CalisHome as an app for instant workout launches and reminders.',
    installBtn: 'Install App',
    serverError: 'Could not reach the server to refresh your training plan.',
    retryBtn: 'Retry',
    guestKicker: 'ADAPTIVE HOME CALISTHENICS SYSTEM',
    guestTitle: 'Real bodyweight strength. Zero equipment. Zero excuses.',
    guestSubtitle: 'Tune your diagnostic in under a minute. Create a free account to persist streaks, progressive overload and Web Push reminders.',
    guestCustomize: 'Tune Diagnostic',
    guestCreateAccount: 'Create Free Account',
    heroTodayTag: "TODAY'S SESSION ·",
    heroRestBadge: 'Scheduled Recovery',
    heroTrainBadge: 'ACTIVE TRAINING DAY',
    heroZeroEquipment: '100% bodyweight',
    heroStartWorkout: 'Start Guided Session',
    heroTrainAnyway: 'Train Freestyle Today',
    heroAdjustPlan: 'Configure Plan',
    heroCircuitTitle: 'Session Blueprint',
    heroMovesUnit: 'exercises',
    heroRestDesc1: 'Recovery day focused on muscle repair and light mobility.',
    heroRestDesc2: 'Hydration and sleep lock in your strength gains.',
    remindersTitle: 'Reminders & Consistency',
    remindersSub: 'Timely browser and background device alerts',
    remindersTimeLabel: 'Reminder time',
    remindersTimeSub: 'Dispatched on training days in your local timezone',
    remindersDaysLabel: 'Active days',
    pushBgTitle: 'Background Web Push',
    pushUnsupported: 'This browser does not support PushManager.',
    pushActiveSub: 'Alerts enabled even when the browser tab is closed.',
    pushInactiveSub: 'Enable background push so you never miss a workout.',
    pushProcessing: 'Processing...',
    pushDisable: 'Disable Push',
    pushEnable: 'Enable Push',
    pushGuestHint: 'Sign in to enable background Web Push notifications.',
    pushSendTest: 'Send test Push',
    pushTestLocal: 'Trigger local test alert',
    overloadTitle: 'Progressive Overload',
    overloadSub: 'Automatic calibration from post-session feedback',
    overloadDesc: 'The server engine scales volume, time under tension and exercise difficulty from -3 to +3 based on your logged effort.',
    overloadCurrent: 'Load index',
    overloadOptimal: 'Optimal Baseline (0)',
    overloadSofter: 'Deload (-3)',
    overloadBase: 'Base (0)',
    overloadHarder: 'Peak (+3)',
    overloadLogged: 'Visible sessions:',
    overloadBadge: 'Server Engine',
    analyticsTitle: 'Pro Performance Telemetry',
    analyticsSub: 'Accumulated training minutes, 7d/30d adherence and effort balance.',
    analyticsManage: 'Manage Subscription',
    analyticsUpgrade: 'Upgrade to Pro',
    analyticsVolume: 'Total Volume',
    analyticsSessionsUnit: 'completed sessions',
    analyticsRecent: 'Last 7 / 30 days',
    analyticsWeeklySub: 'Weekly & monthly frequency',
    analyticsStreakAdapt: 'Streak / Load',
    analyticsOverloadSub: 'Active overload index',
    analyticsFeedbackTitle: 'Effort Breakdown',
    analyticsTooEasy: 'Light',
    analyticsJustRight: 'Optimal',
    analyticsTooHard: 'Hard',
    analyticsLoading: 'Computing Pro telemetry...',
    analyticsLockedTitle: 'Advanced telemetry unlocked with CalisHome Pro',
    analyticsLockedDesc: 'Get full session volume analytics, effort distribution, 100-session history and 5 Push devices.',
    analyticsUnlockBtn: 'Explore Pro Plans',
    weeklyTitle: 'Weekly Split',
    weeklySub: 'Structured training & recovery cadence',
    weeklyWorkLegend: 'Train',
    weeklyRestLegend: 'Rest',
    weeklyToday: 'TODAY',
    weeklyRest: 'Rest',
    weeklyTrain: 'Train',
    weeklyTrainCta: 'Launch',
    libraryTitle: 'Zero-Equipment Exercise Codex',
    librarySub: '24 bodyweight movements with biomechanics and step-by-step form cues',
    librarySearchPlaceholder: 'Search movement or muscle...',
    libraryCatAll: 'All',
    libraryCatPush: 'Push',
    libraryCatPull: 'Floor Pull',
    libraryCatLegs: 'Legs',
    libraryCatCore: 'Core',
    libraryLoading: 'Loading exercise codex...',
    libraryEmpty: 'No exercises match the current filter.',
    libraryMuscle: 'Target:',
    libraryHideTech: 'Hide form cues',
    libraryShowTech: 'Form cues',
    libraryTip: 'Coaching cue:',
    historyTitle: 'Completed Sessions Log',
    historyFreeCapLink: 'Showing last 5 (Free tier) · Upgrade to Pro',
    historyPendingBadge: 'Offline queued',
    footerTagline: 'CalisHome — Precision zero-equipment home calisthenics built for consistency.',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms & Medical Notice',
    footerAccount: 'Account & Data',
  },
};
