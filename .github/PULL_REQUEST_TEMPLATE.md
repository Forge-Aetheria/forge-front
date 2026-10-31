## Ticket asociado

Closes #<issue>
Ticket local: `TICK-XXX`

<!-- Sin ticket no hay merge. En hotfix, enlaza el ticket de emergencia. -->

## Resumen de cambios

<!-- Qué cambia, por qué y qué módulo/dominio afecta. -->

## Riesgos

- [ ] Ninguno identificado
- Riesgo funcional:
- Riesgo de datos/migración:
- Riesgo de seguridad/multi-tenant:
- Riesgo de compatibilidad de contrato/API:

## Plan de rollback

<!-- Cómo revertir sin pérdida de datos: revert, flag, migración inversa, restauración. -->

## Impacto en especificaciones

- [ ] `Spec impact: none` — no altera comportamiento/contrato gobernado por una spec.
- [ ] `Spec amendment`:
  - Spec/contrato:
  - Change Log en `tasks.md`:
  - Motivo y comportamiento anterior vs. nuevo:

## Validaciones ejecutadas

- [ ] Typecheck / build limpio
- [ ] Tests unitarios
- [ ] Tests e2e o de contrato
- [ ] Migraciones verificadas (si aplica)
- [ ] Sin secretos ni tokens en el diff

## Checklist de entrega

- [ ] Rama con naming acordado (`<NNN>-<slug>` o `fix/TICK-XXX-<slug>`).
- [ ] Ticket con `status` y carpeta coherentes.
- [ ] PR declara ticket, resumen, riesgos, rollback e impacto en specs.
- [ ] Sin `amend`/`force-push` sobre historia compartida.
- [ ] Al mergear: `/complete TICK-XXX <PR>` o `sync:pull` para cerrar el ticket.
