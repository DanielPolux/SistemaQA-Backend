/**
 * Builds the TypeORM QB WHERE condition that restricts a list query to
 * projects accessible by the given user (non-admin).
 *
 * @param entityAlias  QueryBuilder alias for the entity whose proyectoId is filtered (e.g. 'c', 'd', 'p')
 * @param extra        Optional additional OR conditions using the same :uid param (e.g. 'c.responsableQaId = :uid')
 */
export function userProjectFilter(entityAlias: string, extra?: string): string {
  const inSubquery = `${entityAlias}.proyectoId IN (
    SELECT pr.id FROM proyectos pr
    WHERE pr.jefe_proyecto_id = :uid OR pr.jefe_qa_id = :uid OR pr.responsable_qa_id = :uid
       OR EXISTS (SELECT 1 FROM casos_prueba cp2 WHERE cp2.proyecto_id = pr.id AND cp2.responsable_qa_id = :uid)
       OR EXISTS (SELECT 1 FROM ciclos_prueba ci2 WHERE ci2.proyecto_id = pr.id AND ci2.responsable_qa_id = :uid)
       OR EXISTS (SELECT 1 FROM defectos d2    WHERE d2.proyecto_id  = pr.id AND (d2.asignado_a = :uid OR d2.reportado_por = :uid))
  )`;
  return extra ? `(${inSubquery} OR ${extra})` : inSubquery;
}

export async function assertProjectAccess(
  manager: { query: (sql: string, params?: any[]) => Promise<any[]> },
  proyectoId: number,
  usuarioId?: number,
  esAdmin = true,
): Promise<void> {
  if (esAdmin || !usuarioId) return;
  const [row] = await manager.query(
    `SELECT EXISTS (
       SELECT 1 FROM proyectos pr WHERE pr.id=$1 AND (
         pr.jefe_proyecto_id=$2 OR pr.jefe_qa_id=$2 OR pr.responsable_qa_id=$2
         OR EXISTS (SELECT 1 FROM casos_prueba cp WHERE cp.proyecto_id=pr.id AND cp.responsable_qa_id=$2)
         OR EXISTS (SELECT 1 FROM ciclos_prueba ci WHERE ci.proyecto_id=pr.id AND ci.responsable_qa_id=$2)
         OR EXISTS (SELECT 1 FROM defectos d WHERE d.proyecto_id=pr.id AND (d.asignado_a=$2 OR d.reportado_por=$2))
       )
     ) AS permitido`,
    [proyectoId, usuarioId],
  );
  if (!row?.permitido) throw new NotFoundException('Recurso no encontrado.');
}
import { NotFoundException } from '@nestjs/common';
