import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const app = document.querySelector("[data-rotina-app]");
const loading = document.querySelector("[data-rotina-loading]");
const logoutButton = document.querySelector("[data-logout]");
const form = document.querySelector("[data-rotina-form]");
const saveButton = document.querySelector("[data-save-profile]");
const saveStatus = document.querySelector("[data-save-status]");
const goalError = document.querySelector("[data-goal-error]");

let currentUser = null;
let userData = {};
let profileData = {};

const labels = {
  nivel_atividade: {
    pouco_ativo: "Pouco ativo",
    algumas_vezes_semana: "Algumas vezes por semana",
    ativo_frequente: "Ativo com frequência",
    muito_ativo: "Muito ativo"
  },
  nivel_exercicio: {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    experiente: "Experiente"
  },
  dias_exercicio: {
    "1_2": "1–2 dias por semana",
    "3_4": "3–4 dias por semana",
    "5_mais": "5 ou mais dias por semana"
  },
  duracao_treino: {
    ate_15: "Até 15 min",
    "15_30": "15–30 min",
    "30_45": "30–45 min",
    mais_45: "Mais de 45 min"
  },
  perfil_alimentar: {
    variada: "Variada",
    vegetariana: "Vegetariana",
    vegana: "Vegana",
    outra: "Outra"
  },
  tempo_preparo: {
    ate_15: "Até 15 min",
    "15_30": "15–30 min",
    "30_60": "30–60 min"
  },
  objetivos: {
    movimentar_mais: "Me movimentar mais",
    condicionamento: "Melhorar meu condicionamento",
    constancia_exercicios: "Criar constância nos exercícios",
    organizar_alimentacao: "Organizar melhor a alimentação",
    receitas_praticas: "Aprender receitas práticas",
    variar_refeicoes: "Ter mais variedade nas refeições",
    rotina_organizada: "Criar uma rotina mais organizada",
    bem_estar: "Melhorar hábitos de bem-estar"
  }
};

const format = (group, value) => labels[group]?.[value] || value || "Não informado";
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || "Não informado";
};

const checkedValues = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);

const setCheckedValues = (name, values) => {
  const selected = new Set(list(values));
  form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = selected.has(input.value);
  });
};

const setStatus = (message = "", type = "") => {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.className = "rotina-save-status";
  if (type) saveStatus.classList.add(`is-${type}`);
};

const renderSummary = (profile) => {
  setText("[data-summary-activity]", format("nivel_atividade", profile.nivel_atividade));
  setText("[data-summary-days]", format("dias_exercicio", profile.dias_exercicio));
  setText("[data-summary-level]", format("nivel_exercicio", profile.nivel_exercicio));
  setText("[data-summary-duration]", format("duracao_treino", profile.duracao_treino));
  setText("[data-summary-food]", format("perfil_alimentar", profile.perfil_alimentar));
  setText("[data-summary-prep]", format("tempo_preparo", profile.tempo_preparo));

  const goals = list(profile.objetivos)
    .slice(0, 3)
    .map((value) => format("objetivos", value));
  setText("[data-summary-goals]", goals.join(" • ") || "Não informado");
};

const fillForm = (profile) => {
  const directFields = [
    "altura",
    "peso",
    "nivel_atividade",
    "nivel_exercicio",
    "dias_exercicio",
    "duracao_treino",
    "local_exercicio",
    "exercicios_evitar",
    "perfil_alimentar",
    "tempo_preparo",
    "alimentos_evitar",
    "restricoes_alimentares"
  ];

  directFields.forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field || field instanceof RadioNodeList) return;
    field.value = profile[name] ?? "";
  });

  setCheckedValues("equipamentos", profile.equipamentos);
  setCheckedValues("objetivos", profile.objetivos);
  setCheckedValues("interesses_alimentares", profile.interesses_alimentares);
};

const validate = () => {
  if (!form.reportValidity()) return false;

  const goals = checkedValues("objetivos");
  if (!goals.length || goals.length > 3) {
    if (goalError) {
      goalError.hidden = false;
      goalError.textContent = goals.length ? "Escolha no máximo 3 objetivos." : "Escolha pelo menos 1 objetivo.";
    }
    return false;
  }

  if (goalError) goalError.hidden = true;

  const heightValue = form.elements.altura.value.trim();
  if (heightValue) {
    const height = Number(heightValue);
    if (!Number.isFinite(height) || height < 80 || height > 230) {
      form.elements.altura.focus();
      setStatus("Informe uma altura entre 80 e 230 cm.", "error");
      return false;
    }
  }

  const weightValue = form.elements.peso.value.trim();
  if (weightValue) {
    const weight = Number(weightValue);
    if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
      form.elements.peso.focus();
      setStatus("Confira o valor informado no peso.", "error");
      return false;
    }
  }

  return true;
};

const buildPayload = () => ({
  altura: form.elements.altura.value ? Number(form.elements.altura.value) : null,
  peso: form.elements.peso.value ? Number(form.elements.peso.value) : null,
  nivel_atividade: form.elements.nivel_atividade.value,
  objetivos: checkedValues("objetivos"),
  nivel_exercicio: form.elements.nivel_exercicio.value,
  dias_exercicio: form.elements.dias_exercicio.value,
  duracao_treino: form.elements.duracao_treino.value,
  local_exercicio: form.elements.local_exercicio.value,
  equipamentos: checkedValues("equipamentos"),
  exercicios_evitar: form.elements.exercicios_evitar.value.trim(),
  perfil_alimentar: form.elements.perfil_alimentar.value,
  interesses_alimentares: checkedValues("interesses_alimentares"),
  tempo_preparo: form.elements.tempo_preparo.value,
  alimentos_evitar: form.elements.alimentos_evitar.value.trim(),
  restricoes_alimentares: form.elements.restricoes_alimentares.value.trim(),
  atualizado_em: serverTimestamp()
});

form?.querySelectorAll('input[name="objetivos"]').forEach((input) => {
  input.addEventListener("change", () => {
    const checked = checkedValues("objetivos");
    if (checked.length > 3) {
      input.checked = false;
      if (goalError) {
        goalError.hidden = false;
        goalError.textContent = "Escolha no máximo 3 objetivos.";
      }
      return;
    }
    if (goalError) goalError.hidden = checked.length > 0;
  });
});

form?.querySelectorAll('input[name="equipamentos"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "nenhum" && input.checked) {
      form.querySelectorAll('input[name="equipamentos"]').forEach((other) => {
        if (other !== input) other.checked = false;
      });
      return;
    }
    if (input.checked) {
      const none = form.querySelector('input[name="equipamentos"][value="nenhum"]');
      if (none) none.checked = false;
    }
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !validate()) return;

  saveButton.disabled = true;
  setStatus("Salvando suas alterações…");

  try {
    const payload = buildPayload();
    await updateDoc(doc(db, "perfis", currentUser.uid), payload);
    profileData = { ...profileData, ...payload };
    renderSummary(profileData);
    setStatus("Alterações salvas. As recomendações do portal já podem usar o novo perfil.", "success");
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    setStatus("Não foi possível salvar agora. Tente novamente.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.replace("./index.html?login=1");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./index.html?login=1");
    return;
  }

  currentUser = user;

  try {
    const [userSnapshot, profileSnapshot] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid))
    ]);

    userData = userSnapshot.exists() ? userSnapshot.data() : {};
    profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};

    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      window.location.replace("./pagamento.html");
      return;
    }

    const name = userData.nome || user.displayName?.split(/\s+/)[0] || "Usuário";
    setText("[data-user-name]", name);
    setText(
      "[data-profile-state]",
      productionAccess ? "Acesso ativo • perfil sincronizado" : "Ambiente de desenvolvimento • perfil sincronizado"
    );

    fillForm(profileData);
    renderSummary(profileData);

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar Minha Rotina:", error);
    window.location.replace("./portal.html");
  }
});
