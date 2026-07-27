// URL base de tu backend (Asegúrate de que coincida con tu servidor Express)
const API_URL = 'http://localhost:3000/api';

// Función genérica para obtener datos (Leer / GET)
async function obtenerDatos(coleccion) {
    try {
        const respuesta = await fetch(`${API_URL}/${coleccion}`);
        if (!respuesta.ok) throw new Error('Error al conectar con la base de datos');
        const datos = await respuesta.json();
        return datos;
    } catch (error) {
        console.error(`Error obteniendo ${coleccion}:`, error);
        return [];
    }
}

// Función genérica para guardar datos (Crear / POST)
async function guardarDato(coleccion, datos) {
    try {
        const respuesta = await fetch(`${API_URL}/${coleccion}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        return await respuesta.json();
    } catch (error) {
        console.error(`Error guardando en ${coleccion}:`, error);
    }
}