'use client'

import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'

import StepperCustomDot from '@/components/stepper-dot'
import StepperWrapper from '@core/styles/stepper'

const STEPS = ['Identidad fiscal', 'Preferencias fiscales', 'Confirmación']

export const OnboardingStepper = ({ activeStep }: { activeStep: number }) => (
  <StepperWrapper>
    <Stepper activeStep={activeStep} alternativeLabel>
      {STEPS.map(label => (
        <Step key={label}>
          <StepLabel StepIconComponent={StepperCustomDot}>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  </StepperWrapper>
)
