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
  const paymentPlaceholder = form.querySelector("[data-payment-placeholder]");
  const paymentMessage = form.querySelector("[data-payment-message]");
  const ageGuidance = form.querySelector("[data-age-guidance]");

  const stepNames = [
    "Sua conta",
    "Seu perfil",
    "Seus objetivos",
    "Exercícios e rotina",
    "Alimentação"
  ];

  let currentStep = 1;

  const getField = (name) => form.elements.namedItem(name);

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

      const requiredTextFields = ["nome", "sobrenome", "email", "senha", "confirmar_senha", "data_nascimento"];
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

      const birthDate = getField("data_nascimento");
      const age = getAge();
      if (birthDate?.value && (age === null || age < 0 || age > 120)) {
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

    if (previousButton) {
      previousButton.disabled = currentStep === 1;
    }

    if (nextButton) {
      nextButton.textContent = currentStep === 5 ? "Finalizar perfil" : "Continuar";
    }

    if (actions) {
      actions.hidden = isSummary;
    }
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

    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

      if (selected.length > 3) {
        input.checked = false;
      }

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

  getField("data_nascimento")?.addEventListener("change", updateAgeGuidance);

  paymentPlaceholder?.addEventListener("click", () => {
    if (paymentMessage) paymentMessage.hidden = false;
  });

  showStep(1);
}
