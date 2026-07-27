const API_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.mensaje || 'No fue posible completar la solicitud');
  }
  return data;
}

const api = {
  get: (resource) => request(`/${resource}`),
  create: (resource, data) => request(`/${resource}`, {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (resource, id, data) => request(`/${resource}/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
};
