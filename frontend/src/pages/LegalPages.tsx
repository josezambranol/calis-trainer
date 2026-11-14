import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, HeartPulse, Mail } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090d] ch-backdrop-grid text-zinc-100 flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 flex-1">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white bg-white/[0.04] border border-white/10 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver a CalisHome</span>
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#c8f135]">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Privacidad y Protección de Datos</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-[-0.03em]">
            Política de Privacidad y Ley 1581 de 2012
          </h1>
          <p className="text-xs text-zinc-400">Última actualización: Noviembre de 2026 · Responsable: CalisHome</p>
        </header>

        <article className="ch-panel rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-black text-white">1. Datos que recolectamos y finalidad</h2>
            <p>
              CalisHome almacena únicamente la información indispensable para operar tu plan de entrenamiento con peso corporal:
              correo electrónico, nombre visible, diagnóstico físico (nivel, objetivo, duración, días programados), zona horaria,
              registros de sesiones completadas, estado de suscripción Pro y suscripciones Web Push cifradas cuando las autorizas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-white">2. Derechos ARCO y Portabilidad (Ley 1581 / GDPR)</h2>
            <p>
              Puedes conocer, actualizar, rectificar, exportar y suprimir tus datos personales en cualquier momento directamente desde{' '}
              <Link to="/account" className="text-[#c8f135] font-bold underline">
                Mi Cuenta y Datos
              </Link>
              . La exportación genera un archivo JSON portátil sin contraseñas ni tokens internos; la eliminación revoca todas tus
              sesiones, borra dispositivos push y anonimiza tus datos de identificación de forma irreversible.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-white">3. Seguridad y Cifrado</h2>
            <p>
              Las contraseñas se almacenan mediante BCrypt, las sesiones usan access tokens JWT de corta vida en memoria y refresh
              tokens opacos rotados en cookie HttpOnly, y los webhooks de pago se validan con firma criptográfica SHA-256. No vendemos ni
              cedemos tu información a terceros con fines publicitarios.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-white">4. Contacto del Oficial de Datos</h2>
            <p className="flex items-center space-x-2 text-zinc-300">
              <Mail className="w-4 h-4 text-[#c8f135] shrink-0" aria-hidden="true" />
              <span>
                Consultas sobre habeas data y privacidad:{' '}
                <a href="mailto:soporte@calishome.app" className="text-[#c8f135] font-bold underline">
                  soporte@calishome.app
                </a>
              </span>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090d] ch-backdrop-grid text-zinc-100 flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 flex-1">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white bg-white/[0.04] border border-white/10 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver a CalisHome</span>
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center space-x-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#c8f135]">
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>Condiciones de Uso</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-[-0.03em]">
            Términos de Servicio y Aviso Médico
          </h1>
          <p className="text-xs text-zinc-400">CalisHome SaaS · Plan Gratis y CalisHome Pro</p>
        </header>

        <article className="ch-panel rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-zinc-300 leading-relaxed">
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/35 p-4 flex items-start space-x-3">
            <HeartPulse className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-sm font-black text-amber-200 uppercase tracking-wide">
                Aviso Médico Obligatorio
              </h2>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                CalisHome ofrece rutinas educativas de entrenamiento físico con peso corporal y no sustituye asesoría, diagnóstico ni
                prescripción médica. Consulta con un profesional de la salud antes de iniciar cualquier programa físico si presentas
                lesiones articulares, patologías cardiovasculares, embarazo o dolor agudo. Detén la sesión de inmediato ante mareo o dolor
                punzante.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-black text-white">1. Planes Gratis y CalisHome Pro</h2>
            <p>
              El plan Gratis incluye planificación semanal adaptativa, reproductor guiado y hasta 5 sesiones visibles en tu historial.
              CalisHome Pro amplía tu historial hasta 100 sesiones, habilita analíticas avanzadas de volumen y hasta 5 dispositivos Web
              Push. Puedes cancelar tu renovación en cualquier momento desde <Link to="/plans" className="text-[#c8f135] font-bold underline">Planes</Link>, conservando tus beneficios hasta el fin del período pagado.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-white">2. Uso Responsable y Propiedad Intelectual</h2>
            <p>
              Queda prohibido automatizar tráfico abusivo o eludir los límites técnicos de seguridad de la API. Todo el software y las
              guías de progresión pertenecen a CalisHome.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};
