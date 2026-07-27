// Función para cambiar entre pestañas del menú
function mostrarSeccion(seccionActiva) {
    // Ocultar todas las secciones
    const secciones = document.querySelectorAll('.seccion-app');
    secciones.forEach(seccion => {
        seccion.style.display = 'none';
    });

    // Mostrar solo la sección que seleccionamos
    document.getElementById(`seccion-${seccionActiva}`).style.display = 'block';

    // Si abrimos "clientes", cargamos los datos automáticamente
    if (seccionActiva === 'clientes') {
        cargarClientes();
    }
}

// Función para pintar los clientes en la tabla de HTML
async function cargarClientes() {
    const tbody = document.getElementById('tabla-clientes');
    tbody.innerHTML = '<tr><td colspan="4">Cargando datos...</td></tr>';

    // Llamamos a la función de api.js
    // ¡Asegúrate de tener la ruta /api/clientes en tu backend!
    const clientes = await obtenerDatos('clientes'); 

    // Limpiamos el mensaje de "Cargando"
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay clientes registrados</td></tr>';
        return;
    }

    // Recorremos el arreglo de Mongo y creamos las filas (<tr>)
    clientes.forEach(cliente => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${cliente.nombre}</td>
            <td>${cliente.correo}</td>
            <td>${cliente.telefono}</td>
            <td>
                <button class="btn btn-sm btn-primary">Editar</button>
                <button class="btn btn-sm btn-danger">Borrar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Ejecutar al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    // Simulamos un clic en la primera pestaña para que cargue por defecto
    mostrarSeccion('clientes');
});