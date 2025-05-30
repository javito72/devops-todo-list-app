**📝 Aplicación de Lista de Tareas Dockerizada**
Esta es una aplicación sencilla de lista de tareas ("Todo App") que permite añadir, marcar como completadas/pendientes y eliminar tareas. La aplicación está construida con un frontend en HTML/CSS/JavaScript puro y un backend en Node.js (Express) que interactúa con una base de datos MySQL. Toda la aplicación está completamente dockerizada para facilitar su despliegue y ejecución en cualquier entorno.

**🚀 Tecnologías Utilizadas**
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express.js
* **Base de Datos:** MySQL
* **Contenerización:** Docker, Docker Compose

**✨ Características**
* Interfaz de usuario simple e intuitiva.
* Funcionalidades CRUD (Crear, Leer, Actualizar, Eliminar) para tareas.
* Persistencia de datos en base de datos MySQL.
* Configuración de conexión a la base de datos robusta con lógica de reintentos.
* Entorno de desarrollo y producción consistente gracias a Docker.

**📋 Requisitos**
Antes de intentar ejecutar esta aplicación, asegúrate de tener instalado lo siguiente en tu sistema:
* **Git:** Para clonar el repositorio.
   * Descargar Git
* **Docker Desktop** (para Windows o macOS) o **Docker Engine/Daemon** (para Linux): Incluye Docker Compose, necesario para levantar los servicios.
   * Descargar Docker Desktop

**🏃‍♀️ Cómo Ponerlo en Marcha**
**¡Importante!** Docker Desktop tiene que estar en funcionamiento antes de construir y levantar los contenedores docker.
Sigue estos pasos para clonar y ejecutar la aplicación en tu máquina local:

1. **Clona el Repositorio:** Abre tu terminal (línea de comandos) y ejecuta el siguiente comando para clonar el proyecto. Asegúrate de estar en el directorio donde deseas guardar la aplicación.

```
git clone https://github.com/javito72/devops-todo-list-app.git
```

2. **Navega al Directorio del Proyecto:** Ingresa al directorio raíz del proyecto que acabas de clonar:

```
cd devops-todo-list-app
```

3. **Asegúrate de estar en la rama **`main`: Dado que tu rama principal ahora es `main` y contiene los cambios más recientes, asegúrate de estar en ella:

```
git checkout main
```

4. **Construye y Levanta los Contenedores Docker:** Este comando construirá las imágenes Docker necesarias (si no existen o si hay cambios en los `Dockerfile`s) y levantará los servicios (`app` para el backend/frontend y `mysql_db` para la base de datos) en segundo plano.

```
docker-compose up -d --build
```

   * `up`: Inicia los servicios.
   * `-d`: Ejecuta los contenedores en modo "detached" (en segundo plano), liberando tu terminal.
   * `--build`: Fuerza la reconstrucción de las imágenes de Docker. Esto es crucial la primera vez o si se han modificado los `Dockerfile`s o las dependencias (`package.json`).

5. **Accede a la Aplicación en tu Navegador:** Una vez que los contenedores estén levantados (puede tardar unos segundos para que la base de datos y el servidor Node.js se inicien completamente), abre tu navegador web y ve a la siguiente dirección:
`http://localhost:3000`
¡Deberías ver la aplicación de lista de tareas funcionando!

**🛑 Detener la Aplicación**
Cuando hayas terminado de usar la aplicación y quieras detener los contenedores, simplemente regresa a la terminal en el directorio raíz del proyecto y ejecuta:

```
docker-compose down
```

**☁️ Despliegue de la Aplicación**

La aplicación Lista de Tareas (Todo List App) está desplegada en la nube utilizando las siguientes plataformas:

**Servicio de Base de Datos: Aiven (MySQL)**
La base de datos MySQL está gestionada y alojada en Aiven, proporcionando un entorno robusto y escalable para los datos de la aplicación.

**Aplicación Web (Frontend y API Backend): Render**
El frontend (interfaz de usuario) y la API de backend (Node.js/Express) están alojados como un único servicio web en Render.

**Acceso a la Aplicación:** https://devops-todo-list-app.onrender.com/