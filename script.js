const Storage = {
  load: () => JSON.parse(localStorage.getItem("sherlock_bia") || "{}"),
  save: (data) => localStorage.setItem("sherlock_bia", JSON.stringify(data))
};
const UI = {
  renderWelcome: () => { document.getElementById("app").innerHTML = "<h2>Bem-vindo a Sherlock Bia!</h2>"; },
  renderHub: () => { document.getElementById("app").innerHTML = "<h2>Mapa de Casos</h2>"; },
  renderParentsPanel: () => { document.getElementById("app").innerHTML = "<h2>Painel dos Pais</h2>"; },
  renderSkillTree: () => { document.getElementById("app").innerHTML = "<h2>Árvore de Habilidades</h2>"; }
};
const Data = {
  skills: [
    { id: "detetive_rapido", name: "Detetive Rápido", description: "Recebe uma dica extra por caso.", unlocked: false, effect: { extraClue: true } },
    { id: "observador", name: "Olhos de Águia", description: "Aumenta a área clicável dos hotspots.", unlocked: false, effect: { hotspotBoost: true } }
  ]
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      switch (action) {
        case "go-welcome": UI.renderWelcome(); break;
        case "go-hub": UI.renderHub(); break;
        case "go-parents": UI.renderParentsPanel(); break;
        case "go-skill-tree": UI.renderSkillTree(); break;
        case "reset-progress":
          if (confirm("Tem certeza que deseja zerar o progresso?")) {
            Storage.save({});
            location.reload();
          }
          break;
      }
    });
  });
  UI.renderWelcome();
});