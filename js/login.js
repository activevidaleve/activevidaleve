import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const form = document.querySelector("[data-login-form]");
const googleButton = document.querySelector("[data-login-google]");
const submitButton = document.querySelector("[data-login-submit]");
const forgotButton = document.querySelector("[data-forgot-password]");
const passwordToggle = document.querySelector("[data-password-toggle]");
const status = document.querySelector("[data-login-status]");
const emailInput = form?.elements?.email;
const passwordInput = form?.elements?.senha;
const rememberInput = form?.elements?.lembrar;
const loginModeButtons = [...document.querySelectorAll("[data-login-mode]")];
const identifierLabel = document.querySelector("[data-login-identifier-label]");
const identifierInput = document.querySelector("[data-login-identifier]");
const passwordField = document.querySelector("[data-password-field]");
const emailOptions = document.querySelector("[data-email-options]");

let loginMode = "email";
let isBusy = false;
let initialAuthResolved = false;

const setStatus = (message = "", type = "") => {
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
  status.classList.remove("is-loading", "is-success", "is-error");
  if (message && type) status.classList.add(`is-${type}`);
};

const setError = (field, message = "") => {
  const element = document.querySelector(`[data-error-for="${field}"]`);
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

  loginModeButtons.forEach((button) => {
    const active = button.dataset.loginMode === loginMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (identifierLabel) identifierLabel.textContent = loginMode === "phone" ? "Número de celular" : "E-mail";

  if (identifierInput) {
    identifierInput.value = "";
    identifierInput.type = loginMode === "phone" ? "tel" : "email";
    identifierInput.inputMode = loginMode === "phone" ? "tel" : "email";
    identifierInput.autocomplete = loginMode === "phone" ? "tel" : "email";
    identifierInput.placeholder = loginMode === "phone" ? "(31) 99999-9999" : "voce@exemplo.com";
  }

  if (passwordField) passwordField.hidden = loginMode === "phone";
  if (emailOptions) emailOptions.hidden = loginMode === "phone";
  if (submitButton) submitButton.textContent = loginMode === "phone" ? "Continuar com celular" : "Entrar";
};

const setBusy = (busy) => {
  isBusy = busy;
  if (submitButton) submitButton.disabled = busy;
  if (googleButton) googleButton.disabled = busy;
  if (forgotButton) forgotButton.disabled = busy;
};

const validate = () => {
  clearErrors();
  let valid = true;
  const email = emailInput?.value?.trim() || "";
  const password = passwordInput?.value || "";

  if (loginMode === "phone") {
    const digits = email.replace(/\D/g, "");
    if (!digits) {
      setError("email", "Informe seu número de celular.");
      valid = false;
    } else if (digits.length < 10) {
      setError("email", "Informe um número de celular válido.");
      valid = false;
    }
    return valid;
  }

  if (!email) {
    setError("email", "Informe seu e-mail.");
    valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    setError("email", "Informe um e-mail válido.");
    valid = false;
  }

  if (!password) {
    setError("senha", "Informe sua senha.");
    valid = false;
  }

  return valid;
};

const resolveDestination = async (user) => {
  const [userSnapshot, profileSnapshot] = await Promise.all([
    getDoc(doc(db, "usuarios", user.uid)),
    getDoc(doc(db, "perfis", user.uid))
  ]);

  if (!userSnapshot.exists()) {
    return "./cadastro.html";
  }

  const userData = userSnapshot.data();
  const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
  const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
  const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

  if (productionAccess || testAccess) return "./portal.html";
  return "./pagamento.html";
};

const continueAfterLogin = async (user) => {
  setStatus("Conta validada. Abrindo seu acesso…", "success");
  const destination = await resolveDestination(user);
  window.location.replace(destination);
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isBusy || !validate()) return;

  if (loginMode === "phone") {
    setStatus("O login por celular está pronto visualmente e será conectado ao Firebase na próxima etapa.", "loading");
    return;
  }

  setBusy(true);
  setStatus("Entrando na sua conta…", "loading");

  try {
    await setPersistence(auth, rememberInput?.checked ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
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

googleButton?.addEventListener("click", async () => {
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

loginModeButtons.forEach((button) => {
  button.addEventListener("click", () => applyLoginMode(button.dataset.loginMode));
});

identifierInput?.addEventListener("input", () => {
  if (loginMode === "phone") {
    identifierInput.value = formatPhone(identifierInput.value);
  }
});

forgotButton?.addEventListener("click", async () => {
  if (isBusy) return;
  const email = emailInput?.value?.trim() || "";
  clearErrors();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    setError("email", "Digite seu e-mail acima para recuperar a senha.");
    emailInput?.focus();
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

passwordToggle?.addEventListener("click", () => {
  if (!passwordInput) return;
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Mostrar" : "Ocultar";
  passwordToggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
});

form?.addEventListener("input", (event) => {
  if (event.target?.name) setError(event.target.name);
});

applyLoginMode("email");

onAuthStateChanged(auth, async (user) => {
  if (!initialAuthResolved) {
    initialAuthResolved = true;
    if (!user) return;

    try {
      setBusy(true);
      setStatus("Conta já conectada. Abrindo seu acesso…", "loading");
      await continueAfterLogin(user);
    } catch (error) {
      console.warn("Não foi possível redirecionar a sessão existente:", error);
      setBusy(false);
      setStatus("");
    }
  }
});
