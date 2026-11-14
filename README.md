# 🏋️ CalisHome — Rutinas de Ejercicio en Casa (Cero Material)

Aplicación web progresiva (**PWA**) diseñada para asignar rutinas de ejercicio personalizadas usando **100% peso corporal (solo suelo y pared)**, con modo guiado en vivo por voz/temporizador, sobrecarga progresiva adaptativa y recordatorios con notificaciones.

## ✨ Características Principales

- **Cuestionario Inteligente de Diagnóstico:** Configura tu nivel (*Principiante*, *Intermedio*, *Avanzado*), objetivo (*Fuerza/Hipertrofia*, *Resistencia/Quema de grasa*, *Movilidad*), duración por sesión (*15, 30 o 45 min*) y días de entreno.
- **100% Cero Material:** Catálogo de ejercicios biomecánicos de empuje, tracción en suelo, piernas/glúteos y core.
- **Reproductor Guiado en Vivo (`WorkoutPlayer`):**
  - Temporizadores circulares interactivos para descansos y ejercicios isométricos.
  - Entrenador por voz en español (`Web Speech API`) y tonos de cuenta regresiva (`Web Audio API`).
  - Indicaciones técnicas paso a paso en pantalla.
- **Sobrecarga Progresiva Adaptativa:** Al terminar cada sesión, calificas la intensidad (*Muy fácil*, *Perfecto*, *Agotador*) y el algoritmo recalibra automáticamente repeticiones, descansos y dificultad.
- **Notificaciones y Recordatorios:** Programa tus días y hora de entrenamiento con soporte PWA (`manifest.json` + Service Worker) y prueba de alerta instantánea.

## 🛠️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4 + Lucide Icons
- **Audio / Feedback:** Web Speech API, Web Audio API, Canvas Confetti
- **PWA / Notificaciones:** Web Notifications API + Service Worker

## 🚀 Instalación y Ejecución Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar linter
npm run lint
```
