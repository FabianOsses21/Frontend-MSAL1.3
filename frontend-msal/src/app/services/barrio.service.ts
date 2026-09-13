import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';

import {
  EstadoTramite,
  TipoTramite,
  Tramite,
  TRANSICIONES,
} from '../models/barrio.models';

@Injectable({
  providedIn: 'root',
})
export class BarrioService {
  private auth = inject(AuthService);

  private tiposState = signal<TipoTramite[]>([
    {
      id: 'luminarias',
      nombre: 'Reparación de luminarias',
      descripcion: 'Solicitud de revisión de alumbrado público.',
      cupoDiario: 5,
      activo: true,
    },
    {
      id: 'retiro',
      nombre: 'Retiro de residuos voluminosos',
      descripcion: 'Solicitud de retiro municipal.',
      cupoDiario: 3,
      activo: true,
    },
    {
      id: 'areas-verdes',
      nombre: 'Mantención de áreas verdes',
      descripcion: 'Solicitud de intervención en espacios públicos.',
      cupoDiario: 4,
      activo: true,
    },
  ]);

  private tramitesState = signal<Tramite[]>([]);

  readonly tipos = this.tiposState.asReadonly();

  tramitesVisibles(): Tramite[] {
    if (!this.auth.puedeCrear) {
      return [];
    }

    const tramites = this.tramitesState();

    return this.auth.puedeVerTodos
      ? tramites
      : tramites.filter(
          (tramite) => tramite.propietarioId === this.auth.userId,
        );
  }

  private diaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  cuposDisponibles(tipoId: string): number {
    const tipo = this.tiposState().find((item) => item.id === tipoId);

    if (!tipo) {
      return 0;
    }

    const hoy = this.diaLocal(new Date());

    const admitidosHoy = this.tramitesState().filter(
      (tramite) =>
        tramite.tipoId === tipoId &&
        !!tramite.fechaAdmision &&
        this.diaLocal(new Date(tramite.fechaAdmision)) === hoy,
    ).length;

    return Math.max(0, tipo.cupoDiario - admitidosHoy);
  }

  crearTramite(
    tipoId: string,
    asunto: string,
    descripcion: string,
  ): void {
    if (!this.auth.puedeCrear) {
      throw new Error('Tu cuenta no tiene permiso para crear trámites.');
    }

    const tipo = this.tiposState().find(
      (item) => item.id === tipoId && item.activo,
    );

    if (!tipo) {
      throw new Error('Selecciona un tipo de trámite activo.');
    }

    this.validarTextos(asunto, descripcion);

    const ahora = new Date().toISOString();

    const tramite: Tramite = {
      id: crypto.randomUUID(),

      tipoId: tipo.id,
      tipoNombre: tipo.nombre,

      asunto: asunto.trim(),
      descripcion: descripcion.trim(),

      propietarioId: this.auth.userId,
      propietarioNombre: this.auth.username,

      estado: 'INGRESADO',

      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };

    this.tramitesState.update((actuales) => [tramite, ...actuales]);
  }

  puedeEditar(tramite: Tramite): boolean {
    return (
      this.auth.puedeCrear &&
      tramite.estado === 'INGRESADO' &&
      (
        tramite.propietarioId === this.auth.userId ||
        this.auth.puedeVerTodos
      )
    );
  }

  editarTramite(
    id: string,
    asunto: string,
    descripcion: string,
  ): void {
    const tramite = this.buscarTramite(id);

    if (!this.puedeEditar(tramite)) {
      throw new Error('Solo puedes editar trámites ingresados con permiso.');
    }

    this.validarTextos(asunto, descripcion);

    this.tramitesState.update((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              asunto: asunto.trim(),
              descripcion: descripcion.trim(),
              fechaActualizacion: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  eliminarTramite(id: string): void {
    const tramite = this.buscarTramite(id);

    if (!this.puedeEditar(tramite)) {
      throw new Error('Solo puedes eliminar trámites ingresados con permiso.');
    }

    this.tramitesState.update((actuales) =>
      actuales.filter((item) => item.id !== id),
    );
  }

  cambiarEstado(id: string, nuevoEstado: EstadoTramite): void {
    if (!this.auth.puedeCambiarEstado) {
      throw new Error('No tienes permiso para cambiar estados.');
    }

    const tramite = this.buscarTramite(id);

    if (!TRANSICIONES[tramite.estado].includes(nuevoEstado)) {
      throw new Error('La transición de estado no está permitida.');
    }

    if (nuevoEstado === 'ADMITIDO') {
      const tipo = this.tiposState().find(
        (item) => item.id === tramite.tipoId,
      );

      if (!tipo?.activo) {
        throw new Error('El tipo de trámite está inactivo.');
      }

      if (this.cuposDisponibles(tramite.tipoId) <= 0) {
        throw new Error('No quedan cupos para admitir este trámite hoy.');
      }
    }

    const ahora = new Date().toISOString();

    this.tramitesState.update((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              estado: nuevoEstado,
              fechaActualizacion: ahora,
              fechaAdmision:
                nuevoEstado === 'ADMITIDO'
                  ? ahora
                  : item.fechaAdmision,
            }
          : item,
      ),
    );
  }

  guardarTipo(
    datos: Omit<TipoTramite, 'id'>,
    id?: string,
  ): void {
    this.exigirAdmin();

    if (!datos.nombre.trim() || !datos.descripcion.trim()) {
      throw new Error('Completa el nombre y la descripción.');
    }

    if (
      !Number.isInteger(datos.cupoDiario) ||
      datos.cupoDiario < 0
    ) {
      throw new Error('El cupo debe ser un número entero mayor o igual a cero.');
    }

    const duplicado = this.tiposState().some(
      (tipo) =>
        tipo.id !== id &&
        tipo.nombre.trim().toLowerCase() ===
          datos.nombre.trim().toLowerCase(),
    );

    if (duplicado) {
      throw new Error('Ya existe un tipo con ese nombre.');
    }

    if (id && !this.tiposState().some((tipo) => tipo.id === id)) {
      throw new Error('El tipo de trámite no existe.');
    }

    const tipo: TipoTramite = {
      id: id ?? crypto.randomUUID(),
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      cupoDiario: datos.cupoDiario,
      activo: datos.activo,
    };

    this.tiposState.update((actuales) =>
      id
        ? actuales.map((item) => item.id === id ? tipo : item)
        : [...actuales, tipo],
    );
  }

  eliminarTipo(id: string): void {
    this.exigirAdmin();

    if (this.tramitesState().some((tramite) => tramite.tipoId === id)) {
      throw new Error(
        'Este tipo tiene trámites asociados. Puedes desactivarlo al editar.',
      );
    }

    this.tiposState.update((actuales) =>
      actuales.filter((tipo) => tipo.id !== id),
    );
  }

  private buscarTramite(id: string): Tramite {
    const tramite = this.tramitesState().find((item) => item.id === id);

    if (!tramite) {
      throw new Error('El trámite no existe.');
    }

    return tramite;
  }

  private validarTextos(asunto: string, descripcion: string): void {
    if (asunto.trim().length < 5 || asunto.trim().length > 100) {
      throw new Error('El asunto debe tener entre 5 y 100 caracteres.');
    }

    if (
      descripcion.trim().length < 10 ||
      descripcion.trim().length > 1000
    ) {
      throw new Error(
        'La descripción debe tener entre 10 y 1000 caracteres.',
      );
    }
  }

  private exigirAdmin(): void {
    if (!this.auth.puedeGestionarCatalogo) {
      throw new Error('Solo el administrador puede modificar el catálogo.');
    }
  }
}