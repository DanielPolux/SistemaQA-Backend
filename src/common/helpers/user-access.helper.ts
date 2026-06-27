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
       OR EXISTS (SELECT 1 FROM defectos d2    WHERE d2.proyecto_id  = pr.id AND (d2.asignado_a = :uid OR d2.reportado_por = :uid))
  )`;
  return extra ? `(${inSubquery} OR ${extra})` : inSubquery;
}
