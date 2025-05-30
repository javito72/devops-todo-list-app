// __tests__/tareas.test.js
const request = require('supertest');

// Mock de la base de datos para las pruebas
const mockTasks = [
    { id: 1, descripcion: 'Tarea 1', completada: false, fecha_creacion: new Date().toISOString() },
    { id: 2, descripcion: 'Tarea 2', completada: true, fecha_creacion: new Date().toISOString() },
];

// Un mock más robusto para db.query
const mockDbQuery = jest.fn((sql, paramsOrCallback, callback) => {
    const actualCallback = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
    
    if (sql.toUpperCase().startsWith('SELECT * FROM TAREAS')) {
        actualCallback(null, mockTasks);
    } else if (sql.toUpperCase().startsWith('INSERT INTO TAREAS')) {
        const newId = mockTasks.length + 3; // Simular un nuevo ID
        actualCallback(null, { insertId: newId });
    } else if (sql.toUpperCase().startsWith('UPDATE TAREAS')) {
        actualCallback(null, { affectedRows: 1 }); // Simular una fila afectada
    } else if (sql.toUpperCase().startsWith('DELETE FROM TAREAS')) {
        actualCallback(null, { affectedRows: 1 }); // Simular una fila afectada
    } else {
        actualCallback(new Error(`Unhandled SQL query in mock: ${sql}`));
    }
});

// Mock del módulo mysql2 ANTES de importar app.js
jest.mock('mysql2', () => {
    const actualMysql = jest.requireActual('mysql2'); // Para otras utilidades si es necesario
    const mockConnectionInstance = {
        connect: jest.fn(callback => {
            // console.log('[MOCK DB] connect() called');
            if (callback) callback(null); // Simula conexión exitosa inmediata
        }),
        query: mockDbQuery,
        on: jest.fn((event, handler) => {
            // console.log(`[MOCK DB] on('${event}') called`);
            // Si necesitas simular un error de DB persistente para probar la lógica 'db.on',
            // podrías llamar a handler aquí bajo ciertas condiciones.
        }),
        end: jest.fn(callback => {
            // console.log('[MOCK DB] end() called');
            if (callback) callback(null);
        }),
        state: 'connected' // Añadimos una propiedad 'state' para las comprobaciones en las rutas
    };
    return {
        ...actualMysql, // Conserva otras exportaciones de mysql2 si las hubiera
        createConnection: jest.fn(() => {
            // console.log('[MOCK DB] createConnection() called, returning mock instance');
            return mockConnectionInstance;
        }),
    };
});

// Importar app DESPUÉS de que los mocks estén configurados
const { app, initiateDbConnection } = require('../app'); // Importamos desde el nuevo app.js

// Variable para mantener la instancia de la conexión simulada
let mockDbInstance;

// Antes de todas las pruebas, inicializa la conexión a la DB (simulada)
// Esto es importante porque app.js ahora expone una función para esto.
beforeAll(done => {
    initiateDbConnection(
        (db) => { // onSuccess
            // console.log('[TESTS] Mock DB connection successful for tests.');
            mockDbInstance = db; // Guardamos la instancia mockeada si la necesitamos
            done();
        },
        (err) => { // onFailure - no debería ocurrir con el mock
            console.error('[TESTS] Mock DB connection failed for tests. This should not happen with mocks.', err);
            done(err);
        }
    );
});

// Limpiar mocks después de cada prueba
afterEach(() => {
    mockDbQuery.mockClear();
    // Si el mock de 'on' o 'connect' necesita ser limpiado:
    const mockConnection = require('mysql2').createConnection(); // Obtiene la instancia mockeada
    if (mockConnection.connect.mockClear) mockConnection.connect.mockClear();
    if (mockConnection.on.mockClear) mockConnection.on.mockClear();
});


describe('API de Tareas', () => {
    it('GET /api/tareas - debe devolver todas las tareas', async () => {
        const response = await request(app).get('/api/tareas');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(mockTasks); // Compara con el array completo
    });

    it('POST /api/tareas - debe crear una nueva tarea', async () => {
        const nuevaTareaDescripcion = 'Nueva Tarea Test';
        const response = await request(app)
            .post('/api/tareas')
            .send({ descripcion: nuevaTareaDescripcion });

        expect(response.statusCode).toBe(201);
        expect(response.body.descripcion).toBe(nuevaTareaDescripcion);
        expect(response.body).toHaveProperty('id');
    });

    it('PUT /api/tareas/:id - debe actualizar una tarea existente', async () => {
        const tareaIdActualizar = 1;
        const datosActualizacion = { completada: true };
        const response = await request(app)
            .put(`/api/tareas/${tareaIdActualizar}`)
            .send(datosActualizacion);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Tarea actualizada correctamente');
    });

    it('PUT /api/tareas/:id - debe devolver 404 si la tarea no existe', async () => {
        mockDbQuery.mockImplementationOnce((sql, params, callback) => { // Sobrescribir mock para este test
            if (sql.toUpperCase().startsWith('UPDATE TAREAS')) {
                callback(null, { affectedRows: 0 }); // Simular tarea no encontrada
            } else {
                // Devolver a la implementación original o manejar otros casos
                const originalCallback = typeof params === 'function' ? params : callback;
                originalCallback(new Error('SQL no manejado en mockImplementationOnce para PUT 404'));
            }
        });

        const tareaIdInexistente = 999;
        const datosActualizacion = { completada: true };
        const response = await request(app)
            .put(`/api/tareas/${tareaIdInexistente}`)
            .send(datosActualizacion);
        
        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Tarea no encontrada');
    });


    it('DELETE /api/tareas/:id - debe eliminar una tarea existente', async () => {
        const tareaIdEliminar = 1;
        const response = await request(app).delete(`/api/tareas/${tareaIdEliminar}`);

        expect(response.statusCode).toBe(200); // o 204 si cambias la respuesta del backend
        expect(response.body.message).toBe('Tarea eliminada correctamente');
    });


    it('DELETE /api/tareas/:id - debe devolver 404 si la tarea no existe', async () => {
         mockDbQuery.mockImplementationOnce((sql, params, callback) => {
            if (sql.toUpperCase().startsWith('DELETE FROM TAREAS')) {
                callback(null, { affectedRows: 0 }); // Simular tarea no encontrada
            } else {
                const originalCallback = typeof params === 'function' ? params : callback;
                originalCallback(new Error('SQL no manejado en mockImplementationOnce para DELETE 404'));
            }
        });
        const tareaIdInexistente = 999;
        const response = await request(app).delete(`/api/tareas/${tareaIdInexistente}`);
        
        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Tarea no encontrada');
    });
});