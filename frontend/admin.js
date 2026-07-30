const state = { active: 'hoteles', editingId: null, data: {}, search: '' };

const entities = {
  hoteles: {
    label: 'Hoteles', singular: 'hotel',
    fields: [
      ['nombre', 'Nombre del hotel', 'text'], ['ubicacion', 'Ubicación', 'text'],
      ['estrellas', 'Estrellas', 'number', { min: 1, max: 5 }],
      ['imagenUrl', 'Enlace de imagen', 'url', { required: false }],
    ],
    summary: (x) => [x.ubicacion, `${x.estrellas} estrellas`, x.imagenUrl ? 'Imagen configurada' : 'Sin imagen'],
  },
  habitaciones: {
    label: 'Habitaciones', singular: 'habitación',
    fields: [
      ['hotelId', 'Hotel al que pertenece', 'select', { source: 'hoteles' }],
      ['ubicacionHotel', 'Ubicación del hotel', 'hotel-location'],
      ['tipo', 'Tipo de habitación', 'text'], ['numero', 'Número de habitación', 'number', { min: 1 }],
      ['precio', 'Precio por noche', 'number', { min: 0, step: '0.01' }],
      ['disponibilidad', 'Disponible para reservar', 'checkbox'],
    ],
    summary: (x) => [hotelName(x.hotelId), `${x.tipo} #${x.numero ?? 'sin número'}`, `$${x.precio ?? 0} por noche`, x.disponibilidad === true ? 'Disponible' : 'No disponible'],
  },
  clientes: {
    label: 'Clientes', singular: 'cliente',
    fields: [
      ['nombre', 'Nombre completo', 'text'], ['email', 'Correo electrónico', 'email'], ['password', 'Contraseña', 'password'],
      ['rol', 'Rol', 'select', { options: [['cliente', 'Cliente'], ['admin', 'Administrador']] }],
    ],
    summary: (x) => [x.email, `Rol: ${x.rol || 'cliente'}`],
  },
  reservaciones: {
    label: 'Reservaciones', singular: 'reservación',
    fields: [
      ['hotelId', 'Hotel', 'select', { source: 'hoteles' }],
      ['habitacionId', 'Habitación', 'select', { source: 'habitaciones' }],
      ['clienteId', 'Cliente', 'select', { source: 'clientes' }],
      ['fechaEntrada', 'Fecha de entrada', 'date'], ['fechaSalida', 'Fecha de salida', 'date'],
      ['numeroPersonas', 'Número de personas', 'number', { min: 1 }],
    ],
    summary: (x) => [hotelName(x.hotelId), roomName(x.habitacionId), clientName(x.clienteId), `${formatDate(x.fechaEntrada)} — ${formatDate(x.fechaSalida)}`, `${x.numeroPersonas} personas`, `Estado: ${x.estado || 'activa'}`],
  },
  comentarios: {
    label: 'Comentarios', singular: 'comentario',
    fields: [
      ['hotelId', 'Hotel', 'select', { source: 'hoteles' }], ['clienteId', 'Cliente', 'select', { source: 'clientes' }],
      ['comentario', 'Comentario', 'textarea'], ['calificacion', 'Calificación (1-5)', 'number', { min: 1, max: 5 }],
    ],
    summary: (x) => [hotelName(x.hotelId), clientName(x.clienteId), `★ ${x.calificacion}/5`, x.comentario],
  },
};

const $ = (selector) => document.querySelector(selector);
const idOf = (value) => typeof value === 'object' && value ? value._id : value;
const findById = (resource, value) => state.data[resource]?.find((item) => item._id === idOf(value));
const hotelName = (value) => typeof value === 'object' ? value.nombre : (findById('hoteles', value)?.nombre || 'Hotel no disponible');
const roomName = (value) => typeof value === 'object' ? `${value.tipo} · $${value.precio}` : (() => { const room = findById('habitaciones', value); return room ? `${room.tipo} · $${room.precio}` : 'Habitación no disponible'; })();
const clientName = (value) => typeof value === 'object' ? value.nombre : (findById('clientes', value)?.nombre || 'Cliente no disponible');
const formatDate = (value) => value ? new Date(value).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '';
const escapeHtml = (text) => String(text ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

async function loadData() {
  try {
    const names = Object.keys(entities);
    const results = await Promise.all(names.map((name) => api.get(name)));
    state.data = Object.fromEntries(names.map((name, index) => [name, results[index]]));
    render();
  } catch (error) { notify(`No se pudo conectar con la API: ${error.message}`, true); }
}

function render() { renderStats(); renderTabs(); renderForm(); renderList(); }

function renderStats() {
  $('#stats').innerHTML = Object.entries(entities).map(([key, entity]) =>
    `<article class="stat"><strong>${state.data[key]?.length ?? 0}</strong><span>${entity.label}</span></article>`).join('');
}

function renderTabs() {
  $('#tabs').innerHTML = Object.entries(entities).map(([key, entity]) =>
    `<button class="tab ${key === state.active ? 'active' : ''}" data-tab="${key}">${entity.label}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach((button) => button.onclick = () => {
    state.active = button.dataset.tab; state.editingId = null; render();
  });
}

function renderForm() {
  const entity = entities[state.active];
  const record = state.editingId ? findById(state.active, state.editingId) : null;
  $('#form-title').textContent = `${record ? 'Editar' : 'Agregar'} ${entity.singular}`;
  $('#form-help').textContent = state.active === 'reservaciones' ? 'La habitación debe pertenecer al hotel seleccionado.' : 'Todos los campos son obligatorios.';
  $('#entity-form').innerHTML = entity.fields.map(([name, label, type, attrs = {}]) => fieldHtml(name, label, type, attrs, record)).join('') +
    `<div class="buttons"><button class="btn btn-primary w-100" type="submit">${record ? 'Guardar cambios' : 'Guardar registro'}</button>${record ? '<button class="btn btn-secondary w-100" type="button" id="cancel-edit">Cancelar</button>' : ''}</div>`;
  $('#entity-form').onsubmit = saveRecord;
  if (state.active === 'habitaciones') {
    $('#entity-form').hotelId.addEventListener('change', actualizarUbicacionHotel);
  }
  $('#cancel-edit')?.addEventListener('click', () => { state.editingId = null; render(); });
}

function fieldHtml(name, label, type, attrs, record) {
  const value = idOf(record?.[name]) ?? '';
  if (type === 'hotel-location') {
    const hotel = findById('hoteles', record?.hotelId);
    return `<label>${label}<input name="${name}" type="text" value="${escapeHtml(hotel?.ubicacion || '')}" readonly></label>`;
  }
  if (type === 'select') {
    if (attrs.options) {
      return `<label>${label}<select name="${name}" required>${attrs.options.map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}</select></label>`;
    }
    const options = state.data[attrs.source] || [];
    const display = attrs.source === 'hoteles' ? (hotel) => `${hotel.nombre} — ${hotel.ubicacion}` : attrs.source === 'habitaciones' ? roomName : clientName;
    return `<label>${label}<select name="${name}" required><option value="">Selecciona una opción</option>${options.map((item) => `<option value="${item._id}" ${item._id === value ? 'selected' : ''}>${escapeHtml(display(item))}</option>`).join('')}</select></label>`;
  }
  if (type === 'textarea') return `<label>${label}<textarea name="${name}" required>${escapeHtml(value)}</textarea></label>`;
  if (type === 'checkbox') return `<label><span>${label}</span><select name="${name}" required><option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Sí</option><option value="false" ${value === false || value === 'false' ? 'selected' : ''}>No</option></select></label>`;
  const shownValue = type === 'date' && value ? String(value).slice(0, 10) : value;
  const extra = Object.entries(attrs).filter(([key]) => key !== 'required').map(([key, val]) => `${key}="${val}"`).join(' ');
  const required = attrs.required === false || (type === 'password' && state.editingId) ? '' : 'required';
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(shownValue)}" ${extra} ${required}></label>`;
}

function actualizarUbicacionHotel() {
  const form = $('#entity-form');
  const hotel = findById('hoteles', form.hotelId.value);
  form.ubicacionHotel.value = hotel?.ubicacion || '';
}

async function saveRecord(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  delete values.ubicacionHotel;
  if ('disponibilidad' in values) values.disponibilidad = values.disponibilidad === 'true';
  ['estrellas', 'numero', 'precio', 'numeroPersonas', 'calificacion'].forEach((name) => { if (name in values) values[name] = Number(values[name]); });
  if (state.active === 'clientes' && !values.password) delete values.password;
  try {
    if (state.editingId) await api.update(state.active, state.editingId, values);
    else await api.create(state.active, values);
    notify('Registro guardado correctamente'); state.editingId = null; await loadData();
  } catch (error) { notify(error.message, true); }
}

function renderList() {
  const entity = entities[state.active];
  $('#list-title').textContent = entity.label;
  const items = (state.data[state.active] || []).filter(coincideBusqueda);
  if (state.active === 'habitaciones') {
    renderHabitacionesAgrupadas(items);
    return;
  }
  $('#entity-list').innerHTML = items.length ? items.map((item) => {
    const title = state.active === 'habitaciones' ? item.tipo : state.active === 'reservaciones' ? `Reservación ${item._id.slice(-6)}` : state.active === 'comentarios' ? 'Comentario' : item.nombre;
    return `<article class="card"><div><h3>${escapeHtml(title)}</h3><p>${entity.summary(item).filter(Boolean).map(escapeHtml).join('<br>')}</p></div><div class="card-actions"><button class="btn btn-secondary btn-sm" data-edit="${item._id}">Editar</button><button class="btn btn-danger-sm" data-delete="${item._id}">Eliminar</button></div></article>`;
  }).join('') : '<p class="empty">Aún no hay registros en esta colección.</p>';
  document.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => { state.editingId = button.dataset.edit; renderForm(); window.scrollTo({ top: 180, behavior: 'smooth' }); });
  document.querySelectorAll('[data-delete]').forEach((button) => button.onclick = () => deleteRecord(button.dataset.delete));
}

function coincideBusqueda(item) {
  const termino = state.search.trim().toLowerCase();
  if (!termino) return true;
  const hotel = state.active === 'habitaciones' ? findById('hoteles', item.hotelId) : null;
  return [item.nombre, item.ubicacion, item.tipo, item.numero, item.email, hotel?.nombre, hotel?.ubicacion]
    .some((valor) => String(valor ?? '').toLowerCase().includes(termino));
}

function renderHabitacionesAgrupadas(habitaciones) {
  const grupos = habitaciones.reduce((resultado, habitacion) => {
    const hotel = findById('hoteles', habitacion.hotelId);
    const clave = `${idOf(habitacion.hotelId)}-${habitacion.tipo}`;
    if (!resultado[clave]) resultado[clave] = { hotel, tipo: habitacion.tipo, habitaciones: [] };
    resultado[clave].habitaciones.push(habitacion);
    return resultado;
  }, {});

  $('#entity-list').innerHTML = habitaciones.length ? Object.values(grupos).map((grupo) => `
    <article class="card">
      <div>
        <h3>${escapeHtml(grupo.hotel?.nombre || 'Hotel no disponible')} · ${escapeHtml(grupo.tipo)}</h3>
        <p>${escapeHtml(grupo.hotel?.ubicacion || '')}<br>${grupo.habitaciones.length} habitación(es) de este tipo</p>
        ${grupo.habitaciones.sort((a, b) => a.numero - b.numero).map((habitacion) => `
          <div class="card-actions" style="margin-top: 8px; justify-content: flex-start;">
            <span>Habitación #${escapeHtml(habitacion.numero)} · $${escapeHtml(habitacion.precio)} · ${habitacion.disponibilidad === true ? 'Disponible' : 'No disponible'}</span>
            <button class="btn btn-secondary btn-sm" data-edit="${habitacion._id}">Editar</button>
            <button class="btn btn-danger-sm" data-delete="${habitacion._id}">Eliminar</button>
          </div>`).join('')}
      </div>
    </article>`).join('') : '<p class="empty">Aún no hay habitaciones registradas.</p>';
  document.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => { state.editingId = button.dataset.edit; renderForm(); window.scrollTo({ top: 180, behavior: 'smooth' }); });
  document.querySelectorAll('[data-delete]').forEach((button) => button.onclick = () => deleteRecord(button.dataset.delete));
}

async function deleteRecord(id) {
  if (!confirm('¿Deseas eliminar este registro?')) return;
  try { await api.remove(state.active, id); notify('Registro eliminado'); await loadData(); }
  catch (error) { notify(error.message, true); }
}

function notify(message, isError = false) {
  const toast = $('#toast');
  const span = toast.querySelector('.toast-message');
  if (span) span.textContent = message;
  else toast.textContent = message;
  toast.className = `show ${isError ? 'error' : ''}`;
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => { toast.className = ''; }, 3500);
}

$('#list-search').addEventListener('input', (event) => { state.search = event.target.value; renderList(); });
loadData();
