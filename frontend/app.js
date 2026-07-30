// app.js - Sitio público de Hotelia (listado, búsqueda, reservaciones y comentarios)
// Se apoya en api.js (fetch genérico) y consume la API REST de index.js

// ---------- Estado global ----------
let hoteles = [];
let habitaciones = [];
let comentarios = [];
let clientes = [];              // se usa solo para validar login (ver nota en iniciarSesion)
let sesion = null;              // { _id, nombre, email, rol } del cliente autenticado
let reservaIntentada = null;    // guarda { hotelId, habitacionId } si el usuario intenta reservar sin sesión

const SESSION_KEY = 'hoteliaCliente';

document.addEventListener('DOMContentLoaded', async () => {
  restaurarSesion();
  configurarBusqueda();
  configurarModales();
  await cargarDatos();
});

// ---------- Carga de datos ----------
async function cargarDatos() {
  try {
    [hoteles, habitaciones, comentarios, clientes] = await Promise.all([
      api.get('hoteles'),
      api.get('habitaciones'),
      api.get('comentarios'),
      api.get('clientes'),
    ]);
    renderizarHoteles();
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('lista-hoteles').innerHTML =
      `<div class="empty-state" style="color: red;">Error al conectar con la base de datos.</div>`;
  }
}

// ---------- Sesión de cliente ----------
// Nota: el backend no tiene un endpoint de login ni hashea contraseñas, así que
// aquí el "login" solo compara contra la lista de /clientes en el navegador.
// Es suficiente para un proyecto escolar, pero no es un mecanismo seguro para producción.
function restaurarSesion() {
  const guardada = localStorage.getItem(SESSION_KEY);
  if (guardada) {
    try { sesion = JSON.parse(guardada); } catch { sesion = null; }
  }
  actualizarUISesion();
}

function guardarSesion(cliente) {
  sesion = { _id: cliente._id, nombre: cliente.nombre, email: cliente.email, rol: cliente.rol || 'cliente' };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
  actualizarUISesion();
}

function cerrarSesion() {
  sesion = null;
  localStorage.removeItem(SESSION_KEY);
  actualizarUISesion();
  notify('Sesión cerrada');
}

function actualizarUISesion() {
  const caja = document.getElementById('cuenta-caja');
  document.getElementById('enlace-admin').hidden = sesion?.rol !== 'admin';
  if (sesion) {
    caja.innerHTML = `
      <span class="cuenta-nombre">👤 ${escapeHtml(sesion.nombre)}</span>
      <button class="btn btn-secondary btn-sm" id="btn-mis-reservaciones" type="button">Mis Reservaciones</button>
      <button class="btn btn-secondary btn-sm" id="btn-cerrar-sesion" type="button">Cerrar Sesión</button>`;
    document.getElementById('btn-mis-reservaciones').onclick = abrirMisReservaciones;
    document.getElementById('btn-cerrar-sesion').onclick = cerrarSesion;
  } else {
    caja.innerHTML = `<button class="btn btn-primary btn-sm" id="btn-abrir-sesion" type="button">Iniciar Sesión</button>`;
    document.getElementById('btn-abrir-sesion').onclick = () => abrirAuthModal();
  }
}

// ---------- Búsqueda y filtros ----------
function configurarBusqueda() {
  const form = document.getElementById('form-busqueda');
  form.addEventListener('input', renderizarHoteles);
  form.addEventListener('submit', (event) => { event.preventDefault(); renderizarHoteles(); });
  document.getElementById('btn-limpiar-busqueda').addEventListener('click', () => {
    form.reset();
    renderizarHoteles();
  });
}

function obtenerFiltros() {
  const form = document.getElementById('form-busqueda');
  const datos = new FormData(form);
  return {
    ubicacion: (datos.get('ubicacion') || '').toLowerCase().trim(),
    estrellas: Number(datos.get('estrellas') || 0),
    orden: datos.get('orden') || 'nombre',
  };
}

function filtrarYOrdenar(listaHoteles) {
  const { ubicacion, estrellas, orden } = obtenerFiltros();
  let resultado = listaHoteles.filter((hotel) =>
    (!ubicacion || hotel.ubicacion.toLowerCase().includes(ubicacion)) &&
    (hotel.estrellas || 0) >= estrellas
  );
  if (orden === 'precio-asc' || orden === 'precio-desc') {
    resultado = resultado.slice().sort((a, b) => {
      const precioA = precioMinimo(a._id);
      const precioB = precioMinimo(b._id);
      return orden === 'precio-asc' ? precioA - precioB : precioB - precioA;
    });
  } else if (orden === 'estrellas') {
    resultado = resultado.slice().sort((a, b) => (b.estrellas || 0) - (a.estrellas || 0));
  } else {
    resultado = resultado.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  return resultado;
}

function precioMinimo(hotelId) {
  const precios = habitaciones.filter((h) => h.hotelId === hotelId && h.disponibilidad).map((h) => h.precio);
  return precios.length ? Math.min(...precios) : Infinity;
}

// ---------- Calificaciones ----------
function comentariosDeHotel(hotelId) {
  return comentarios.filter((c) => (c.hotelId?._id || c.hotelId) === hotelId);
}

function calificacionPromedio(hotelId) {
  const lista = comentariosDeHotel(hotelId);
  if (!lista.length) return null;
  const suma = lista.reduce((total, c) => total + (c.calificacion || 0), 0);
  return { promedio: (suma / lista.length).toFixed(1), total: lista.length };
}

// ---------- Render principal ----------
function renderizarHoteles() {
  const contenedor = document.getElementById('lista-hoteles');

  if (!hoteles || hoteles.length === 0) {
    contenedor.innerHTML = `<div class="empty-state">Actualmente no hay hoteles registrados.</div>`;
    return;
  }

  const visibles = filtrarYOrdenar(hoteles);
  if (visibles.length === 0) {
    contenedor.innerHTML = `<div class="empty-state">No encontramos hoteles con esos filtros. Intenta ajustar tu búsqueda.</div>`;
    return;
  }

  const html = visibles.map(hotel => {
    const habsDelHotel = habitaciones.filter(h => h.hotelId === hotel._id && h.disponibilidad === true);
    const tiposDeHabitacion = Object.values(habsDelHotel.reduce((grupos, habitacion) => {
      if (!grupos[habitacion.tipo]) grupos[habitacion.tipo] = { tipo: habitacion.tipo, habitaciones: [] };
      grupos[habitacion.tipo].habitaciones.push(habitacion);
      return grupos;
    }, {}));
    const estrellasHtml = '⭐'.repeat(hotel.estrellas || 1);
    const calificacion = calificacionPromedio(hotel._id);
    const listaComentarios = comentariosDeHotel(hotel._id);

    return `
      <article class="hotel-card">
        <div class="hotel-img">${hotel.imagenUrl
          ? `<img src="${escapeHtml(hotel.imagenUrl)}" alt="${escapeHtml(hotel.nombre)}">`
          : '🏙️'}</div>
        <div class="hotel-info">
          <h3>${escapeHtml(hotel.nombre)}</h3>
          <p>📍 ${escapeHtml(hotel.ubicacion)}</p>
          <p class="estrellas">${estrellasHtml}</p>
          <p class="rating-resumen">
            ${calificacion ? `⭐ ${calificacion.promedio} · ${calificacion.total} comentario${calificacion.total === 1 ? '' : 's'}` : 'Sin comentarios todavía'}
          </p>
        </div>

        <div class="habitaciones-container">
          <h4 style="margin-top:0; color: var(--text-secondary);">Habitaciones Disponibles:</h4>
          ${tiposDeHabitacion.length > 0 ? tiposDeHabitacion.map(grupo => {
            const habitacionBase = grupo.habitaciones[0];
            const precios = grupo.habitaciones.map((habitacion) => habitacion.precio);
            const precioMinimoTipo = Math.min(...precios);
            const precioMaximoTipo = Math.max(...precios);
            const textoPrecio = precioMinimoTipo === precioMaximoTipo ? `$${precioMinimoTipo}` : `Desde $${precioMinimoTipo}`;
            return `
            <div class="habitacion-item">
              <div>
                <div class="hab-tipo">${escapeHtml(grupo.tipo)} · ${grupo.habitaciones.length} habitación(es)</div>
                <div class="hab-precio">${textoPrecio} / noche</div>
              </div>
              <button class="btn btn-accent btn-sm" data-reservar data-hotel="${hotel._id}" data-habitacion="${habitacionBase._id}">Reservar Ahora</button>
            </div>
          `;
          }).join('') : '<div style="color: var(--danger); font-size: 14px;">No hay habitaciones disponibles.</div>'}
        </div>

        <div class="comentarios-container">
          <button class="btn-toggle-comentarios" data-toggle-comentarios="${hotel._id}" type="button">
            Leer Reseñas (${listaComentarios.length})
          </button>
          <div class="comentarios-lista" id="comentarios-${hotel._id}" hidden>
            ${listaComentarios.length ? listaComentarios.map(c => `
              <div class="comentario-item">
                <div class="comentario-cabecera">
                  <strong>${escapeHtml(c.clienteId?.nombre || 'Huésped')}</strong>
                  <span>${'★'.repeat(c.calificacion)}${'☆'.repeat(5-c.calificacion)}</span>
                </div>
                <p>${escapeHtml(c.comentario)}</p>
              </div>
            `).join('') : '<p class="empty-mini">Aún no hay reseñas.</p>'}
            <button class="btn-comentar" data-comentar="${hotel._id}" type="button">Escribir Reseña</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  contenedor.innerHTML = html;
  enlazarEventosTarjetas();
}

function enlazarEventosTarjetas() {
  document.querySelectorAll('[data-reservar]').forEach((boton) => {
    boton.onclick = () => intentarReservar(boton.dataset.hotel, boton.dataset.habitacion);
  });
  document.querySelectorAll('[data-toggle-comentarios]').forEach((boton) => {
    boton.onclick = () => {
      const panel = document.getElementById(`comentarios-${boton.dataset.toggleComentarios}`);
      panel.hidden = !panel.hidden;
    };
  });
  document.querySelectorAll('[data-comentar]').forEach((boton) => {
    boton.onclick = () => abrirComentarioModal(boton.dataset.comentar);
  });
}

// ---------- Flujo de reservación ----------
function intentarReservar(hotelId, habitacionId) {
  if (!sesion) {
    reservaIntentada = { hotelId, habitacionId };
    abrirAuthModal('Inicia sesión para completar tu reservación');
    return;
  }
  abrirReservaModal(hotelId, habitacionId);
}

function abrirReservaModal(hotelId, habitacionId) {
  const hotel = hoteles.find((h) => h._id === hotelId);
  const habitacion = habitaciones.find((h) => h._id === habitacionId);
  if (!hotel || !habitacion) return notify('No fue posible cargar la habitación seleccionada', true);
  if (habitacion.disponibilidad !== true) return notify('Esta habitación no está disponible para reservar', true);

  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('reserva-resumen').innerHTML =
    `<strong>${escapeHtml(hotel.nombre)}</strong> · ${escapeHtml(habitacion.tipo)} · $${habitacion.precio} / noche`;

  const form = document.getElementById('form-reserva');
  form.reset();
  form.dataset.hotel = hotelId;
  form.dataset.habitacion = habitacionId;
  form.dataset.tipo = habitacion.tipo;
  form.fechaEntrada.min = hoy;
  form.fechaSalida.min = hoy;
  form.habitacionId.innerHTML = '';
  document.getElementById('reserva-habitacion-caja').hidden = true;
  document.getElementById('reserva-disponibilidad').textContent = '';

  abrirModal('modal-reserva');
}

async function enviarReserva(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const { hotel, habitacion: habitacionInicial } = form.dataset;
  const habitacion = form.habitacionId.value || habitacionInicial;
  const fechaEntrada = form.fechaEntrada.value;
  const fechaSalida = form.fechaSalida.value;
  const numeroPersonas = Number(form.numeroPersonas.value);

  if (fechaSalida <= fechaEntrada) {
    return notify('La fecha de salida debe ser posterior a la fecha de entrada', true);
  }

  try {
    const reservacion = await api.create('reservaciones', {
      hotelId: hotel,
      habitacionId: habitacion,
      clienteId: sesion._id,
      fechaEntrada,
      fechaSalida,
      numeroPersonas,
    });
    const habitacionAsignada = habitaciones.find((item) => item._id === reservacion.habitacionId);
    notify(habitacionAsignada ? `¡Reservación creada! Habitación ${habitacionAsignada.numero} asignada.` : '¡Reservación creada con éxito!');
    cerrarModal('modal-reserva');
  } catch (error) {
    notify(error.message, true);
  }
}

async function actualizarHabitacionesDisponibles() {
  const form = document.getElementById('form-reserva');
  const { hotel, tipo } = form.dataset;
  const caja = document.getElementById('reserva-habitacion-caja');
  const selector = form.habitacionId;
  const mensaje = document.getElementById('reserva-disponibilidad');
  const boton = form.querySelector('button[type="submit"]');
  if (!hotel || !tipo || !form.fechaEntrada.value || !form.fechaSalida.value || form.fechaSalida.value <= form.fechaEntrada.value) {
    caja.hidden = true;
    selector.innerHTML = '';
    mensaje.textContent = '';
    boton.disabled = false;
    return;
  }
  try {
    const parametros = new URLSearchParams({ hotelId: hotel, tipo, fechaEntrada: form.fechaEntrada.value, fechaSalida: form.fechaSalida.value });
    const disponibles = await api.get(`habitaciones-disponibles?${parametros}`);
    selector.innerHTML = disponibles.map((habitacion) =>
      `<option value="${habitacion._id}">Habitación ${escapeHtml(habitacion.numero)}</option>`).join('');
    caja.hidden = disponibles.length <= 1;
    mensaje.textContent = disponibles.length ? `${disponibles.length} habitación(es) ${tipo} disponible(s).` : `No hay habitaciones ${tipo} disponibles para esas fechas.`;
    boton.disabled = disponibles.length === 0;
  } catch (error) {
    mensaje.textContent = error.message;
    boton.disabled = true;
  }
}

// ---------- Mis reservaciones ----------
async function abrirMisReservaciones() {
  try {
    const todas = await api.get('reservaciones');
    const propias = todas.filter((r) => (r.clienteId?._id || r.clienteId) === sesion._id);
    const lista = document.getElementById('mis-reservaciones-lista');
    lista.innerHTML = propias.length ? propias.map((r) => `
      <div class="reserva-item">
        <div class="reserva-item-info">
          <strong>${escapeHtml(r.hotelId?.nombre || 'Hotel')}</strong>
          <p>${escapeHtml(r.habitacionId?.tipo || '')} · ${formatDate(r.fechaEntrada)} — ${formatDate(r.fechaSalida)} · ${r.numeroPersonas} personas · Estado: ${escapeHtml(r.estado || 'activa')}</p>
        </div>
        <button class="btn-danger-sm" data-cancelar="${r._id}" type="button">Cancelar</button>
      </div>
    `).join('') : '<p class="empty-mini">Todavía no tienes reservaciones.</p>';

    document.querySelectorAll('[data-cancelar]').forEach((boton) => {
      boton.onclick = () => cancelarReserva(boton.dataset.cancelar);
    });

    abrirModal('modal-mis-reservaciones');
  } catch (error) {
    notify(error.message, true);
  }
}

async function cancelarReserva(id) {
  if (!confirm('¿Deseas cancelar esta reservación?')) return;
  try {
    await api.remove('reservaciones', id);
    notify('Reservación cancelada');
    abrirMisReservaciones();
  } catch (error) {
    notify(error.message, true);
  }
}

// ---------- Comentarios ----------
function abrirComentarioModal(hotelId) {
  if (!sesion) {
    reservaIntentada = null;
    abrirAuthModal('Inicia sesión para dejar un comentario');
    return;
  }
  const form = document.getElementById('form-comentario');
  form.reset();
  form.dataset.hotel = hotelId;
  abrirModal('modal-comentario');
}

async function enviarComentario(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api.create('comentarios', {
      hotelId: form.dataset.hotel,
      clienteId: sesion._id,
      comentario: form.comentario.value,
      calificacion: Number(form.calificacion.value),
    });
    notify('¡Gracias por tu comentario!');
    cerrarModal('modal-comentario');
    comentarios = await api.get('comentarios');
    renderizarHoteles();
  } catch (error) {
    notify(error.message, true);
  }
}

// ---------- Autenticación (login / registro) ----------
function abrirAuthModal(mensaje) {
  document.getElementById('auth-mensaje').textContent = mensaje || '';
  document.getElementById('form-login').reset();
  document.getElementById('form-registro').reset();
  mostrarPestanaAuth('login');
  abrirModal('modal-auth');
}

function mostrarPestanaAuth(pestana) {
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.authTab === pestana));
  document.getElementById('form-login').hidden = pestana !== 'login';
  document.getElementById('form-registro').hidden = pestana !== 'registro';
}

async function enviarLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const mensajeEl = document.getElementById('auth-mensaje');

  try {
    clientes = await api.get('clientes');
    const cliente = clientes.find((c) => c.email?.toLowerCase() === email && c.password === password);
    if (!cliente) {
      mensajeEl.textContent = 'Correo o contraseña incorrectos';
      mensajeEl.style.color = 'var(--danger)';
      mensajeEl.style.marginBottom = 'var(--space-md)';
      return;
    }

    guardarSesion(cliente);
    cerrarModal('modal-auth');
    if (sesion.rol === 'admin') {
      window.location.href = 'admin.html';
      return;
    }
    continuarDespuesDeLogin();
  } catch (error) {
    mensajeEl.textContent = error.message;
    mensajeEl.style.color = 'var(--danger)';
    mensajeEl.style.marginBottom = 'var(--space-md)';
  }
}

async function enviarRegistro(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const mensajeEl = document.getElementById('auth-mensaje');
  try {
    const cliente = await api.create('clientes', {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim().toLowerCase(),
      password: form.password.value,
      rol: 'cliente',
    });
    guardarSesion(cliente);
    cerrarModal('modal-auth');
    notify(`¡Bienvenido, ${cliente.nombre}!`);
    continuarDespuesDeLogin();
  } catch (error) {
    mensajeEl.textContent = error.message;
    mensajeEl.style.color = 'var(--danger)';
    mensajeEl.style.marginBottom = 'var(--space-md)';
  }
}

function continuarDespuesDeLogin() {
  if (reservaIntentada) {
    abrirReservaModal(reservaIntentada.hotelId, reservaIntentada.habitacionId);
    reservaIntentada = null;
  }
}

// ---------- Modales genéricos ----------
function configurarModales() {
  document.getElementById('form-reserva').addEventListener('submit', enviarReserva);
  document.querySelectorAll('#form-reserva input[type="date"]').forEach((input) => input.addEventListener('change', actualizarHabitacionesDisponibles));
  document.getElementById('form-comentario').addEventListener('submit', enviarComentario);
  document.getElementById('form-login').addEventListener('submit', enviarLogin);
  document.getElementById('form-registro').addEventListener('submit', enviarRegistro);

  document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.onclick = () => mostrarPestanaAuth(tab.dataset.authTab));
  document.querySelectorAll('[data-cerrar-modal]').forEach((boton) => boton.onclick = () => cerrarModal(boton.dataset.cerrarModal));
  document.querySelectorAll('dialog.modal').forEach((dialog) => {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) cerrarModal(dialog.id); });
  });
}

function abrirModal(id) { document.getElementById(id).showModal(); }
function cerrarModal(id) { document.getElementById(id).close(); }

// ---------- Utilidades ----------
function notify(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-message').textContent = message;
  
  if (toast.parentElement !== document.body) {
    document.body.appendChild(toast);
  }
  
  void toast.offsetWidth; // Forzar reflow
  
  toast.className = isError ? 'error show' : 'show';
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => toast.className = '', 3000);
}

const formatDate = (value) => value ? new Date(value).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '';

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);ce(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
