// app.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de la conexión a MySQL usando variables de entorno
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lista_tareas_db',
    // Puedes añadir opciones de pool aquí si cambias a createPool
};

let db; // Hacemos 'db' accesible para las rutas
const MAX_RETRIES = 10; // Mantenemos la lógica de reintentos
let connectionRetries = 0; // Renombrado para evitar confusión con 'retries' en otros contextos

function handleDisconnect(initialConnection = false) {
    console.log(`[APP DB] Intentando conectar a MySQL... (Intento ${connectionRetries + 1} de ${MAX_RETRIES})`);
    db = mysql.createConnection(dbConfig); // Crea una nueva conexión

    db.connect(err => {
        if (err) {
            console.error('[APP DB] Error al conectar a MySQL:', err.message);
            if (connectionRetries < MAX_RETRIES -1) { // -1 porque el primer intento es el 0
                connectionRetries++;
                setTimeout(() => handleDisconnect(false), 1000 * Math.pow(2, connectionRetries));
            } else {
                console.error('[APP DB] Número máximo de reintentos de conexión a MySQL alcanzado.');
                // Notificar al módulo server.js que la conexión falló permanentemente
                if (initialConnection && module.exports.onDbConnectionFailure) {
                    module.exports.onDbConnectionFailure(new Error("No se pudo conectar a la DB después de máximos reintentos."));
                }
            }
            return;
        }
        console.log('[APP DB] Conectado a la base de datos MySQL.');
        connectionRetries = 0; // Reinicia el contador
        // Notificar al módulo server.js que la conexión fue exitosa
        if (initialConnection && module.exports.onDbConnectionSuccess) {
            module.exports.onDbConnectionSuccess(db);
        }
    });

    db.on('error', err => {
        console.error('[APP DB] Error en la conexión a MySQL después de establecerse:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED' || err.fatal) {
            console.log('[APP DB] Conexión perdida o rechazada. Intentando reconectar...');
            connectionRetries = 0; // Reinicia para una reconexión fresca
            if (db && db.end) db.end(); // Asegúrate de cerrar la conexión antigua
            handleDisconnect(false); // Intenta reconectar
        } else {
            console.error('[APP DB] Otro error no fatal en la conexión:', err);
        }
    });
}

// RUTAS DE LA API (usan la variable 'db' definida arriba)
// Obtener todas las tareas
app.get('/api/tareas', (req, res) => {
    console.log('[APP] GET /api/tareas solicitada');
    if (!db || db.state === 'disconnected' || !db.query) { // !db.query para el mock
        console.error('[APP] GET /api/tareas: Conexión a la base de datos no disponible.');
        return res.status(503).json({ error: 'Servicio no disponible temporalmente (DB)' });
    }
    const sql = 'SELECT * FROM tareas ORDER BY fecha_creacion DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('[APP] Error al obtener tareas:', err);
            return res.status(500).json({ error: 'Error interno del servidor al obtener tareas', details: err.message });
        }
        res.json(results);
    });
});

// Agregar una nueva tarea
app.post('/api/tareas', (req, res) => {
    console.log('[APP] POST /api/tareas solicitada. Body:', req.body);
    if (!db || db.state === 'disconnected' || !db.query) {
        console.error('[APP] POST /api/tareas: Conexión a la base de datos no disponible.');
        return res.status(503).json({ error: 'Servicio no disponible temporalmente (DB)' });
    }
    const { descripcion } = req.body;
    if (!descripcion) {
        console.warn('[APP] POST /api/tareas: Descripción es requerida.');
        return res.status(400).json({ error: 'La descripción es requerida' });
    }
    const sql = 'INSERT INTO tareas (descripcion) VALUES (?)';
    db.query(sql, [descripcion], (err, result) => {
        if (err) {
            console.error('[APP] Error al agregar tarea:', err);
            return res.status(500).json({ error: 'Error interno del servidor al agregar tarea', details: err.message });
        }
        console.log(`[APP] Tarea agregada con ID: ${result.insertId}`);
        res.status(201).json({ id: result.insertId, descripcion, completada: false });
    });
});

// Actualizar una tarea
app.put('/api/tareas/:id', (req, res) => {
    const { id } = req.params;
    const { completada } = req.body;
    console.log(`[APP] PUT /api/tareas/${id} solicitada. Body:`, req.body);
    if (!db || db.state === 'disconnected' || !db.query) {
        return res.status(503).json({ error: 'Servicio no disponible temporalmente (DB)' });
    }
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }
    if (typeof completada !== 'boolean') {
        return res.status(400).json({ error: 'El estado "completada" debe ser un booleano' });
    }
    const sql = 'UPDATE tareas SET completada = ? WHERE id = ?';
    db.query(sql, [completada, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ message: 'Tarea actualizada correctamente' });
    });
});

// Eliminar una tarea
app.delete('/api/tareas/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[APP] DELETE /api/tareas/${id} solicitada.`);
    if (!db || db.state === 'disconnected' || !db.query) {
        return res.status(503).json({ error: 'Servicio no disponible temporalmente (DB)' });
    }
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }
    const sql = 'DELETE FROM tareas WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ message: 'Tarea eliminada correctamente' });
    });
});

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
    console.warn(`[APP] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores generales (500)
app.use((err, req, res, next) => {
    console.error('[APP] Error global no manejado:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

// Exportamos la app y la función para iniciar la conexión a la DB
// Estas funciones serán usadas por server.js para controlar cuándo iniciar.
module.exports = {
    app,
    initiateDbConnection: (onSuccess, onFailure) => {
        module.exports.onDbConnectionSuccess = onSuccess;
        module.exports.onDbConnectionFailure = onFailure;
        handleDisconnect(true); // Inicia el primer intento de conexión
    },
    // Exponer 'db' para pruebas si es absolutamente necesario,
    // pero es mejor probar a través de la API.
    // getDbInstance: () => db
};