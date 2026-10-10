Issue de la tarea: #
<!-- Responsable, revisor, alcance y línea de dependencia viven en el issue. -->

## Qué cambia

Antes:

Después:

## Cómo

## Riesgo

- Nivel: bajo | medio | alto — por qué:
- Línea de dependencia: independiente | cadena y PR bloqueante

## Verificación

- [ ] Validación según el riesgo (`CLAUDE.md`, Flujo): código, `npm test` base y final; UI, además build; documentación pura, solo CI
- [ ] Evidencia de UI por pantalla o flujo modificado (captura o clip + pasos y resultado esperado), o "no aplica"
- [ ] Riesgo alto: prueba manual definida (indicar cuál y dónde: navegador o servidor del local)
- [ ] Se actualizó lo que este cambio vuelve incorrecto: `docs/`, skills `meson-*`, `CLAUDE.md`
- [ ] Entrada con fecha en `CHANGELOG.md`
- [ ] Sin IP, nombres de red, contraseñas ni datos personales (el repo es público)
