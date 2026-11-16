const form = document.querySelector('form');
const loginResult = document.querySelector('#login-result');
const profileResult = document.querySelector('#profile-result');
const loginButton = form.querySelector('button');
const profileButton = document.querySelector('#profile');
const anonymousButton = document.querySelector('#anonymous');
let token = '';

function setBusy(busy) {
  loginButton.disabled = busy;
  profileButton.disabled = busy || !token;
  anonymousButton.disabled = busy;
}

function show(result, response, message) {
  result.dataset.state = response.ok ? 'success' : 'error';
  result.textContent = response.status + ' ' + response.statusText + ' · ' + message;
}

async function run(result, action) {
  setBusy(true);
  delete result.dataset.state;
  result.textContent = 'Consultando…';
  try {
    await action();
  } catch {
    result.dataset.state = 'error';
    result.textContent = 'No se pudo completar la solicitud.';
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  token = '';
  delete profileResult.dataset.state;
  profileResult.textContent = 'Consulta el perfil para ver la respuesta de la API.';
  const credentials = Object.fromEntries(new FormData(form));
  run(loginResult, async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const body = await response.json();
    if (response.ok) {
      token = body.access_token;
      form.elements.password.value = '';
    }
    show(loginResult, response, response.ok
      ? 'JWT emitido · Bearer · ' + body.expires_in / 60 + ' min de vigencia'
      : body.error);
  });
});

function loadProfile(useToken) {
  run(profileResult, async () => {
    const headers = useToken ? { Authorization: 'Bearer ' + token } : {};
    const response = await fetch('/api/profile', { headers });
    const body = await response.json();
    if (useToken && response.status === 401) {
      token = '';
      loginResult.textContent = 'Vuelve a iniciar sesión para obtener un JWT.';
      delete loginResult.dataset.state;
    }
    show(profileResult, response, response.ok ? body.message + ' ' + body.email : body.error);
  });
}

profileButton.addEventListener('click', () => loadProfile(true));
anonymousButton.addEventListener('click', () => loadProfile(false));
