// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear JSON en las solicitudes
app.use(express.static('public')); // Servir archivos estáticos desde la carpeta public

// Configuración de la conexión a MySQL usando variables de entorno
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lista_tareas_db',
    // Eliminar waitForConnections y connectionLimit si no estás usando un pool
    // Si realmente quieres usar un pool, usa mysql.createPool en lugar de createConnection
};

let db;
const MAX_RETRIES = 10;
let retries = 0;

function connectWithRetries() {
    console.log(`[BACKEND DB] Intentando conectar a MySQL... (Intento ${retries + 1} de ${MAX_RETRIES})`);
    db = mysql.createConnection(dbConfig); // Crea una nueva conexión en cada intento de reconexión

    db.connect(err => {
        if (err) {
            console.error('[BACKEND DB] Error al conectar a MySQL:', err.message);
            if (retries < MAX_RETRIES) {
                retries++;
                // Espera antes de reintentar (aumenta el tiempo exponencialmente)
                setTimeout(connectWithRetries, 1000 * Math.pow(2, retries)); // 2, 4, 8, 16... segundos
            } else {
                console.error('[BACKEND DB] Número máximo de reintentos de conexión a MySQL alcanzado. La aplicación no podrá funcionar sin DB.');
                // En lugar de salir, podemos dejar la aplicación corriendo pero sin funcionalidad de DB
                // process.exit(1);
            }
            return;
        }
        console.log('[BACKEND DB] Conectado a la base de datos MySQL.');
        retries = 0; // Reinicia el contador de reintentos si la conexión fue exitosa

        // Iniciar el servidor Express solo después de una conexión exitosa a la DB
        app.listen(port, () => {
            console.log(`[BACKEND APP] Servidor escuchando en http://localhost:${port}`);
        });
    });

    db.on('error', err => {
        console.error('[BACKEND DB] Error en la conexión a MySQL después de establecerse:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED' || err.fatal) {
            console.log('[BACKEND DB] Conexión perdida o rechazada. Intentando reconectar...');
            // Cierra la conexión actual antes de intentar una nueva
            if (db && db.state !== 'disconnected') {
                db.end(); // Cierra la conexión para evitar múltiples conexiones zombie
            }
            retries = 0; // Reinicia reintentos para intentar una reconexión fresca
            connectWithRetries();
        } else {
            // Para otros errores no fatales, simplemente loguearlos
            console.error('[BACKEND DB] Otro error no fatal en la conexión:', err);
        }
    });
}

// Inicia el proceso de conexión con reintentos
connectWithRetries();


// RUTAS DE LA API

// Obtener todas las tareas
app.get('/api/tareas', (req, res) => {
    console.log('[BACKEND] GET /api/tareas solicitada');
    if (!db || db.state === 'disconnected') {
        console.error('[BACKEND] GET /api/tareas: Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const sql = 'SELECT * FROM tareas ORDER BY fecha_creacion DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('[BACKEND] Error al obtener tareas:', err);
            return res.status(500).json({ error: 'Error interno del servidor al obtener tareas', details: err.message });
        }
        res.json(results);
    });
});

// Agregar una nueva tarea
app.post('/api/tareas', (req, res) => {
    console.log('[BACKEND] POST /api/tareas solicitada. Body:', req.body);
    if (!db || db.state === 'disconnected') {
        console.error('[BACKEND] POST /api/tareas: Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const { descripcion } = req.body;
    if (!descripcion) {
        console.warn('[BACKEND] POST /api/tareas: Descripción es requerida.');
        return res.status(400).json({ error: 'La descripción es requerida' });
    }
    const sql = 'INSERT INTO tareas (descripcion) VALUES (?)';
    db.query(sql, [descripcion], (err, result) => {
        if (err) {
            console.error('[BACKEND] Error al agregar tarea:', err);
            return res.status(500).json({ error: 'Error interno del servidor al agregar tarea', details: err.message });
        }
        console.log(`[BACKEND] Tarea agregada con ID: ${result.insertId}`);
        res.status(201).json({ id: result.insertId, descripcion, completada: false });
    });
});

// Actualizar una tarea (marcar como completada/incompleta)
app.put('/api/tareas/:id', (req, res) => {
    const { id } = req.params;
    const { completada } = req.body;
    console.log(`[BACKEND] PUT /api/tareas/${id} solicitada. Body:`, req.body);

    if (!db || db.state === 'disconnected') {
        console.error(`[BACKEND] PUT /api/tareas/${id}: Conexión a la base de datos no establecida o cerrada.`);
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    // Validación más estricta del ID
    if (!id || isNaN(parseInt(id))) {
        console.error(`[BACKEND] PUT /api/tareas/${id}: ID de tarea inválido o faltante: ${id}`);
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }

    if (typeof completada !== 'boolean') {
        console.warn(`[BACKEND] PUT /api/tareas/${id}: El estado "completada" no es un booleano: ${completada}`);
        return res.status(400).json({ error: 'El estado "completada" debe ser un booleano' });
    }

    const sql = 'UPDATE tareas SET completada = ? WHERE id = ?';
    db.query(sql, [completada, id], (err, result) => {
        if (err) {
            console.error(`[BACKEND] Error al actualizar tarea con ID ${id}:`, err);
            return res.status(500).json({ error: 'Error interno del servidor al actualizar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            console.warn(`[BACKEND] PUT /api/tareas/${id}: Tarea no encontrada para actualizar.`);
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        console.log(`[BACKEND] Tarea ID ${id} actualizada correctamente a completada: ${completada}`);
        res.json({ message: 'Tarea actualizada correctamente' });
    });
});

// Eliminar una tarea
app.delete('/api/tareas/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[BACKEND] DELETE /api/tareas/${id} solicitada.`);

    if (!db || db.state === 'disconnected') {
        console.error(`[BACKEND] DELETE /api/tareas/${id}: Conexión a la base de datos no establecida o cerrada.`);
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    if (!id || isNaN(parseInt(id))) {
        console.error(`[BACKEND] DELETE /api/tareas/${id}: ID de tarea inválido o faltante: ${id}`);
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }

    const sql = 'DELETE FROM tareas WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(`[BACKEND] Error en DB al eliminar tarea con ID ${id}:`, err);
            return res.status(500).json({ error: 'Error interno del servidor al eliminar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            console.log(`[BACKEND] Tarea no encontrada para eliminar con ID: ${id}`);
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        console.log(`[BACKEND] Tarea eliminada correctamente ID: ${id}`);
        res.json({ message: 'Tarea eliminada correctamente' }); // Es válido un 200 OK con JSON
        // O res.status(204).send(); // Si no se necesita un cuerpo de respuesta
    });
});

// Manejo de rutas no encontradas (404) - ¡IMPORTANTE!
app.use((req, res, next) => {
    console.warn(`[BACKEND] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores generales (500)
app.use((err, req, res, next) => {
    console.error('[BACKEND] Error global no manejado:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});