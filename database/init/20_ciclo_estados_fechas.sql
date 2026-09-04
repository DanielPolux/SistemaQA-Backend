ALTER TABLE ciclos_prueba
  ADD COLUMN IF NOT EXISTS fecha_inicio_real TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_fin_real TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recordatorio_inicio_enviado_en TIMESTAMPTZ;

UPDATE ciclos_prueba c
SET estado = CASE
  WHEN EXISTS (SELECT 1 FROM ejecuciones_caso_prueba e WHERE e.ciclo_id = c.id)
    THEN 'En ejecución'
  ELSE 'Planificado'
END,
fecha_inicio_real = CASE
  WHEN EXISTS (SELECT 1 FROM ejecuciones_caso_prueba e WHERE e.ciclo_id = c.id)
    THEN (SELECT MIN(e.creado_en) FROM ejecuciones_caso_prueba e WHERE e.ciclo_id = c.id)
  ELSE NULL
END
WHERE c.estado = 'Activo';

ALTER TABLE ciclos_prueba ALTER COLUMN estado SET DEFAULT 'Planificado';
