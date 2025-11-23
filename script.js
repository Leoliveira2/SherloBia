// Sherlock Bia — engine principal
// Implementa navegação, renderização de cenas e interação com pistas/diálogos

const SCENE_BACKGROUNDS = {
  school_hallway: "assets/school_hallway_cartoon.png",
  corridor: "assets/school_hallway_cartoon.png",
  hall: "assets/hall_cartoon.png",
  library: "assets/library_cartoon.png",
  kitchen: "assets/kitchen_cartoon.png",
  canteen: "assets/canteen_cartoon.png",
  garden: "assets/garden_cartoon.png",
  computer_lab: "assets/computer_lab_cartoon.png",
  music_room: "assets/music_room_cartoon.png",
  classroom: "assets/hall_cartoon.png"
};

const CHARACTER_PORTRAITS = {
  programador_gui: "assets/programador_gui.png",
  prof_ciencias: "assets/prof_ciencias.png",
  sofia: "assets/sofia.png",
  zelador_carlos: "assets/zelador_carlos.png",
  treinador_marcos: "assets/treinador_marcos.png",
  bia: "assets/bia.png"
};

const SKILLS = [
  { id: "detetive_rapido", name: "Detetive Rápido", cost: 50, description: "Recebe 1 dica extra por caso.", effect: { extraClue: true } },
  { id: "olhos_de_agua", name: "Olhos de Águia", cost: 40, description: "Hotspots maiores para facilitar o clique.", effect: { hotspotBoost: true } },
  { id: "logica_afiada", name: "Lógica Afiada", cost: 60, description: "Ganhe +10 XP por acerto de enigma.", effect: { puzzleBonus: 10 } }
];

const Storage = {
  load: () => {
    try {
      return JSON.parse(localStorage.getItem("sherlock_bia") || "{}");
    } catch (e) {
      return {};
    }
  },
  save: (data) => localStorage.setItem("sherlock_bia", JSON.stringify(data))
};

const Toast = {
  container: null,
  init() {
    this.container = document.getElementById("toast-container");
  },
  show(message, type = "info") {
    if (!this.container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
};

const Modal = {
  overlay: null,
  title: null,
  message: null,
  input: null,
  actions: null,
  init() {
    this.overlay = document.getElementById("custom-modal");
    this.title = document.getElementById("modal-title");
    this.message = document.getElementById("modal-message");
    this.input = document.getElementById("modal-input");
    this.actions = document.getElementById("modal-options");
  },
  close() {
    this.overlay.classList.remove("show");
    this.message.textContent = "";
    this.title.textContent = "";
    this.input.style.display = "none";
    this.input.value = "";
    this.actions.innerHTML = "";
  },
  prompt({ title, message, placeholder = "", onConfirm, showInput = false, options = [] }) {
    this.title.textContent = title;
    this.message.textContent = message;
    this.actions.innerHTML = "";

    if (showInput) {
      this.input.style.display = "block";
      this.input.placeholder = placeholder;
      this.input.value = "";
    } else {
      this.input.style.display = "none";
    }

    if (options.length) {
      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          onConfirm(opt.value ?? opt.label, opt);
          this.close();
        });
        this.actions.appendChild(btn);
      });
    } else {
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "btn";
      confirmBtn.textContent = "Confirmar";
      confirmBtn.addEventListener("click", () => {
        onConfirm(this.input.value);
        this.close();
      });
      this.actions.appendChild(confirmBtn);
    }

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn ghost";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => this.close());
    this.actions.appendChild(cancelBtn);

    this.overlay.classList.add("show");
  }
};

const Game = {
  app: null,
  cases: [],
  state: {
    coins: 0,
    xp: 0,
    unlockedSkills: [],
    completedCases: {}
  },
  currentCase: null,

  async init() {
    this.app = document.getElementById("app");
    Toast.init();
    Modal.init();
    this.state = { ...this.state, ...Storage.load() };
    this.cases = await this.loadCases();
    this.bindNavigation();
    UI.renderWelcome();
  },

  async loadCases() {
    const response = await fetch("cases.json");
    return await response.json();
  },

  bindNavigation() {
    document.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        if (action === "reset-progress") {
          if (confirm("Tem certeza que deseja zerar o progresso?")) {
            Storage.save({});
            location.reload();
          }
          return;
        }
        UI.handleNavigation(action);
      });
    });
  },

  selectCulprit(caseData) {
    const rng = new Math.seedrandom(caseData.id);
    const index = Math.floor(rng() * caseData.culpritPool.length);
    return caseData.culpritPool[index];
  },

  startCase(caseId) {
    const caseData = this.cases.find((c) => c.id === caseId);
    if (!caseData) return;

    const culprit = this.selectCulprit(caseData);
    const clues = this.prepareClues(caseData, culprit);

    this.currentCase = {
      ...caseData,
      culprit,
      allClues: clues,
      foundClues: [],
      askedDialogues: new Set(),
      solved: false
    };

    UI.renderCase(this.currentCase);
  },

  prepareClues(caseData, culprit) {
    const pool = [];
    Object.entries(caseData.clueSets).forEach(([suspectId, clues]) => {
      clues.forEach((clue) => {
        const choice = clue.hs?.potentialPositions?.length
          ? clue.hs.potentialPositions[Math.floor(Math.random() * clue.hs.potentialPositions.length)]
          : [30, 50, 12, 10];
        pool.push({ ...clue, suspectId, position: choice });
      });
    });

    // bônus se habilidade extraClue ativa e suspeito é culpado
    if (this.hasSkill("detetive_rapido")) {
      const extra = caseData.clueSets[culprit]?.find((c) => c.type === "hotspot");
      if (extra) {
        pool.push({
          ...extra,
          id: `${extra.id}_bonus`,
          text: `${extra.text} (dica bônus)`,
          suspectId: culprit,
          position: extra.hs?.potentialPositions?.[0] || [40, 40, 14, 10]
        });
      }
    }

    return pool;
  },

  markClueFound(clue) {
    if (this.currentCase.foundClues.some((c) => c.id === clue.id)) return;
    this.currentCase.foundClues.push(clue);
    this.addReward(clue.weight || 1, clue.type === "pattern" || clue.type === "cipher");
    UI.updateClueList(this.currentCase);
  },

  addReward(weight, isPuzzle = false) {
    const bonus = isPuzzle && this.hasSkill("logica_afiada") ? 10 : 0;
    this.state.coins += weight * 5;
    this.state.xp += weight * 8 + bonus;
    Storage.save(this.state);
    UI.renderHud();
  },

  hasSkill(skillId) {
    return this.state.unlockedSkills.includes(skillId);
  },

  unlockSkill(skill) {
    if (this.state.unlockedSkills.includes(skill.id)) return;
    if (this.state.coins < skill.cost) {
      Toast.show("Moedas insuficientes para desbloquear", "error");
      return;
    }
    this.state.coins -= skill.cost;
    this.state.unlockedSkills.push(skill.id);
    Storage.save(this.state);
    Toast.show(`${skill.name} desbloqueada!`, "success");
    UI.renderSkillTree();
    UI.renderHud();
  },

  openDialogue(suspectId) {
    if (!this.currentCase) return;
    const dialogue = this.currentCase.dialogues?.[suspectId];
    if (!dialogue) {
      Toast.show("Este personagem não tem falas registradas.", "warning");
      return;
    }

    // Marcar pistas de diálogo encontradas
    const dialogueClues = this.currentCase.allClues.filter(
      (c) => c.suspectId === suspectId && c.type === "dialogue"
    );
    dialogueClues.forEach((c) => this.markClueFound(c));

    this.showDialogueNode(dialogue, dialogue.start);
  },

  showDialogueNode(dialogue, nodeId) {
    const node = dialogue.nodes[nodeId];
    if (!node) return;
    Modal.prompt({
      title: "Conversa",
      message: node.text,
      options: node.options.map((opt) => ({ label: opt.label, value: opt })) ,
      onConfirm: (_, opt) => {
        const option = opt.value;
        if (option.end) return;
        const nextId = option.next || dialogue.start;
        this.showDialogueNode(dialogue, nextId);
      }
    });
  },

  accuse(suspectId) {
    if (!this.currentCase) return;
    const success = suspectId === this.currentCase.culprit;
    const caseResult = {
      culprit: this.currentCase.culprit,
      foundClues: this.currentCase.foundClues.map((c) => c.id),
      success
    };
    this.state.completedCases[this.currentCase.id] = caseResult;
    Storage.save(this.state);
    this.currentCase.solved = success;

    if (success) {
      this.addReward(5);
      Toast.show("Caso resolvido! Você acertou o culpado!", "success");
    } else {
      Toast.show("Acusação incorreta. Continue investigando!", "error");
    }
    UI.renderCase(this.currentCase);
  }
};

const UI = {
  handleNavigation(action) {
    switch (action) {
      case "go-welcome":
        this.renderWelcome();
        break;
      case "go-hub":
        this.renderHub();
        break;
      case "go-parents":
        this.renderParentsPanel();
        break;
      case "go-skill-tree":
        this.renderSkillTree();
        break;
    }
  },

  renderHud() {
    const hud = document.querySelector(".hud");
    if (!hud) return;
    hud.innerHTML = `
      <div><strong>XP:</strong> ${Game.state.xp}</div>
      <div><strong>Moedas:</strong> ${Game.state.coins}</div>
      <div><strong>Habilidades:</strong> ${Game.state.unlockedSkills.length}</div>
    `;
  },

  renderWelcome() {
    Game.currentCase = null;
    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Bem-vindo(a) ao Sherlock Bia!</h2>
        <p>Explore casos, encontre pistas e descubra o culpado usando lógica e observação.</p>
        <div class="stats">
          <div class="stat-card"><span class="stat-number">${Object.keys(Game.state.completedCases).length}</span><span class="stat-label">Casos concluídos</span></div>
          <div class="stat-card"><span class="stat-number">${Game.state.xp}</span><span class="stat-label">XP</span></div>
          <div class="stat-card"><span class="stat-number">${Game.state.coins}</span><span class="stat-label">Moedas</span></div>
        </div>
        <div class="cta">
          <button class="btn" data-action="go-hub">Ir para o Mapa de Casos</button>
          <button class="btn ghost" data-action="go-skill-tree">Ver Habilidades</button>
        </div>
      </section>
    `;
    this.renderHud();
  },

  renderHub() {
    const cards = Game.cases
      .map((c) => {
        const solved = Game.state.completedCases[c.id]?.success;
        return `
          <article class="case-card">
            <div class="case-meta">Capítulo ${c.chapter} • Dificuldade ${"★".repeat(c.difficulty)}</div>
            <h3>${c.title}</h3>
            <p>${c.intro}</p>
            <div class="case-footer">
              <span class="badge ${solved ? "success" : "neutral"}">${solved ? "Resolvido" : "Disponível"}</span>
              <button class="btn" data-case-id="${c.id}">Investigar</button>
            </div>
          </article>`;
      })
      .join("");

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Mapa de Casos</h2>
        <div class="case-grid">${cards}</div>
      </section>
    `;
    this.renderHud();

    document.querySelectorAll("button[data-case-id]").forEach((btn) => {
      btn.addEventListener("click", () => Game.startCase(btn.getAttribute("data-case-id")));
    });
  },

  renderParentsPanel() {
    const completed = Object.entries(Game.state.completedCases);
    const entries = completed
      .map(([caseId, result]) => {
        const caseData = Game.cases.find((c) => c.id === caseId);
        return `<li><strong>${caseData?.title || caseId}</strong> — ${result.success ? "Resolvido" : "Tentativa"} (Clues: ${result.foundClues.length})</li>`;
      })
      .join("") || "<li>Nenhum caso finalizado ainda.</li>";

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Painel dos Pais</h2>
        <p>Acompanhe o progresso do jovem detetive.</p>
        <ul class="progress-list">${entries}</ul>
      </section>
    `;
    this.renderHud();
  },

  renderSkillTree() {
    const skillCards = SKILLS.map((skill) => {
      const unlocked = Game.state.unlockedSkills.includes(skill.id);
      return `
        <article class="skill-card ${unlocked ? "unlocked" : ""}">
          <div class="skill-header">
            <h3>${skill.name}</h3>
            <span class="badge">${skill.cost} moedas</span>
          </div>
          <p>${skill.description}</p>
          <button class="btn" ${unlocked ? "disabled" : ""} data-skill="${skill.id}">${unlocked ? "Desbloqueada" : "Desbloquear"}</button>
        </article>`;
    }).join("");

    Game.app.innerHTML = `
      <section class="panel">
        <div class="hud"></div>
        <h2>Árvore de Habilidades</h2>
        <div class="skill-tree-container">${skillCards}</div>
      </section>
    `;
    this.renderHud();

    document.querySelectorAll("button[data-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const skill = SKILLS.find((s) => s.id === btn.getAttribute("data-skill"));
        if (skill) Game.unlockSkill(skill);
      });
    });
  },

  renderCase(caseData) {
    const bg = SCENE_BACKGROUNDS[caseData.scene] || "school_hallway_cartoon.png";
    const suspectCards = caseData.baseSuspects
      .map((suspect) => {
        const portrait = CHARACTER_PORTRAITS[suspect.id] || CHARACTER_PORTRAITS.bia;
        const traits = suspect.traits?.join(", ") || "";
        return `
          <article class="suspect-card">
            <img src="${portrait}" alt="${suspect.name}">
            <div>
              <h4>${suspect.name}</h4>
              <p class="traits">${traits}</p>
              <button class="btn ghost" data-dialogue="${suspect.id}">Questionar</button>
            </div>
          </article>`;
      })
      .join("");

    const solvedBanner = caseData.solved
      ? `<div class="case-status success">Caso resolvido! O culpado era ${caseData.culprit}.</div>`
      : "";

    Game.app.innerHTML = `
      <section class="case-layout">
        <div class="scene-wrapper" style="background-image: url('${bg}')">
          <div class="scene-overlay" id="scene-overlay"></div>
          ${solvedBanner}
        </div>
        <aside class="case-sidebar">
          <div class="hud"></div>
          <h2>${caseData.title}</h2>
          <p>${caseData.intro}</p>
          <div class="panel">
            <h3>Pistas encontradas</h3>
            <ul class="clue-list" id="clue-list"></ul>
          </div>
          <div class="panel">
            <h3>Personagens</h3>
            <div class="suspect-list">${suspectCards}</div>
          </div>
          <div class="panel">
            <h3>Acusar</h3>
            <select id="accuse-select" class="input">
              ${caseData.baseSuspects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
            </select>
            <button class="btn full" id="accuse-btn">Fazer acusação</button>
          </div>
        </aside>
      </section>
    `;

    this.renderHud();
    this.renderHotspots(caseData);
    this.updateClueList(caseData);

    document.querySelectorAll("button[data-dialogue]").forEach((btn) => {
      btn.addEventListener("click", () => Game.openDialogue(btn.getAttribute("data-dialogue")));
    });

    document.getElementById("accuse-btn").addEventListener("click", () => {
      const suspectId = document.getElementById("accuse-select").value;
      Game.accuse(suspectId);
    });
  },

  renderHotspots(caseData) {
    const overlay = document.getElementById("scene-overlay");
    overlay.innerHTML = "";
    const boost = Game.hasSkill("olhos_de_agua") ? 1.3 : 1;
    caseData.allClues.forEach((clue) => {
      if (!clue.hs) return; // somente pistas com hotspot visual
      const [x, y, w, h] = clue.position;
      const btn = document.createElement("button");
      btn.className = "difference-hotspot";
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.style.width = `${w * boost}%`;
      btn.style.height = `${h * boost}%`;
      btn.innerHTML = clue.hs.icon || "?";
      btn.setAttribute("aria-label", clue.text);
      btn.addEventListener("click", () => this.handleHotspotClick(clue, btn));
      overlay.appendChild(btn);
    });
  },

  handleHotspotClick(clue, element) {
    if (Game.currentCase?.foundClues.some((c) => c.id === clue.id)) {
      Toast.show("Você já coletou essa pista.", "warning");
      return;
    }

    const processSuccess = () => {
      element.classList.add("found");
      Toast.show("Pista coletada!", "success");
      Game.markClueFound(clue);
    };

    if (clue.type === "cipher" || clue.type === "pattern") {
      const message = clue.type === "cipher"
        ? "Decifre a mensagem para validar a pista"
        : clue.hint || "Resolva o padrão numérico";
      const options = clue.options?.length
        ? clue.options.map((opt) => ({ label: opt.toString(), value: opt }))
        : [];
      Modal.prompt({
        title: "Enigma",
        message,
        showInput: !options.length,
        placeholder: "Resposta...",
        options,
        onConfirm: (value) => {
          const normalized = typeof value === "string" ? value.trim() : value;
          if (normalized == clue.solution) {
            processSuccess();
          } else {
            Toast.show("Resposta incorreta. Tente novamente!", "error");
          }
        }
      });
      return;
    }

    processSuccess();
  },

  updateClueList(caseData) {
    const list = document.getElementById("clue-list");
    if (!list) return;
    if (!caseData.foundClues.length) {
      list.innerHTML = "<li>Nenhuma pista coletada ainda.</li>";
      return;
    }
    list.innerHTML = caseData.foundClues
      .map((clue) => `<li><span class="badge">${clue.type}</span> ${clue.text}</li>`)
      .join("");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Game.init();
});
