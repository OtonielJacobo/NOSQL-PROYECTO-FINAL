// app.js - Este es el principal

let hoteles = [];
let habitaciones = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();
});

async function cargarDatos() {
  try {
    hoteles = await api.get('hoteles');
    habitaciones = await api.get('habitaciones');
    renderizarHoteles();
  } catch (error) {
    console.error("Error:", error);
    document.getElementById('lista-hoteles').innerHTML = 
      `<div class="empty-state" style="color: red;">Error al conectar con la base de datos.</div>`;
  }
}

function renderizarHoteles() {
  const contenedor = document.getElementById('lista-hoteles');
  
  if (!hoteles || hoteles.length === 0) {
    contenedor.innerHTML = `<div class="empty-state">Actualmente no hay hoteles registrados.</div>`;
    return;
  }

  const html = hoteles.map(hotel => {
    const habsDelHotel = habitaciones.filter(h => h.hotelId === hotel._id && h.disponibilidad);
    const estrellasHtml = '⭐'.repeat(hotel.estrellas || 1);

    return `
      <article class="hotel-card">
        <div class="hotel-img">🏙️</div>
        <div class="hotel-info">
          <h3>${escapeHtml(hotel.nombre)}</h3>
          <p>📍 ${escapeHtml(hotel.ubicacion)}</p>
          <p class="estrellas">${estrellasHtml}</p>
        </div>
        
        <div class="habitaciones-container">
          <h4 style="margin-top:0; color: #62748a;">Habitaciones Disponibles:</h4>
          ${habsDelHotel.length > 0 ? habsDelHotel.map(hab => `
            <div class="habitacion-item">
              <div>
                <div class="hab-tipo">${escapeHtml(hab.tipo)}</div>
                <div class="hab-precio">$${hab.precio} / noche</div>
              </div>
              <button class="btn-reservar" onclick="alert('Funcionalidad de reservación en desarrollo')">Reservar</button>
            </div>
          `).join('') : '<div style="color: #db3a34; font-size: 14px;">No hay habitaciones disponibles.</div>'}
        </div>
      </article>
    `;
  }).join('');

  contenedor.innerHTML = html;
}

const escapeHtml = (text) => 
  String(text ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);