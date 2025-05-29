// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear JSON en las solicitudes
app.use(express.static('public'));

// Configuración de la conexión a MySQL usando variables de entorno
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lista_tareas_db',
    waitForConnections: true, // Esto es bueno para pools de conexiones, pero no para createConnection
    connectionLimit: 10 // Si usas un pool de conexiones, útil
};

// --- MODIFICACIÓN IMPORTANTE AQUÍ: Lógica de reintentos para la conexión ---
let db; // Declara la conexión aquí para que sea accesible globalmente
const MAX_RETRIES = 10;
let retries = 0;

function connectWithRetries() {
    console.log(`Intentando conectar a MySQL... (Intento ${retries + 1} de ${MAX_RETRIES})`);
    db = mysql.createConnection(dbConfig); // Crea una nueva conexión en cada intento

    db.connect(err => {
        if (err) {
            console.error('Error al conectar a MySQL:', err.message); // Usar err.message para un error más conciso
            if (retries < MAX_RETRIES) {
                retries++;
                // Espera antes de reintentar (aumenta el tiempo exponencialmente o fijo)
                setTimeout(connectWithRetries, 5000 * retries); // Espera 5, 10, 15... segundos
            } else {
                console.error('Número máximo de reintentos de conexión a MySQL alcanzado. Saliendo...');
                process.exit(1); // Sale de la aplicación si no puede conectar
            }
            return;
        }
        console.log('Conectado a la base de datos MySQL.');
        retries = 0; // Reinicia el contador de reintentos si la conexión fue exitosa

        // Iniciar el servidor Express solo después de una conexión exitosa a la DB
        app.listen(port, () => {
            console.log(`Servidor escuchando en http://localhost:${port}`);
        });
    });

    // Manejar errores de conexión después de la conexión inicial (por si se pierde)
    db.on('error', err => {
        console.error('Error en la conexión a MySQL después de establecerse:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
            console.log('Reconectando a la base de datos...');
            retries = 0; // Reinicia reintentos para intentar una reconexión
            connectWithRetries();
        } else {
            throw err; // Otros errores, lanzar para que la app los maneje o falle
        }
    });
}

// Inicia el proceso de conexión con reintentos
connectWithRetries();

// --- FIN DE MODIFICACIÓN IMPORTANTE ---


// RUTAS DE LA API

// Obtener todas las tareas
app.get('/api/tareas', (req, res) => {
    // Asegurarse de que la conexión esté activa antes de hacer la consulta
    if (!db || db.state === 'disconnected') {
        console.error('Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const sql = 'SELECT * FROM tareas ORDER BY fecha_creacion DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener tareas:', err);
            return res.status(500).json({ error: 'Error interno del servidor al obtener tareas' });
        }
        res.json(results);
    });
});

// Agregar una nueva tarea
app.post('/api/tareas', (req, res) => {
    // Asegurarse de que la conexión esté activa antes de hacer la consulta
    if (!db || db.state === 'disconnected') {
        console.error('Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const { descripcion } = req.body;
    if (!descripcion) {
        return res.status(400).json({ error: 'La descripción es requerida' });
    }
    const sql = 'INSERT INTO tareas (descripcion) VALUES (?)';
    db.query(sql, [descripcion], (err, result) => {
        if (err) {
            console.error('Error al agregar tarea:', err);
            return res.status(500).json({ error: 'Error interno del servidor al agregar tarea' });
        }
        res.status(201).json({ id: result.insertId, descripcion, completada: false });
    });
});

// Actualizar una tarea (marcar como completada/incompleta)
app.put('/api/tareas/:id', (req, res) => {
    // Asegurarse de que la conexión esté activa antes de hacer la consulta
    if (!db || db.state === 'disconnected') {
        console.error('Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const { id } = req.params;
    const { completada } = req.body;

    if (typeof completada !== 'boolean') {
        return res.status(400).json({ error: 'El estado "completada" debe ser un booleano' });
    }

    const sql = 'UPDATE tareas SET completada = ? WHERE id = ?';
    db.query(sql, [completada, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar tarea:', err);
            return res.status(500).json({ error: 'Error interno del servidor al actualizar tarea' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ message: 'Tarea actualizada correctamente' });
    });
});

// Eliminar una tarea
app.delete('/api/tareas/:id', (req, res) => {
    // Asegurarse de que la conexión esté activa antes de hacer la consulta
    if (!db || db.state === 'disconnected') {
        console.error('Conexión a la base de datos no establecida o cerrada.');
        return res.status(500).json({ error: 'Conexión a la base de datos no disponible.' });
    }

    const { id } = req.params;
    console.log(`[BACKEND] Solicitud DELETE para ID: ${id}`);

    if (!id || isNaN(parseInt(id))) {
        console.error('[BACKEND] ID de tarea inválido o faltante:', id);
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }

    const sql = 'DELETE FROM tareas WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('[BACKEND] Error en DB al eliminar tarea:', err);
            return res.status(500).json({ error: 'Error interno del servidor al eliminar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            console.log(`[BACKEND] Tarea no encontrada para eliminar con ID: ${id}`);
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        console.log(`[BACKEND] Tarea eliminada correctamente ID: ${id}`);
        res.json({ message: 'Tarea eliminada correctamente' });
    });
});

// (Se ha movido app.listen() dentro de connectWithRetries() para que solo se inicie si la DB se conecta)