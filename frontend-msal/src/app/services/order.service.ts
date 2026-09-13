import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoTramite, TipoTramite, Tramite } from '../models/barrio.models';

export interface OrderApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/api`;

  /**
   * Obtiene la lista de órdenes/trámites desde el backend / API Gateway.
   * La cabecera Authorization: Bearer <token> es agregada por MsalInterceptor.
   */
  getOrders(): Observable<Tramite[]> {
    return this.http
      .get<Tramite[]>(`${this.baseUrl}/requests`)
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Obtiene el detalle de un trámite por ID.
   */
  getOrderById(id: string): Observable<Tramite> {
    return this.http
      .get<Tramite>(`${this.baseUrl}/requests/${id}`)
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Crea una nueva orden/trámite en el backend.
   */
  createOrder(payload: {
    tipoId: string;
    asunto: string;
    descripcion: string;
    propietarioId: string;
    propietarioNombre: string;
  }): Observable<Tramite> {
    return this.http
      .post<Tramite>(`${this.baseUrl}/requests`, payload)
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Actualiza el estado de una orden/trámite en el backend.
   */
  updateOrderStatus(
    id: string,
    nuevoEstado: EstadoTramite,
  ): Observable<Tramite> {
    return this.http
      .put<Tramite>(`${this.baseUrl}/requests/${id}/estado`, {
        estado: nuevoEstado,
      })
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Obtiene el catálogo de trámites disponibles desde el API Gateway.
   */
  getCatalog(): Observable<TipoTramite[]> {
    return this.http
      .get<TipoTramite[]>(`${this.baseUrl}/catalog`)
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Endpoint de prueba protegido para verificar conectividad con API Gateway / Backend.
   */
  checkProtectedAccess(): Observable<string> {
    return this.http
      .get(`${this.baseUrl}/ordenes`, { responseType: 'text' })
      .pipe(catchError((err) => this.handleHttpError(err)));
  }

  /**
   * Transforma errores HTTP en mensajes amigables y comprensibles para el usuario.
   */
  public handleHttpError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Ocurrió un error inesperado al comunicarse con el servidor.';

    if (error.status === 0) {
      mensaje =
        'No se pudo conectar con el servidor o API Gateway. Verifica tu conexión a internet o los orígenes permitidos (CORS).';
    } else if (error.status === 401) {
      mensaje =
        'Sesión expirada o no autorizada (401). Por favor inicia sesión nuevamente.';
    } else if (error.status === 403) {
      mensaje =
        'Acceso denegado (403). No posees los roles o permisos suficientes para esta operación.';
    } else if (error.status === 404) {
      mensaje =
        'El recurso solicitado no fue encontrado en el servidor (404).';
    } else if (error.status >= 500) {
      mensaje =
        'Error interno en el servidor o microservicio de destino (500). Intenta nuevamente más tarde.';
    } else if (error.error?.message) {
      mensaje = error.error.message;
    }

    console.error(`[OrderService HTTP Error ${error.status}]:`, error);
    return throwError(() => new Error(mensaje));
  }
}
