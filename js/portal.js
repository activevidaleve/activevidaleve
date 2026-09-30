import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const app = document.querySelector("[data-portal-app]");
const loading = document.querySelector("[data-portal-loading]");
const logoutButton = document.querySelector("[data-logout]");
const firstName = document.querySelector("[data-user-first-name]");
const accessDescription = document.querySelector("[data-access-description]");

const mappings = {
  nivel_exercicio: {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    experiente: "Experiente"
  },
  dias_exercicio: {
    "1_2": "1–2 dias/semana",
    "3_4": "3–4 dias/semana",
    "5_mais": "5+ dias/semana"
  },
  duracao_treino: {
    ate_15: "Até 15 min",
    "15_30": "15–30 min",
    "30_45": "30–45 min",
    mais_45: "45+ min"
  },
  perfil_alimentar: {
    variada: "Variada",
    vegetariana: "Vegetariana",
    vegana: "Vegana",
    outra: "Outra"
  }
};

const mapped = (field, value) => mappings[field]?.[value] || value || "Não informado";

const redirectToPayment = () => {
  window.location.replace("./pagamento.html");
};

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.replace("./login.html");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  try {
    const [userSnapshot, profileSnapshot] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid))
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      redirectToPayment();
      return;
    }

    const name = userData.nome || user.displayName?.split(/\s+/)[0] || "Usuário";
    if (firstName) firstName.textContent = name;

    if (accessDescription) {
      accessDescription.textContent = productionAccess
        ? "Pagamento confirmado e acesso ativo"
        : "Pagamento simulado aprovado";
    }

    const profileBindings = {
      "[data-profile-level]": mapped("nivel_exercicio", profileData.nivel_exercicio),
      "[data-profile-days]": mapped("dias_exercicio", profileData.dias_exercicio),
      "[data-profile-duration]": mapped("duracao_treino", profileData.duracao_treino),
      "[data-profile-food]": mapped("perfil_alimentar", profileData.perfil_alimentar)
    };

    Object.entries(profileBindings).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    });

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao validar acesso ao portal:", error);
    redirectToPayment();
  }
});
