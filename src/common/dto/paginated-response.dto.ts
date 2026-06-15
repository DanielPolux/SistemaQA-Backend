export class PaginatedResponseDto<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;

  constructor(datos: T[], total: number, pagina: number, porPagina: number) {
    this.datos = datos;
    this.total = total;
    this.pagina = pagina;
    this.porPagina = porPagina;
  }
}
