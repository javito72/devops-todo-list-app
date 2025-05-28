// script.js
document.addEventListener('DOMContentLoaded', () => {
    const nuevaTareaInput = document.getElementById('nueva-tarea-input');
    const agregarTareaBtn = document.getElementById('agregar-tarea-btn');
    const listaTareasUl = document.getElementById('lista-tareas');

    const API_URL = 'http://localhost:3000/api/tareas'; // Asegúrate que el puerto coincida con tu backend

    // --- Funciones para interactuar con la API ---

    async function obtenerTareas() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const tareas = await response.json();
            renderizarTareas(tareas);
        } catch (error) {
            console.error('Error al obtener tareas:', error);
            alert('No se pudieron cargar las tareas. Revisa la consola para más detalles.');
        }
    }

    async function agregarTarea() {
        const descripcion = nuevaTareaInput.value.trim();
        if (!descripcion) {
            alert('Por favor, ingresa una descripción para la tarea.');
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ descripcion }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error HTTP: ${response.status}`);
            }
            // const nuevaTarea = await response.json(); // No es necesario si volvemos a cargar todo
            nuevaTareaInput.value = ''; // Limpiar input
            obtenerTareas(); // Volver a cargar todas las tareas
        } catch (error) {
            console.error('Error al agregar tarea:', error);
            alert(`No se pudo agregar la tarea: ${error.message}`);
        }
    }

    async function actualizarEstadoTarea(id, completada) {
        try {
            const response = await fetch(`<span class="math-inline">\{API\_URL\}/</span>{id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completada }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error HTTP: ${response.status}`);
            }
            obtenerTareas(); // Volver a cargar para reflejar el cambio
        } catch (error) {
            console.error('Error al actualizar tarea:', error);
            alert(`No se pudo actualizar la tarea: ${error.message}`);
        }
    }

    async function eliminarTarea(id) {
            console.log(`[FRONTEND] Intentando eliminar tarea con ID: ${id}`); // <--- Log para el ID

            if (!id) {
                alert('Error: El ID de la tarea es inválido.');
                return;
            }

            if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                return;
            }
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                });

                // Importante: Verificar el contenido ANTES de intentar parsear como JSON si no es .ok
                if (!response.ok) {
                    const responseText = await response.text(); // Obtener respuesta como texto primero
                    console.error('Error del servidor (no OK):', response.status, response.statusText, responseText);
                    // Intentar parsear como JSON solo si parece JSON, sino usar el texto del error
                    let errorMessage = `Error HTTP: ${response.status} ${response.statusText}`;
                    try {
                        const errorData = JSON.parse(responseText); // Intentar parsear el texto
                        errorMessage = errorData.error || errorData.message || responseText;
                    } catch (e) {
                        // Si falla el parseo, responseText (que es HTML) será parte del error
                        errorMessage = responseText.substring(0,100) + "..."; // Mostrar un fragmento del HTML
                    }
                    throw new Error(errorMessage);
                }

                // Si la respuesta es OK (2xx), el backend debería enviar JSON.
                // Si el backend envía un 204 No Content (que es válido para DELETE), no habrá cuerpo JSON.
                if (response.status === 204) { // Manejar caso de 204 No Content
                    console.log('[FRONTEND] Tarea eliminada (204 No Content)');
                } else {
                    // Para status 200 OK, esperamos un JSON
                    const data = await response.json(); // Esto podría fallar si el status es 200 pero el body es HTML
                    console.log('[FRONTEND] Respuesta de eliminación:', data);
                }

                obtenerTareas(); // Volver a cargar
            } catch (error) {
                console.error('[FRONTEND] Error al eliminar tarea:', error);
                // Mostrar el error de forma más informativa
                alert(`No se pudo eliminar la tarea. Detalle: ${error.message}`);
            }
        }

    // --- Funciones del DOM ---

    function renderizarTareas(tareas) {
        listaTareasUl.innerHTML = ''; // Limpiar lista actual
        if (tareas.length === 0) {
            listaTareasUl.innerHTML = '<li>No hay tareas pendientes. ¡Añade alguna!</li>';
            return;
        }

        tareas.forEach(tarea => {
            const li = document.createElement('li');
            li.dataset.id = tarea.id;
            if (tarea.completada) {
                li.classList.add('completada');
            }

            const spanDescripcion = document.createElement('span');
            spanDescripcion.textContent = tarea.descripcion;
            spanDescripcion.addEventListener('click', () => { // Permitir marcar/desmarcar al hacer clic en el texto
                actualizarEstadoTarea(tarea.id, !tarea.completada);
            });

            const divAcciones = document.createElement('div');
            divAcciones.classList.add('acciones-tarea');

            const botonCompletar = document.createElement('button');
            botonCompletar.classList.add('btn-completar');
            botonCompletar.innerHTML = tarea.completada ? '↩️' : '✔️'; // Deshacer : Completar
            botonCompletar.title = tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada';
            botonCompletar.addEventListener('click', () => {
                actualizarEstadoTarea(tarea.id, !tarea.completada);
            });

            const botonEliminar = document.createElement('button');
            botonEliminar.classList.add('btn-eliminar');
            botonEliminar.innerHTML = '🗑️';
            botonEliminar.title = 'Eliminar tarea';
            botonEliminar.addEventListener('click', () => {
                eliminarTarea(tarea.id);
            });

            divAcciones.appendChild(botonCompletar);
            divAcciones.appendChild(botonEliminar);

            li.appendChild(spanDescripcion);
            li.appendChild(divAcciones);
            listaTareasUl.appendChild(li);
        });
    }

    // --- Event Listeners ---
    agregarTareaBtn.addEventListener('click', agregarTarea);
    nuevaTareaInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            agregarTarea();
        }
    });

    // Carga inicial de tareas
    obtenerTareas();
});