import { TestBed } from '@angular/core/testing';
import { BarrioService } from './barrio.service';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { of, throwError } from 'rxjs';
import { Tramite, TipoTramite } from '../models/barrio.models';

describe('BarrioService (Testing Extensivo)', () => {
  let service: BarrioService;
  let authMock: {
    isLoggedIn: () => boolean;
    userId: string;
    username: string;
    roles: string[];
    puedeCrear: boolean;
    puedeVerTodos: boolean;
    puedeCambiarEstado: boolean;
    puedeVerCatalogo: boolean;
    puedeGestionarCatalogo: boolean;
  };
  let orderServiceMock: {
    getOrders: ReturnType<typeof vi.fn>;
    getCatalog: ReturnType<typeof vi.fn>;
    createOrder: ReturnType<typeof vi.fn>;
    updateOrderStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authMock = {
      isLoggedIn: () => true,
      userId: 'user-vecino-1',
      username: 'Juan Vecino',
      roles: ['Vecino'],
      puedeCrear: true,
      puedeVerTodos: false,
      puedeCambiarEstado: false,
      puedeVerCatalogo: false,
      puedeGestionarCatalogo: false,
    };

    orderServiceMock = {
      getOrders: vi.fn().mockReturnValue(of([])),
      getCatalog: vi.fn().mockReturnValue(of([])),
      createOrder: vi.fn().mockImplementation((payload) =>
        of({
          id: 'server-id-999',
          ...payload,
          tipoNombre: 'Reparación de luminarias',
          estado: 'INGRESADO',
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        }),
      ),
      updateOrderStatus: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        BarrioService,
        { provide: AuthService, useValue: authMock },
        { provide: OrderService, useValue: orderServiceMock },
      ],
    });

    service = TestBed.inject(BarrioService);
  });

  describe('Inicialización y Sincronización', () => {
    it('debe crearse correctamente e inicializar tipos base', () => {
      expect(service).toBeTruthy();
      expect(service.tipos().length).toBeGreaterThanOrEqual(3);
    });

    it('debe invocar OrderService para sincronizar al iniciar si hay sesión', () => {
      expect(orderServiceMock.getOrders).toHaveBeenCalled();
      expect(orderServiceMock.getCatalog).toHaveBeenCalled();
    });

    it('debe manejar error de conexión en backend sin arrojar excepción fatal', () => {
      orderServiceMock.getOrders.mockReturnValue(
        throwError(() => new Error('Error de red 500')),
      );
      service.cargarDesdeBackend();
      expect(service.cargando()).toBe(false);
    });
  });

  describe('Creación y Filtrado de Trámites', () => {
    it('debe permitir a un vecino crear un trámite válido', () => {
      service.crearTramite(
        'luminarias',
        'Lámpara quemada',
        'Frente a mi casa en pasaje 3 se apagó el farol.',
      );

      const visibles = service.tramitesVisibles();
      expect(visibles.length).toBe(1);
      expect(visibles[0].asunto).toBe('Lámpara quemada');
      expect(visibles[0].estado).toBe('INGRESADO');
      expect(visibles[0].propietarioId).toBe('user-vecino-1');
      expect(orderServiceMock.createOrder).toHaveBeenCalled();
    });

    it('debe rechazar trámite si el asunto es demasiado corto (< 5 caracteres)', () => {
      expect(() => {
        service.crearTramite(
          'luminarias',
          'Luz',
          'Descripción suficientemente larga para pasar la prueba.',
        );
      }).toThrowError(/entre 5 y 100 caracteres/);
    });

    it('debe rechazar trámite si la descripción es menor a 10 caracteres', () => {
      expect(() => {
        service.crearTramite('luminarias', 'Lámpara quemada', 'Corta');
      }).toThrowError(/entre 10 y 1000 caracteres/);
    });

    it('debe rechazar creación si el tipo de trámite no existe', () => {
      expect(() => {
        service.crearTramite(
          'tipo-inexistente',
          'Asunto válido',
          'Descripción válida de más de 10 caracteres.',
        );
      }).toThrowError(/Selecciona un tipo de trámite activo/);
    });

    it('debe filtrar los trámites visibles mostrando solo los propios para un Vecino', () => {
      service.crearTramite(
        'luminarias',
        'Mi trámite',
        'Descripción propia del vecino.',
      );

      // Si otro usuario tuviera un trámite, el vecino normal no lo vería
      expect(service.tramitesVisibles().length).toBe(1);

      // Ahora simulamos ser Funcionario (puedeVerTodos = true)
      authMock.puedeVerTodos = true;
      expect(service.tramitesVisibles().length).toBe(1);
    });
  });

  describe('Edición y Eliminación', () => {
    it('debe permitir editar un trámite en estado INGRESADO al propietario', () => {
      service.crearTramite(
        'luminarias',
        'Asunto original',
        'Descripción inicial suficientemente larga.',
      );

      const tramite = service.tramitesVisibles()[0];
      service.editarTramite(
        tramite.id,
        'Asunto modificado',
        'Nueva descripción actualizada del trámite.',
      );

      const modificado = service.tramitesVisibles()[0];
      expect(modificado.asunto).toBe('Asunto modificado');
    });

    it('debe permitir eliminar un trámite en estado INGRESADO', () => {
      service.crearTramite(
        'luminarias',
        'Para eliminar',
        'Descripción que será eliminada del sistema.',
      );

      const tramite = service.tramitesVisibles()[0];
      service.eliminarTramite(tramite.id);

      expect(service.tramitesVisibles().length).toBe(0);
    });
  });

  describe('Flujo de Estados y Cupos Diarios', () => {
    it('debe rechazar cambio de estado si el usuario no tiene permisos', () => {
      service.crearTramite(
        'luminarias',
        'Trámite nuevo',
        'Descripción del trámite para evaluar estado.',
      );

      const tramite = service.tramitesVisibles()[0];
      authMock.puedeCambiarEstado = false;

      expect(() => {
        service.cambiarEstado(tramite.id, 'ADMITIDO');
      }).toThrowError(/No tienes permiso para cambiar estados/);
    });

    it('debe permitir cambiar estado de INGRESADO a ADMITIDO cuando es Funcionario', () => {
      service.crearTramite(
        'luminarias',
        'Trámite nuevo',
        'Descripción del trámite para evaluar estado.',
      );

      const tramite = service.tramitesVisibles()[0];
      authMock.puedeCambiarEstado = true;

      service.cambiarEstado(tramite.id, 'ADMITIDO');

      const actualizado = service.tramitesVisibles()[0];
      expect(actualizado.estado).toBe('ADMITIDO');
      expect(actualizado.fechaAdmision).toBeDefined();
    });

    it('debe rechazar transiciones de estado ilegales (ej. INGRESADO -> RESUELTO)', () => {
      service.crearTramite(
        'luminarias',
        'Trámite nuevo',
        'Descripción del trámite para transición inválida.',
      );

      const tramite = service.tramitesVisibles()[0];
      authMock.puedeCambiarEstado = true;

      expect(() => {
        service.cambiarEstado(tramite.id, 'RESUELTO');
      }).toThrowError(/La transición de estado no está permitida/);
    });

    it('debe decrementar cupos disponibles al admitir un trámite', () => {
      const cuposIniciales = service.cuposDisponibles('luminarias');

      service.crearTramite(
        'luminarias',
        'Trámite con cupo',
        'Descripción para medir cupos disponibles.',
      );

      const tramite = service.tramitesVisibles()[0];
      authMock.puedeCambiarEstado = true;

      service.cambiarEstado(tramite.id, 'ADMITIDO');

      const cuposRestantes = service.cuposDisponibles('luminarias');
      expect(cuposRestantes).toBe(cuposIniciales - 1);
    });
  });

  describe('Gestión de Catálogo (Admin)', () => {
    it('debe rechazar modificaciones de catálogo a usuarios que no sean Admin', () => {
      authMock.puedeGestionarCatalogo = false;

      expect(() => {
        service.guardarTipo({
          nombre: 'Nuevo Servicio',
          descripcion: 'Descripción del servicio',
          cupoDiario: 10,
          activo: true,
        });
      }).toThrowError(/Solo el administrador puede modificar el catálogo/);
    });

    it('debe permitir a un Admin registrar un nuevo tipo de trámite', () => {
      authMock.puedeGestionarCatalogo = true;

      service.guardarTipo({
        nombre: 'Limpieza de Microbasurales',
        descripcion: 'Retiro y limpieza de escombros en vertederos no autorizados.',
        cupoDiario: 8,
        activo: true,
      });

      const nuevo = service.tipos().find(
        (t) => t.nombre === 'Limpieza de Microbasurales',
      );
      expect(nuevo).toBeDefined();
      expect(nuevo!.cupoDiario).toBe(8);
    });
  });
});
