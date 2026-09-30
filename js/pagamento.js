import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const app = document.querySelector("[data-payment-app]");
const loading = document.querySelector("[data-payment-loading]");
const status = document.querySelector("[data-payment-status]");
const userName = document.querySelector("[data-user-name]");
const userEmail = document.querySelector("[data-user-email]");
const approveButton = document.querySelector("[data-simulate-approved]");
const pendingButton = document.querySelector("[data-simulate-pending]");
const rejectedButton = document.querySelector("[data-simulate-rejected]");
const methods = [...document.querySelectorAll('input[name="metodo_pagamento_teste"]')];

let currentUser = null;
let isProcessing = false;

const setStatus = (message = "", type = "") => {
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
  status.classList.remove("is-loading", "is-success", "is-error", "is-warning");
  if (message && type) status.classList.add(`is-${type}`);
};

const setBusy = (busy) => {
  isProcessing = busy;
  [approveButton, pendingButton, rejectedButton].forEach((button) => {
    if (button) button.disabled = busy;
  });
};

const getSelectedMethod = () => methods.find((input) => input.checked)?.value || "pix";

const saveSimulation = async (simulationStatus, allowAccess) => {
  if (!currentUser || isProcessing) return;
  setBusy(true);

  const messages = {
    aprovado: ["Registrando pagamento aprovado de teste…", "success"],
    pendente: ["Registrando pagamento pendente de teste…", "warning"],
    recusado: ["Registrando pagamento recusado de teste…", "error"]
  };

  setStatus(messages[simulationStatus]?.[0] || "Atualizando simulação…", "loading");

  try {
    await setDoc(doc(db, "perfis", currentUser.uid), {
      pagamento_teste_status: simulationStatus,
      pagamento_teste_metodo: getSelectedMethod(),
      pagamento_teste_valor: 29.9,
      pagamento_teste_moeda: "BRL",
      acesso_teste: Boolean(allowAccess),
      ambiente_pagamento: "simulacao",
      pagamento_teste_atualizado_em: serverTimestamp()
    }, { merge: true });

    if (allowAccess) {
      setStatus("Pagamento de teste aprovado. Liberando o portal…", "success");
      window.setTimeout(() => {
        window.location.href = "./portal.html";
      }, 650);
      return;
    }

    if (simulationStatus === "pendente") {
      setStatus("Pagamento marcado como pendente. O portal continua bloqueado neste cenário de teste.", "warning");
    } else {
      setStatus("Pagamento marcado como recusado. O portal continua bloqueado neste cenário de teste.", "error");
    }
  } catch (error) {
    console.error("Erro ao registrar pagamento de teste:", error);
    setStatus("Não foi possível salvar a simulação. Verifique sua conexão e tente novamente.", "error");
  } finally {
    if (!allowAccess) setBusy(false);
  }
};

methods.forEach((input) => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".payment-method").forEach((item) => item.classList.remove("is-selected"));
    input.closest(".payment-method")?.classList.add("is-selected");
  });
});

approveButton?.addEventListener("click", () => saveSimulation("aprovado", true));
pendingButton?.addEventListener("click", () => saveSimulation("pendente", false));
rejectedButton?.addEventListener("click", () => saveSimulation("recusado", false));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./cadastro.html");
    return;
  }

  currentUser = user;

  try {
    const userSnapshot = await getDoc(doc(db, "usuarios", user.uid));
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const fullName = `${userData.nome || user.displayName || "Usuário"} ${userData.sobrenome || ""}`.trim();

    if (userName) userName.textContent = fullName || "Usuário Active";
    if (userEmail) userEmail.textContent = user.email || "";
  } catch (error) {
    console.warn("Não foi possível carregar os dados básicos do usuário:", error);
    if (userName) userName.textContent = user.displayName || "Usuário Active";
    if (userEmail) userEmail.textContent = user.email || "";
  }

  if (loading) loading.hidden = true;
  if (app) app.hidden = false;
});
