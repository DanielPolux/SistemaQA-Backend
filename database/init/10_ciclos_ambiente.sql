-- Agrega columna ambiente al ciclo de pruebas
ALTER TABLE ciclos_prueba ADD COLUMN IF NOT EXISTS ambiente VARCHAR(50);
