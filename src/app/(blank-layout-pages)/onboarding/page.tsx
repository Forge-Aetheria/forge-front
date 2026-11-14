import type { Metadata } from 'next'

import { OnboardingWizardView } from '@/views/onboarding/OnboardingWizardView'

export const metadata: Metadata = {
  title: 'Configuración inicial | Foundly ERP',
  description: 'Asistente guiado de configuración fiscal inicial del tenant'
}

export default function Page() {
  return <OnboardingWizardView />
}
