import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const root = document.documentElement;
let resolved = false;

const goToLogin = () => {
  window.location.replace("./index.html?login=1");
};

const goToPayment = () => {
  window.location.replace("./pagamento.html");
};

const goToCadastro = () => {
  window.location.replace("./cadastro.html");
};

const releasePage = () => {
  resolved = true;
  root.removeAttribute("data-access-guard");
};

onAuthStateChanged(auth, async (user) => {
  if (resolved) return;

  if (!user) {
    goToLogin();
    return;
  }

  try {
    const [userSnapshot, profileSnapshot] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid))
    ]);

    if (!userSnapshot.exists()) {
      goToCadastro();
      return;
    }

    const userData = userSnapshot.data();
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      goToPayment();
      return;
    }

    releasePage();
  } catch (error) {
    console.error("Falha ao validar acesso à área interna:", error);
    goToLogin();
  }
});
