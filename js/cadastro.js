import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const form = document.querySelector("#signup-form");

if (form) {
  const steps = [...form.querySelectorAll("[data-step]")];
  const nextButton = form.querySelector("[data-next-step]");
  const previousButton = form.querySelector("[data-prev-step]");
  const actions = form.querySelector("[data-form-actions]");
  const stepLabel = document.querySelector("[data-step-label]");
  const stepName = document.querySelector("[data-step-name]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressDots = [...document.querySelectorAll(".signup-step-dots span")];
  const goalInputs = [...form.querySelectorAll('input[name="objetivos"]')];
  const goalCounter = form.querySelector("[data-goal-count]");
  const paymentButton = form.querySelector("[data-payment-placeholder]");
  const paymentMessage = form.querySelector("[data-payment-message]");
  const firebaseStatus = form.querySelector("[data-firebase-status]");
  const authStatus = form.querySelector("[data-auth-status]");
  const googleButton = form.querySelector("[data-google-auth]");
  const googleAccountState = form.querySelector("[data-google-account-state]");
  const googleAccountEmail = form.querySelector("[data-google-account-email]");
  const passwordFields = [...form.querySelectorAll("[data-password-field]")];
  const ageGuidance = form.querySelector("[data-age-guidance]");
  const birthDateDisplay = form.querySelector("[data-birth-date-display]");
  const birthDatePicker = form.querySelector("[data-birth-date-picker]");
  const birthDateNative = form.querySelector("[data-birth-date-native]");
  const introTitle = document.querySelector("[data-intro-title]");
  const introAccent = document.querySelector("[data-intro-accent]");
  const benefitTitles = [...document.querySelectorAll("[data-benefit-title]")];
  const benefitTexts = [...document.querySelectorAll("[data-benefit-text]")];
  const benefitIcons = [...document.querySelectorAll("[data-benefit-icon]")];

  const benefitIconSvg = {
    user: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
        <path d="M4.75 19.25a7.25 7.25 0 0 1 14.5 0"></path>
      </svg>
    `,
    grid: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.5"></rect>
        <rect x="14" y="4" width="6" height="6" rx="1.5"></rect>
        <rect x="4" y="14" width="6" height="6" rx="1.5"></rect>
        <rect x="14" y="14" width="6" height="6" rx="1.5"></rect>
      </svg>
    `,
    sliders: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16"></path>
        <path d="M4 17h16"></path>
        <circle cx="9" cy="7" r="2"></circle>
        <circle cx="15" cy="17" r="2"></circle>
      </svg>
    `,
    target: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7"></circle>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M15.5 8.5 20 4"></path>
        <path d="M16 4h4v4"></path>
      </svg>
    `,
    searchCheck: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5"></circle>
        <path d="m16 16 4 4"></path>
        <path d="m8.5 10.5 1.5 1.5 3-3"></path>
      </svg>
    `,
    refresh: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5"></path>
        <path d="M4 18v-5h5"></path>
        <path d="M6.9 9A7 7 0 0 1 18 7.8L20 11"></path>
        <path d="M17.1 15A7 7 0 0 1 6 16.2L4 13"></path>
      </svg>
    `,
    sparkles: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="icon-fill" d="M12 4.3 13.8 9l4.7 1.8-4.7 1.8L12 17.3l-1.8-4.7-4.7-1.8L10.2 9 12 4.3Z"></path>
        <path class="icon-fill" d="m18.5 4 0.9 2.1L21.5 7l-2.1 0.9L18.5 10l-0.9-2.1L15.5 7l2.1-0.9L18.5 4Z"></path>
        <path class="icon-fill" d="m18.8 13.5 1.1 2.5 2.5 1.1-2.5 1.1-1.1 2.5-1.1-2.5-2.5-1.1 2.5-1.1 1.1-2.5Z"></path>
      </svg>
    `,
    bars: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect class="icon-fill" x="4" y="13" width="3.4" height="7" rx="1.2"></rect>
        <rect class="icon-fill" x="10.3" y="9" width="3.4" height="11" rx="1.2"></rect>
        <rect class="icon-fill" x="16.6" y="5" width="3.4" height="15" rx="1.2"></rect>
      </svg>
    `,
    clock: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8"></circle>
        <path d="M12 7.5v5l3.5 2"></path>
      </svg>
    `,
    playCircle: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8"></circle>
        <path class="icon-fill" d="m10 8.8 5.8 3.2L10 15.2V8.8Z"></path>
      </svg>
    `,
    utensils: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4v8"></path>
        <path d="M4.5 4v4a2.5 2.5 0 0 0 5 0V4"></path>
        <path d="M7 12v8"></path>
        <path d="m19.5 4-4 7h3v9"></path>
      </svg>
    `,
    link: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.5 13.5 13.5 10.5"></path>
        <path d="m8.4 15.6-1.7 1.7a4 4 0 1 1-5.7-5.7l3.2-3.2a4 4 0 0 1 5.7 0"></path>
        <path d="m15.6 8.4 1.7-1.7a4 4 0 1 1 5.7 5.7l-3.2 3.2a4 4 0 0 1-5.7 0"></path>
      </svg>
    `,
    badgeCheck: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.8 14.3 5l2.6-.2.8 2.5 2.1 1.6-1 2.4 1 2.4-2.1 1.6-.8 2.5-2.6-.2L12 20.2l-2.3-1.2-2.6.2-.8-2.5-2.1-1.6 1-2.4-1-2.4 2.1-1.6.8-2.5 2.6.2L12 3.8Z"></path>
        <path d="m9.1 12.2 1.9 1.9 3.9-4"></path>
      </svg>
    `,
    card: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2"></rect>
        <path d="M3 10.5h18"></path>
        <path d="M7 15h3"></path>
      </svg>
    `
  };

  const stepIntro = {
    1: ["Seu acesso começa", "com o seu perfil."],
    2: ["Agora vamos conhecer", "melhor sua rotina."],
    3: ["Escolha o que faz", "mais sentido para você."],
    4: ["Vamos encaixar os exercícios", "na sua rotina."],
    5: ["Conte o que combina", "com sua alimentação."],
    6: ["Seu perfil está pronto.", "Falta liberar o acesso."]
  };

  const stepBenefits = {
    1: [
      { title: "Seu portal, do seu jeito", text: "Suas respostas ajudam a organizar uma experiência mais alinhada à sua rotina.", icon: "user", color: "#7C5CFF" },
      { title: "Tudo organizado em um só lugar", text: "Alimentação, exercícios, receitas e rotina reunidos para facilitar suas escolhas.", icon: "grid", color: "#14C8B0" },
      { title: "Você continua no controle", text: "Suas preferências podem ser revistas e atualizadas depois dentro do portal.", icon: "sliders", color: "#FF7E73" }
    ],
    2: [
      { title: "Conteúdo mais compatível com você", text: "Seu nível de atividade e sua rotina ajudam o portal a priorizar conteúdos mais adequados ao seu momento.", icon: "target", color: "#33A1FF" },
      { title: "Menos tempo procurando", text: "O perfil ajuda a destacar o que tende a fazer mais sentido para você dentro da biblioteca.", icon: "sparkles", color: "#2FD3BD" },
      { title: "Um perfil que acompanha sua rotina", text: "Se seus hábitos mudarem, você poderá atualizar suas informações dentro do portal.", icon: "bars", color: "#FF6F7D" }
    ],
    3: [
      { title: "Foque no que importa agora", text: "Seus objetivos ajudam a organizar o conteúdo em torno das prioridades que você escolher.", icon: "target", color: "#2EA0FF" },
      { title: "Uma seleção mais relevante", text: "O portal pode destacar exercícios, receitas e conteúdos alinhados aos seus interesses atuais.", icon: "searchCheck", color: "#49B95E" },
      { title: "Evolua no seu ritmo", text: "Seus objetivos podem mudar com o tempo, e o perfil pode acompanhar essas mudanças.", icon: "refresh", color: "#FFB81F" }
    ],
    4: [
      { title: "Exercícios que cabem no seu dia", text: "Tempo disponível, local e equipamentos ajudam a priorizar opções mais práticas para sua rotina.", icon: "clock", color: "#8A7CFF" },
      { title: "Mais facilidade para começar", text: "Em vez de procurar entre tudo, você encontra primeiro opções mais compatíveis com suas escolhas.", icon: "playCircle", color: "#31D1D4" },
      { title: "Sua rotina pode mudar", text: "Dias, locais e equipamentos poderão ser atualizados sempre que sua realidade mudar.", icon: "refresh", color: "#FF992E" }
    ],
    5: [
      { title: "Receitas mais próximas do seu gosto", text: "Preferências e interesses alimentares ajudam a destacar conteúdos mais relevantes para você.", icon: "utensils", color: "#BACA2B" },
      { title: "Menos tempo procurando", text: "Receitas e conteúdos podem ser organizados considerando suas escolhas e o tempo que você tem para preparar.", icon: "searchCheck", color: "#26A9F5" },
      { title: "Tudo conectado à sua rotina", text: "Alimentação, exercícios, receitas e rotina trabalham juntos dentro da mesma experiência.", icon: "link", color: "#EF77A9" }
    ],
    6: [
      { title: "Seu perfil está quase pronto", text: "Suas respostas já estão organizadas para formar uma experiência mais relevante dentro do Active Vida Leve.", icon: "badgeCheck", color: "#A9C485" },
      { title: "Tudo em um só lugar", text: "Alimentação, exercícios, receitas, Sucos Detox e rotina reunidos no mesmo portal.", icon: "grid", color: "#6E93FF" },
      { title: "Próximo passo: liberar seu acesso", text: "Confira seu perfil e continue para a etapa de pagamento para avançar no acesso ao portal.", icon: "card", color: "#FFA27E" }
    ]
  };

  const stepNames = [
    "Sua conta",
    "Seu perfil",
    "Seus objetivos",
    "Exercícios e rotina",
    "Alimentação"
  ];

  let currentStep = 1;
  let authMethod = "email_senha";
  let googleUser = null;
  let isSaving = false;

  const getField = (name) => form.elements.namedItem(name);

  const maskBirthDate = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const birthDateDisplayToIso = (value) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return "";

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return "";

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const birthDateIsoToDisplay = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  };

  const syncBirthDateFromDisplay = () => {
    if (!birthDateDisplay || !birthDateNative) return;
    birthDateDisplay.value = maskBirthDate(birthDateDisplay.value);
    birthDateNative.value = birthDateDisplayToIso(birthDateDisplay.value);
  };

  const setStatus = (element, message = "", type = "") => {
    if (!element) return;
    element.hidden = !message;
    element.textContent = message;
    element.classList.remove("is-loading", "is-success", "is-error");
    if (message && type) element.classList.add(`is-${type}`);
  };

  const getAge = () => {
    const birthDateField = getField("data_nascimento");
    if (!birthDateField?.value) return null;

    const birthDate = new Date(`${birthDateField.value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  };

  const clearError = (name) => {
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (error) error.textContent = "";

    const field = getField(name);
    if (field instanceof RadioNodeList) return;
    field?.closest(".field")?.classList.remove("is-invalid");
  };

  const setError = (name, message) => {
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (error) error.textContent = message;

    const field = getField(name);
    if (!(field instanceof RadioNodeList)) {
      field?.closest(".field")?.classList.add("is-invalid");
    }
  };

  const checkedValues = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);

  const validateStep = (step) => {
    let valid = true;

    if (step === 1) {
      ["nome", "sobrenome", "email", "senha", "confirmar_senha", "data_nascimento", "aceite_termos"].forEach(clearError);

      const requiredTextFields = authMethod === "google"
        ? ["nome", "sobrenome", "email"]
        : ["nome", "sobrenome", "email", "senha", "confirmar_senha"];

      requiredTextFields.forEach((name) => {
        const field = getField(name);
        if (!field?.value?.trim()) {
          setError(name, "Preencha este campo para continuar.");
          valid = false;
        }
      });

      const email = getField("email");
      if (email?.value && !email.validity.valid) {
        setError("email", "Digite um e-mail válido.");
        valid = false;
      }

      if (authMethod !== "google") {
        const password = getField("senha");
        const confirmPassword = getField("confirmar_senha");
        if (password?.value && password.value.length < 8) {
          setError("senha", "Use pelo menos 8 caracteres.");
          valid = false;
        }

        if (confirmPassword?.value && password?.value !== confirmPassword.value) {
          setError("confirmar_senha", "As senhas precisam ser iguais.");
          valid = false;
        }
      }

      syncBirthDateFromDisplay();
      const birthDate = getField("data_nascimento");
      const birthDateText = birthDateDisplay?.value.trim() || "";
      const age = getAge();

      if (!birthDateText) {
        setError("data_nascimento", "Preencha este campo para continuar.");
        valid = false;
      } else if (!birthDate?.value || age === null || age < 0 || age > 120) {
        setError("data_nascimento", "Informe uma data de nascimento válida.");
        valid = false;
      }

      const terms = getField("aceite_termos");
      if (!terms?.checked) {
        setError("aceite_termos", "Você precisa aceitar os termos para continuar.");
        valid = false;
      }
    }

    if (step === 2) {
      ["altura", "nivel_atividade"].forEach(clearError);

      const height = getField("altura");
      const heightValue = Number(height?.value);
      if (!height?.value || Number.isNaN(heightValue) || heightValue < 80 || heightValue > 230) {
        setError("altura", "Informe uma altura entre 80 e 230 cm.");
        valid = false;
      }

      if (!form.querySelector('input[name="nivel_atividade"]:checked')) {
        setError("nivel_atividade", "Selecione uma opção.");
        valid = false;
      }
    }

    if (step === 3) {
      clearError("objetivos");
      const goals = checkedValues("objetivos");
      if (goals.length === 0) {
        setError("objetivos", "Escolha pelo menos um objetivo.");
        valid = false;
      }
    }

    if (step === 4) {
      ["nivel_exercicio", "dias_exercicio", "duracao_treino", "local_exercicio"].forEach(clearError);

      if (!form.querySelector('input[name="nivel_exercicio"]:checked')) {
        setError("nivel_exercicio", "Selecione seu nível atual.");
        valid = false;
      }

      ["dias_exercicio", "duracao_treino", "local_exercicio"].forEach((name) => {
        if (!getField(name)?.value) {
          setError(name, "Selecione uma opção.");
          valid = false;
        }
      });
    }

    if (step === 5) {
      ["perfil_alimentar", "tempo_preparo"].forEach(clearError);

      if (!form.querySelector('input[name="perfil_alimentar"]:checked')) {
        setError("perfil_alimentar", "Selecione uma preferência alimentar.");
        valid = false;
      }

      if (!getField("tempo_preparo")?.value) {
        setError("tempo_preparo", "Selecione o tempo disponível.");
        valid = false;
      }
    }

    return valid;
  };

  const formatValue = (value, mapping) => mapping[value] ?? value ?? "Não informado";

  const buildSummary = () => {
    const summary = form.querySelector("[data-profile-summary]");
    if (!summary) return;

    const goalLabels = {
      movimentar_mais: "Me movimentar mais",
      melhorar_condicionamento: "Melhorar condicionamento",
      constancia_exercicios: "Criar constância nos exercícios",
      organizar_alimentacao: "Organizar melhor a alimentação",
      receitas_praticas: "Aprender receitas práticas",
      variar_refeicoes: "Ter mais variedade nas refeições",
      rotina_organizada: "Criar uma rotina mais organizada",
      bem_estar: "Melhorar hábitos de bem-estar"
    };

    const equipmentLabels = {
      nenhum: "Nenhum",
      halteres: "Halteres",
      elasticos: "Elásticos",
      colchonete: "Colchonete",
      academia: "Equipamentos de academia",
      outros: "Outros"
    };

    const foodInterestLabels = {
      cafe_manha: "Café da manhã",
      almoco: "Almoço",
      jantar: "Jantar",
      lanches: "Lanches",
      sucos: "Sucos",
      receitas_rapidas: "Receitas rápidas",
      marmitas: "Marmitas"
    };

    const activity = formatValue(form.querySelector('input[name="nivel_atividade"]:checked')?.value, {
      pouco_ativo: "Pouco ativo",
      algumas_vezes_semana: "Algumas vezes por semana",
      ativo_frequente: "Ativo com frequência",
      muito_ativo: "Muito ativo"
    });

    const exerciseLevel = formatValue(form.querySelector('input[name="nivel_exercicio"]:checked')?.value, {
      iniciante: "Iniciante",
      intermediario: "Intermediário",
      experiente: "Experiente"
    });

    const exerciseDays = formatValue(getField("dias_exercicio")?.value, {
      "1_2": "1–2 dias por semana",
      "3_4": "3–4 dias por semana",
      "5_mais": "5 ou mais dias por semana"
    });

    const duration = formatValue(getField("duracao_treino")?.value, {
      ate_15: "Até 15 min",
      "15_30": "15–30 min",
      "30_45": "30–45 min",
      mais_45: "Mais de 45 min"
    });

    const foodProfile = formatValue(form.querySelector('input[name="perfil_alimentar"]:checked')?.value, {
      variada: "Variada",
      vegetariana: "Vegetariana",
      vegana: "Vegana",
      outra: "Outra"
    });

    const goals = checkedValues("objetivos").map((value) => goalLabels[value]).filter(Boolean);
    const equipment = checkedValues("equipamentos").map((value) => equipmentLabels[value]).filter(Boolean);
    const foodInterests = checkedValues("interesses_alimentares").map((value) => foodInterestLabels[value]).filter(Boolean);

    const firstName = getField("nome")?.value?.trim() || "Seu perfil";
    const age = getAge();

    const summaryCards = [
      ["Perfil", `${firstName}${age !== null ? ` • ${age} anos` : ""}`],
      ["Atividade atual", activity],
      ["Exercícios", `${exerciseLevel} • ${exerciseDays} • ${duration}`],
      ["Alimentação", foodProfile],
      ["Objetivos", goals.join(" • ") || "Não informado", true],
      ["Equipamentos", equipment.join(" • ") || "Não informado", true],
      ["Interesses de alimentação", foodInterests.join(" • ") || "Não informado", true]
    ];

    summary.innerHTML = summaryCards.map(([label, value, wide]) => `
      <div class="summary-card${wide ? " summary-card-wide" : ""}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join("");
  };

  const updateAgeGuidance = () => {
    if (!ageGuidance) return;
    const age = getAge();
    ageGuidance.hidden = age === null || age >= 18;
  };

  const updateProgress = () => {
    const isSummary = currentStep === 6;
    const visibleStep = Math.min(currentStep, 5);

    if (stepLabel) stepLabel.textContent = isSummary ? "Cadastro concluído" : `Etapa ${visibleStep} de 5`;
    if (stepName) stepName.textContent = isSummary ? "Resumo do perfil" : stepNames[visibleStep - 1];
    if (progressFill) progressFill.style.width = `${isSummary ? 100 : visibleStep * 20}%`;

    progressDots.forEach((dot, index) => {
      const dotStep = index + 1;
      dot.classList.toggle("is-active", !isSummary && dotStep === visibleStep);
      dot.classList.toggle("is-complete", isSummary || dotStep < visibleStep);
    });

    if (previousButton) previousButton.disabled = currentStep === 1;

    if (nextButton) {
      nextButton.textContent = currentStep === 5 ? "Finalizar perfil" : "Continuar";
      nextButton.hidden = isSummary;
    }

    if (actions) {
      actions.hidden = false;
      actions.classList.toggle("is-summary", isSummary);
    }
  };

  const updateStepBenefits = () => {
    const [title, accent] = stepIntro[currentStep] || stepIntro[1];
    const benefits = stepBenefits[currentStep] || stepBenefits[1];

    if (introTitle) introTitle.textContent = title;
    if (introAccent) introAccent.textContent = accent;

    benefits.forEach((benefit, index) => {
      if (benefitTitles[index]) benefitTitles[index].textContent = benefit.title;
      if (benefitTexts[index]) benefitTexts[index].textContent = benefit.text;

      if (benefitIcons[index]) {
        benefitIcons[index].innerHTML = benefitIconSvg[benefit.icon] || "";
        benefitIcons[index].style.setProperty("--benefit-icon-color", benefit.color);
      }
    });
  };

  const showStep = (step) => {
    currentStep = step;

    steps.forEach((stepSection) => {
      const sectionStep = Number(stepSection.dataset.step);
      const active = sectionStep === currentStep;
      stepSection.hidden = !active;
      stepSection.classList.toggle("is-active", active);
    });

    if (currentStep === 2) updateAgeGuidance();
    if (currentStep === 6) buildSummary();

    updateStepBenefits();
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setGoogleMode = (user) => {
    googleUser = user;
    authMethod = "google";

    const displayName = user.displayName?.trim() || "";
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");

    if (firstName) getField("nome").value = firstName;
    if (lastName) getField("sobrenome").value = lastName;
    if (user.email) {
      getField("email").value = user.email;
      getField("email").readOnly = true;
    }

    ["senha", "confirmar_senha"].forEach((name) => {
      const field = getField(name);
      if (!field) return;
      field.required = false;
      field.disabled = true;
      field.value = "";
      clearError(name);
    });

    passwordFields.forEach((field) => { field.hidden = true; });
    if (googleAccountEmail) googleAccountEmail.textContent = user.email || "Conta Google conectada";
    if (googleAccountState) googleAccountState.hidden = false;
    setStatus(authStatus, "Conta Google conectada. Complete as informações abaixo para continuar.", "success");
  };

  const normalizeReferral = () => {
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get("ref")?.trim() || "";
    const isValid = /^[A-Za-z0-9_-]{3,64}$/.test(refFromUrl);

    if (isValid) sessionStorage.setItem("active_referencia", refFromUrl);
    const stored = sessionStorage.getItem("active_referencia") || "";
    return /^[A-Za-z0-9_-]{3,64}$/.test(stored) ? stored : null;
  };

  const buildFirebasePayload = (user, providerName) => {
    const numberOrNull = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    const usuario = {
      nome: getField("nome")?.value?.trim() || "",
      sobrenome: getField("sobrenome")?.value?.trim() || "",
      email: user.email || getField("email")?.value?.trim() || "",
      data_nascimento: getField("data_nascimento")?.value || "",
      provedor_cadastro: providerName,
      status_pagamento: "pendente",
      status_acesso: "inativo",
      referencia_informada: normalizeReferral(),
      origem_cadastro: "site",
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    };

    const perfil = {
      altura: numberOrNull(getField("altura")?.value),
      peso: numberOrNull(getField("peso")?.value),
      nivel_atividade: form.querySelector('input[name="nivel_atividade"]:checked')?.value || null,
      objetivos: checkedValues("objetivos"),
      nivel_exercicio: form.querySelector('input[name="nivel_exercicio"]:checked')?.value || null,
      dias_exercicio: getField("dias_exercicio")?.value || null,
      duracao_treino: getField("duracao_treino")?.value || null,
      local_exercicio: getField("local_exercicio")?.value || null,
      equipamentos: checkedValues("equipamentos"),
      exercicios_evitar: getField("exercicios_evitar")?.value?.trim() || "",
      perfil_alimentar: form.querySelector('input[name="perfil_alimentar"]:checked')?.value || null,
      interesses_alimentares: checkedValues("interesses_alimentares"),
      tempo_preparo: getField("tempo_preparo")?.value || null,
      alimentos_evitar: getField("alimentos_evitar")?.value?.trim() || "",
      restricoes_alimentares: getField("restricoes_alimentares")?.value?.trim() || "",
      onboarding_concluido: true,
      versao_onboarding: 1,
      atualizado_em: serverTimestamp()
    };

    return { usuario, perfil };
  };

  const saveProfile = async () => {
    if (isSaving) return;
    isSaving = true;
    if (paymentButton) paymentButton.disabled = true;
    setStatus(firebaseStatus, "Criando sua conta e salvando o perfil…", "loading");
    if (paymentMessage) paymentMessage.hidden = true;

    let user = null;
    let createdEmailUser = false;

    try {
      if (authMethod === "google") {
        user = googleUser || auth.currentUser;
        if (!user) throw new Error("google_sem_usuario");
      } else {
        const email = getField("email")?.value?.trim() || "";
        const password = getField("senha")?.value || "";

        if (auth.currentUser?.email === email) {
          user = auth.currentUser;
        } else {
          if (auth.currentUser) await signOut(auth);
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          user = credential.user;
          createdEmailUser = true;
        }

        await updateProfile(user, {
          displayName: `${getField("nome")?.value?.trim() || ""} ${getField("sobrenome")?.value?.trim() || ""}`.trim()
        });
      }

      const { usuario, perfil } = buildFirebasePayload(user, authMethod);
      const batch = writeBatch(db);
      batch.set(doc(db, "usuarios", user.uid), usuario, { merge: true });
      batch.set(doc(db, "perfis", user.uid), perfil, { merge: true });
      await batch.commit();

      setStatus(firebaseStatus, "Cadastro salvo com sucesso no Firebase. Abrindo o pagamento de teste…", "success");
      if (paymentMessage) paymentMessage.hidden = false;
      if (paymentButton) {
        paymentButton.textContent = "Abrindo pagamento…";
        paymentButton.disabled = true;
      }

      window.setTimeout(() => {
        window.location.href = "./pagamento.html";
      }, 650);
    } catch (error) {
      console.error("Erro ao salvar cadastro:", error);

      if (createdEmailUser && auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (rollbackError) {
          console.warn("Não foi possível desfazer a conta após falha no Firestore:", rollbackError);
        }
      }

      const messages = {
        "auth/email-already-in-use": "Este e-mail já possui uma conta. Use outro e-mail ou entre na conta existente.",
        "auth/invalid-email": "O e-mail informado não é válido.",
        "auth/weak-password": "A senha precisa ser mais forte.",
        "auth/network-request-failed": "Não foi possível conectar ao Firebase. Confira sua internet e tente novamente.",
        "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase Authentication.",
        "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o acesso.",
        "permission-denied": "O Firestore recusou a gravação. Confira as regras publicadas e tente novamente."
      };

      const code = error?.code || error?.message || "";
      setStatus(firebaseStatus, messages[code] || "Não foi possível concluir o cadastro agora. Tente novamente.", "error");
      if (paymentButton) paymentButton.disabled = false;
      isSaving = false;
    }
  };

  googleButton?.addEventListener("click", async () => {
    googleButton.disabled = true;
    setStatus(authStatus, "Abrindo o acesso com Google…", "loading");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setGoogleMode(result.user);
    } catch (error) {
      console.error("Erro no login com Google:", error);
      const messages = {
        "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase Authentication.",
        "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o acesso.",
        "auth/network-request-failed": "Não foi possível conectar ao Google agora. Tente novamente."
      };
      setStatus(authStatus, messages[error?.code] || "Não foi possível conectar sua conta Google.", "error");
    } finally {
      googleButton.disabled = false;
    }
  });

  nextButton?.addEventListener("click", () => {
    if (!validateStep(currentStep)) {
      const firstError = steps[currentStep - 1]?.querySelector(".field-error:not(:empty)");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    showStep(Math.min(currentStep + 1, 6));
  });

  previousButton?.addEventListener("click", () => {
    showStep(Math.max(currentStep - 1, 1));
  });

  goalInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const selected = goalInputs.filter((goal) => goal.checked);

      if (selected.length > 3) input.checked = false;

      const count = goalInputs.filter((goal) => goal.checked).length;
      if (goalCounter) goalCounter.textContent = `${count} de 3 selecionados`;

      goalInputs.forEach((goal) => {
        if (!goal.checked) goal.disabled = count >= 3;
      });

      if (count > 0) clearError("objetivos");
    });
  });

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.name) clearError(target.name);
  });

  if (birthDateNative) {
    const today = new Date();
    const minimumDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const toIsoDate = (date) => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    birthDateNative.max = toIsoDate(today);
    birthDateNative.min = toIsoDate(minimumDate);

    birthDateNative.addEventListener("change", () => {
      if (birthDateDisplay) birthDateDisplay.value = birthDateIsoToDisplay(birthDateNative.value);
      clearError("data_nascimento");
      updateAgeGuidance();
    });
  }

  birthDateDisplay?.addEventListener("input", () => {
    syncBirthDateFromDisplay();
    clearError("data_nascimento");
    updateAgeGuidance();
  });

  birthDateDisplay?.addEventListener("blur", syncBirthDateFromDisplay);

  birthDatePicker?.addEventListener("click", () => {
    if (!birthDateNative) return;

    try {
      if (typeof birthDateNative.showPicker === "function") {
        birthDateNative.showPicker();
      } else {
        birthDateNative.click();
      }
    } catch {
      birthDateNative.click();
    }
  });

  paymentButton?.addEventListener("click", saveProfile);

  normalizeReferral();
  showStep(1);
}
