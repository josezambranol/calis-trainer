import { expect, test } from '@playwright/test';

const MAILPIT_URL = process.env.E2E_MAILPIT_URL || 'http://localhost:8026';

async function fetchVerificationPathFromMailpit(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const listRes = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(email)}`
    );
    if (listRes.ok) {
      const listJson = (await listRes.json()) as {
        messages?: { ID: string; Subject?: string }[];
      };
      const match = listJson.messages?.find((m) =>
        (m.Subject || '').toLowerCase().includes('verifica')
      );
      if (match) {
        const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        if (msgRes.ok) {
          const msgJson = (await msgRes.json()) as { Text?: string; HTML?: string };
          const body = `${msgJson.Text || ''}\n${msgJson.HTML || ''}`;
          const tokenMatch = body.match(/\/verify-email\?token=([A-Za-z0-9_-]+)/);
          if (tokenMatch) {
            return `/verify-email?token=${tokenMatch[1]}`;
          }
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`No se encontró correo de verificación en Mailpit para ${email}`);
}

test.describe('CalisHome Full SaaS E2E', () => {
  test('flujo completo: guest + i18n/a11y + registro/Mailpit + onboarding + player + Pro checkout', async ({
    page,
  }) => {
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-${uniqueSuffix}@calishome.local`;
    const password = 'CalisE2E2026!';

    // 1. Invitado + WCAG Skip Link + Toggle ES/EN
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /Saltar al contenido principal/i });
    await expect(skipLink).toBeFocused();

    const langToggle = page.getByRole('button', { name: /Switch language to English/i });
    await langToggle.click();
    await expect(
      page.getByRole('heading', { name: /Real bodyweight strength/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /Cambiar idioma a Español/i }).click();
    await expect(
      page.getByRole('heading', { name: /Fuerza real con peso corporal/i })
    ).toBeVisible();

    // 2. Registro de usuario + Verificación de correo vía Mailpit + Login
    await page.getByRole('button', { name: 'Crear Cuenta Gratis' }).click();
    const authDialog = page.getByRole('dialog');
    await expect(authDialog).toBeVisible();

    await authDialog.getByPlaceholder('Ej: José').fill('Atleta E2E');
    await authDialog.getByPlaceholder('ejemplo@correo.com').fill(email);
    await authDialog
      .getByPlaceholder('Mínimo 8 caracteres, letras y números')
      .fill(password);
    await authDialog.getByRole('button', { name: 'Crear Cuenta Gratis' }).click();

    await expect(authDialog.getByText(/Revisa tu correo/i)).toBeVisible();

    const verifyPath = await fetchVerificationPathFromMailpit(email);
    await page.goto(verifyPath);
    await expect(page.getByText(/Correo verificado/i)).toBeVisible();

    await page.goto('/login');
    const loginDialog = page.getByRole('dialog');
    await loginDialog.getByPlaceholder('ejemplo@correo.com').fill(email);
    await loginDialog.getByPlaceholder('••••••••').fill(password);
    await loginDialog.getByRole('button', { name: 'Entrar a CalisHome' }).click();
    await expect(loginDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Atleta E2E')).toBeVisible();

    // 3. Personalizar Diagnóstico (Onboarding 4 pasos con todos los días para entrenar hoy)
    await page.getByRole('button', { name: /Configurar Plan|Ajustar Diagnóstico/i }).first().click();
    const onboarding = page.getByRole('dialog');
    await expect(onboarding).toBeVisible();
    await onboarding.getByText('Intermedio').click();
    await onboarding.getByRole('button', { name: 'Siguiente' }).click();
    await onboarding.getByRole('button', { name: 'Siguiente' }).click();
    await onboarding.getByText('15m').click();
    await onboarding.getByRole('button', { name: 'Siguiente' }).click();
    await onboarding.getByRole('button', { name: /Generar Mi Plan de Rutinas/i }).click();
    await expect(onboarding).toBeHidden({ timeout: 15_000 });

    // 4. Iniciar y completar sesión en WorkoutPlayer + guardar feedback
    const startBtn = page.getByRole('button', {
      name: /Iniciar Entrenamiento Guiado|Entrenar Sesión Libre Hoy/i,
    });
    await startBtn.click();

    const playerDialog = page.getByRole('dialog', {
      name: /Reproductor de entrenamiento/i,
    });
    await expect(playerDialog).toBeVisible();

    for (let guard = 0; guard < 90; guard++) {
      const doneHeading = page.getByRole('heading', { name: /Misión Cumplida/i });
      if (await doneHeading.isVisible()) {
        break;
      }
      const startNow = page.getByRole('button', { name: 'Comenzar Ahora' });
      const completeRep = page.getByRole('button', { name: 'Serie Completada' });
      const completeTime = page.getByRole('button', { name: 'Completar Serie' });
      const skipRest = page.getByRole('button', { name: 'Saltar Descanso' });

      if (await startNow.isVisible()) {
        await startNow.click();
      } else if (await completeRep.isVisible()) {
        await completeRep.click();
      } else if (await completeTime.isVisible()) {
        await completeTime.click();
      } else if (await skipRest.isVisible()) {
        await skipRest.click();
      }
      await page.waitForTimeout(100);
    }

    await expect(page.getByRole('heading', { name: /Misión Cumplida/i })).toBeVisible();
    await page.getByRole('radio', { name: /Perfecto/i }).click();
    await page.getByRole('button', { name: /Guardar y Volver al Panel/i }).click();

    await expect(playerDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Registro de Sesiones')).toBeVisible();

    // 5. Suscripción CalisHome Pro Sandbox y validación de Analíticas Pro
    await page.getByRole('link', { name: /Planes/i }).first().click();
    await expect(page).toHaveURL(/\/plans/);

    const upgradeBtns = page.getByRole('button', { name: 'Pasar a CalisHome Pro' });
    await upgradeBtns.first().click();
    await expect(page).toHaveURL(/\/billing\/sandbox-checkout/);

    await page
      .getByRole('button', { name: /Simular Pago Aprobado \(Activar Pro\)/i })
      .click();
    await expect(page).toHaveURL(/\/plans/, { timeout: 15_000 });
    await expect(page.getByText('CALISHOME PRO').first()).toBeVisible();

    await page.getByRole('link', { name: /CalisHome/i }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Telemetría y Analíticas Pro')).toBeVisible();
    await expect(page.getByText('Volumen Total')).toBeVisible();

    // 6. Fase 8: Privacidad, Términos (Aviso Médico), Exportación JSON y Eliminación de Cuenta
    await page.getByRole('link', { name: /Privacidad \(Ley 1581\)/i }).click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(
      page.getByRole('heading', { name: /Política de Privacidad y Ley 1581/i })
    ).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByText(/Aviso Médico Obligatorio/i)).toBeVisible();

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Atleta E2E' })).toBeVisible();
    await page.getByRole('button', { name: /Exportar Datos JSON/i }).click();
    await expect(page.getByText(/Última exportación verificada/i)).toBeVisible({
      timeout: 10_000,
    });

    await page.getByPlaceholder(/ELIMINAR/i).fill('ELIMINAR');
    await page.getByRole('button', { name: 'Eliminar Cuenta' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
  });

  test('acceso directo con Atleta Demo Pro pre-cargado en modo Sandbox', async ({ page }) => {
    await page.goto('/login');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const demoBtn = dialog.getByRole('button', { name: /Entrar como Atleta Demo \(Pro\)/i });
    await expect(demoBtn).toBeVisible({ timeout: 10_000 });
    await demoBtn.click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/Mateo Ríos/i)).toBeVisible();
    await expect(page.getByText('Telemetría y Analíticas Pro')).toBeVisible();
  });
});
