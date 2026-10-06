import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "../js/firebase.js";

const modalMarkup = `
  <div class="login-modal" data-login-modal hidden>
    <button class="login-modal-backdrop" type="button" data-login-modal-close aria-label="Fechar login"></button>
    <section class="login-modal-panel" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div class="login-modal-content">
      <button class="login-modal-close" type="button" data-login-modal-close aria-label="Fechar login">×</button>

      <div class="login-modal-hero">
        <picture class="login-modal-hero-media" aria-hidden="true">
          <source media="(max-width: 900px)" srcset="./assets/images/login/login-hero-mobile.webp">
          <img src="./assets/images/login/login-hero-desktop.webp" alt="" loading="eager" decoding="async">
        </picture>
        <div class="login-modal-hero-copy">
          <h2 id="login-modal-title">Entrar no Active Vida Leve</h2>
          <p>Escolha uma das opções abaixo para continuar.</p>
        </div>
      </div>

      <button class="login-modal-google" type="button" data-login-modal-google>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.42h5.52a4.77 4.77 0 0 1-2.05 3.04l-.02.11 2.98 2.31.21.02c1.92-1.77 2.96-4.38 2.96-7.12Z"/>
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.43l-3.17-2.44c-.85.58-2 .98-3.45.98-2.6 0-4.8-1.76-5.59-4.19l-.1.01-3.1 2.4-.04.09A10 10 0 0 0 12 22Z"/>
          <path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.92l-.01-.13-3.14-2.44-.1.05A10 10 0 0 0 2 12c0 1.6.38 3.12 1.17 4.44l3.24-2.52Z"/>
          <path fill="#EA4335" d="M12 5.89c1.88 0 3.15.81 3.88 1.48l2.8-2.73C16.96 3.03 14.7 2 12 2a10 10 0 0 0-8.83 5.56l3.23 2.52C7.2 7.65 9.4 5.9 12 5.9Z"/>
        </svg>
        <span>Continuar com Google</span>
      </button>

      <div class="login-modal-divider"><span>ou use seu e-mail ou celular</span></div>

      <div class="login-modal-methods" role="group" aria-label="Escolha como entrar">
        <button class="is-active" type="button" data-login-modal-mode="email" aria-pressed="true">E-mail</button>
        <button type="button" data-login-modal-mode="phone" aria-pressed="false">Celular</button>
      </div>

      <form class="login-modal-form" data-login-modal-form novalidate>
        <label class="login-modal-field">
          <span data-login-modal-identifier-label>E-mail</span>
          <input type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com" required data-login-modal-identifier>
          <small class="login-modal-error" data-login-modal-error="email"></small>
        </label>

        <label class="login-modal-field" data-login-modal-password-field>
          <span>Senha</span>
          <div class="login-modal-password-wrap">
            <input type="password" name="senha" autocomplete="current-password" placeholder="Digite sua senha" required>
            <button class="login-modal-password-toggle" type="button" data-login-modal-password-toggle aria-label="Mostrar senha">Mostrar</button>
          </div>
          <small class="login-modal-error" data-login-modal-error="senha"></small>
        </label>

        <div class="login-modal-options" data-login-modal-email-options>
          <label class="login-modal-remember">
            <input type="checkbox" name="lembrar" checked>
            <span>Manter conectado</span>
          </label>
          <button class="login-modal-forgot" type="button" data-login-modal-forgot>Esqueci minha senha</button>
        </div>

        <button class="login-modal-submit" type="submit" data-login-modal-submit>Entrar</button>
        <div class="login-modal-status" data-login-modal-status hidden role="status" aria-live="polite"></div>
      </form>

      <div class="login-modal-account-note">
        <span>Novo por aqui?</span>
        <a href="./cadastro.html">Criar minha conta</a>
      </div>
      </div>
    </section>
  </div>`;

document.body.insertAdjacentHTML("beforeend", modalMarkup);

const modal = document.querySelector("[data-login-modal]");
const panel = modal?.querySelector(".login-modal-panel");
const openButtons = [...document.querySelectorAll("[data-login-modal-open]")];
const closeButtons = [...modal.querySelectorAll("[data-login-modal-close]")];
const form = modal.querySelector("[data-login-modal-form]");
const googleButton = modal.querySelector("[data-login-modal-google]");
const submitButton = modal.querySelector("[data-login-modal-submit]");
const forgotButton = modal.querySelector("[data-login-modal-forgot]");
const passwordToggle = modal.querySelector("[data-login-modal-password-toggle]");
const status = modal.querySelector("[data-login-modal-status]");
const identifierInput = modal.querySelector("[data-login-modal-identifier]");
const identifierLabel = modal.querySelector("[data-login-modal-identifier-label]");
const passwordField = modal.querySelector("[data-login-modal-password-field]");
const emailOptions = modal.querySelector("[data-login-modal-email-options]");
const modeButtons = [...modal.querySelectorAll("[data-login-modal-mode]")];
const passwordInput = form.elements.senha;
const rememberInput = form.elements.lembrar;

let loginMode = "email";
let isBusy = false;
let lastFocused = null;

const setStatus = (message = "", type = "") => {
  status.hidden = !message;
  status.textContent = message;
  status.classList.remove("is-loading", "is-success", "is-error");
  if (message && type) status.classList.add(`is-${type}`);
};

const setError = (field, message = "") => {
  const element = modal.querySelector(`[data-login-modal-error="${field}"]`);
  if (element) element.textContent = message;
};

const clearErrors = () => {
  setError("email");
  setError("senha");
};

const formatPhone = (value = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const applyLoginMode = (mode) => {
  loginMode = mode === "phone" ? "phone" : "email";
  clearErrors();
  setStatus("");

  modeButtons.forEach((button) => {
    const active = button.dataset.loginModalMode === loginMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  identifierLabel.textContent = loginMode === "phone" ? "Número de celular" : "E-mail";
  identifierInput.value = "";
  identifierInput.type = loginMode === "phone" ? "tel" : "email";
  identifierInput.inputMode = loginMode === "phone" ? "tel" : "email";
  identifierInput.autocomplete = loginMode === "phone" ? "tel" : "email";
  identifierInput.placeholder = loginMode === "phone" ? "(31) 99999-9999" : "voce@exemplo.com";
  passwordField.hidden = loginMode === "phone";
  emailOptions.hidden = loginMode === "phone";
  submitButton.textContent = loginMode === "phone" ? "Continuar com celular" : "Entrar";
};

const setBusy = (busy) => {
  isBusy = busy;
  submitButton.disabled = busy;
  googleButton.disabled = busy;
  forgotButton.disabled = busy;
};

const resolveDestination = async (user) => {
  const [userSnapshot, profileSnapshot] = await Promise.all([
    getDoc(doc(db, "usuarios", user.uid)),
    getDoc(doc(db, "perfis", user.uid))
  ]);

  if (!userSnapshot.exists()) return "./cadastro.html";

  const userData = userSnapshot.data();
  const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
  const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
  const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

  return productionAccess || testAccess ? "./portal.html" : "./pagamento.html";
};

const continueAfterLogin = async (user) => {
  setStatus("Conta validada. Abrindo seu acesso…", "success");
  const destination = await resolveDestination(user);
  window.location.assign(destination);
};

const validate = () => {
  clearErrors();
  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;
  let valid = true;

  if (loginMode === "phone") {
    const digits = identifier.replace(/\D/g, "");
    if (!digits) {
      setError("email", "Informe seu número de celular.");
      valid = false;
    } else if (digits.length < 10) {
      setError("email", "Informe um número de celular válido.");
      valid = false;
    }
    return valid;
  }

  if (!identifier) {
    setError("email", "Informe seu e-mail.");
    valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(identifier)) {
    setError("email", "Informe um e-mail válido.");
    valid = false;
  }

  if (!password) {
    setError("senha", "Informe sua senha.");
    valid = false;
  }

  return valid;
};

const openModal = (trigger) => {
  lastFocused = trigger || document.activeElement;
  modal.hidden = false;
  document.body.classList.add("login-modal-open");
  requestAnimationFrame(() => identifierInput.focus());
};

const closeModal = () => {
  if (isBusy) return;
  modal.hidden = true;
  document.body.classList.remove("login-modal-open");
  setStatus("");
  clearErrors();
  lastFocused?.focus?.();
};

openButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(button);
  });
});

closeButtons.forEach((button) => button.addEventListener("click", closeModal));

document.addEventListener("keydown", (event) => {
  if (modal.hidden) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    const focusable = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')]
      .filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => applyLoginMode(button.dataset.loginModalMode));
});

identifierInput.addEventListener("input", () => {
  setError("email");
  if (loginMode === "phone") identifierInput.value = formatPhone(identifierInput.value);
});

passwordInput.addEventListener("input", () => setError("senha"));

passwordToggle.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Mostrar" : "Ocultar";
  passwordToggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isBusy || !validate()) return;

  if (loginMode === "phone") {
    setStatus("O login por celular será conectado ao Firebase na próxima etapa.", "loading");
    return;
  }

  setBusy(true);
  setStatus("Entrando na sua conta…", "loading");

  try {
    await setPersistence(auth, rememberInput.checked ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, identifierInput.value.trim(), passwordInput.value);
    await continueAfterLogin(credential.user);
  } catch (error) {
    console.error("Erro no login por e-mail:", error);
    const messages = {
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/invalid-email": "O e-mail informado não é válido.",
      "auth/user-disabled": "Esta conta está desativada.",
      "auth/too-many-requests": "Muitas tentativas em sequência. Aguarde um pouco e tente novamente.",
      "auth/network-request-failed": "Não foi possível conectar ao Firebase. Confira sua internet e tente novamente."
    };
    setStatus(messages[error?.code] || "Não foi possível entrar agora. Tente novamente.", "error");
    setBusy(false);
  }
});

googleButton.addEventListener("click", async () => {
  if (isBusy) return;
  setBusy(true);
  setStatus("Abrindo sua conta Google…", "loading");

  try {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    await continueAfterLogin(result.user);
  } catch (error) {
    console.error("Erro no login com Google:", error);
    const messages = {
      "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase Authentication.",
      "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.",
      "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o acesso.",
      "auth/network-request-failed": "Não foi possível conectar ao Google agora. Tente novamente."
    };
    setStatus(messages[error?.code] || "Não foi possível entrar com Google agora.", "error");
    setBusy(false);
  }
});

forgotButton.addEventListener("click", async () => {
  if (isBusy) return;
  const email = identifierInput.value.trim();
  clearErrors();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    setError("email", "Digite seu e-mail acima para recuperar a senha.");
    identifierInput.focus();
    return;
  }

  setBusy(true);
  setStatus("Enviando instruções de recuperação…", "loading");

  try {
    await sendPasswordResetEmail(auth, email);
    setStatus("Enviamos um e-mail com as instruções para redefinir sua senha.", "success");
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error);
    const messages = {
      "auth/invalid-email": "O e-mail informado não é válido.",
      "auth/too-many-requests": "Muitas solicitações em sequência. Aguarde um pouco e tente novamente.",
      "auth/network-request-failed": "Não foi possível conectar ao Firebase agora."
    };
    setStatus(messages[error?.code] || "Não foi possível enviar a recuperação de senha agora.", "error");
  } finally {
    setBusy(false);
  }
});

applyLoginMode("email");
