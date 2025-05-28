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

// Configuración de la conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',        // O la IP de tu servidor MySQL
    user: 'root', // Reemplaza con tu usuario de MySQL
    password: '', // Reemplaza con tu contraseña
    database: 'lista_tareas_db'
});

// Conectar a MySQL
db.connect(err => {
    if (err) {
        console.error('Error al conectar a MySQL:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL.');
});

// RUTAS DE LA API

// Obtener todas las tareas
app.get('/api/tareas', (req, res) => {
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
    const { id } = req.params;
    console.log(`[BACKEND] Solicitud DELETE para ID: ${id}`); // <--- Agrega este log

    if (!id || isNaN(parseInt(id))) { // <-- Añade una validación básica para el ID
        console.error('[BACKEND] ID de tarea inválido o faltante:', id);
        return res.status(400).json({ error: 'ID de tarea inválido o faltante' });
    }

    const sql = 'DELETE FROM tareas WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('[BACKEND] Error en DB al eliminar tarea:', err); // <--- Agrega log de error
            return res.status(500).json({ error: 'Error interno del servidor al eliminar tarea', details: err.message });
        }
        if (result.affectedRows === 0) {
            console.log(`[BACKEND] Tarea no encontrada para eliminar con ID: ${id}`); // <--- Agrega log
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        console.log(`[BACKEND] Tarea eliminada correctamente ID: ${id}`); // <--- Agrega log
        res.json({ message: 'Tarea eliminada correctamente' });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});