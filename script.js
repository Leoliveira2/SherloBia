// =====================================
// Module: Global State & Storage
// =====================================
const Storage = (function() {
  const KEY = 'sbia_state_v1_6'; // Updated key for new version
  const defaultState = () => ({
    user: {
      name: 'Bia',
      level: 1,
      points: 0,
      coins: 0,
      medals: [],
      settings: { largeFont: false, narration: false },
      unlockedSkills: [] // New: Array to store unlocked skill IDs
    },
    sessions: {},
    week: new Date().toISOString().slice(0, 10)
  });

  function load() {
    try {
      const stored = localStorage.getItem(KEY);
      // Merges stored state with default state to handle new properties (like unlockedSkills)
      const loadedState = stored ? JSON.parse(stored) : defaultState();
      return {
        ...defaultState(), // Ensures all default properties exist
        ...loadedState,
        user: {
          ...defaultState().user,
          ...loadedState.user,
          settings: { // Ensure settings exist and are merged
            ...defaultState().user.settings,
            ...(loadedState.user ? loadedState.user.settings : {})
          },
          unlockedSkills: loadedState.user?.unlockedSkills || [] // Ensure it's an array
        }
      };
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  return { load, save, defaultState };
})();

// =====================================
// Module: Utility Functions
// =====================================
const Utils = (function() {
  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function getCase(id) {
    return Data.CASES.find(c => c.id === id);
  }

  function getSkill(id) { // New: Get skill by ID
    return Data.SKILLS.find(s => s.id === id);
  }

  // Custom toast notification
  function addToast(txt, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${txt}</span>`;
    container.appendChild(t);

    t.offsetHeight;
    t.classList.add('show');

    setTimeout(() => {
      t.classList.remove('show');
      t.addEventListener('transitionend', () => t.remove());
    }, 2200);
  }

  // Generic Custom Modal
  function showCustomModal(title, message, optionsHtml, inputType = 'none') {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-modal');
      const modalTitle = document.getElementById('modal-title');
      const modalMessage = document.getElementById('modal-message');
      const modalInput = document.getElementById('modal-input');
      const modalOptions = document.getElementById('modal-options');

      modalTitle.textContent = title;
      modalMessage.innerHTML = message; // Changed to innerHTML to allow HTML content
      modalOptions.innerHTML = optionsHtml;

      if (inputType === 'text') {
        modalInput.style.display = 'block';
        modalInput.value = ''; // Clear previous input
        modalInput.focus();
      } else {
        modalInput.style.display = 'none';
      }

      modal.classList.add('show');

      // Add event listeners for the options (buttons or input submit)
      const handleModalClick = (e) => {
        if (e.target.dataset.value) {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(e.target.dataset.value);
        } else if (e.target.id === 'modal-confirm-input') {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(modalInput.value);
        } else if (e.target.id === 'modal-cancel-input' || e.target.dataset.action === 'cancel-modal') {
          modal.classList.remove('show');
          modalOptions.removeEventListener('click', handleModalClick);
          resolve(null); // Return null on cancel
        }
      };

      modalOptions.addEventListener('click', handleModalClick);
    });
  }

  function showConfirmationModal(message) {
    const options = `<button class="btn pri" data-value="true">Confirmar</button><button class="btn" data-value="false">Cancelar</button>`;
    return showCustomModal('🚨 Confirmar Ação', message, options);
  }

  function showPromptModal(title, message, placeholder = '') {
    const options = `<button class="btn pri" id="modal-confirm-input">Ok</button><button class="btn" id="modal-cancel-input">Cancelar</button>`;
    const originalInputDisplay = document.getElementById('modal-input').style.display; // Store original
    document.getElementById('modal-input').placeholder = placeholder;
    const promise = showCustomModal(title, message, options, 'text');
    // Restore original display after modal closes to not affect other modals
    promise.finally(() => {
        document.getElementById('modal-input').style.display = originalInputDisplay;
    });
    return promise;
  }

  function showOptionsModal(title, message, optionsArray, cancelable = true) {
    let optionsHtml = optionsArray.map((opt, idx) => `<button class="btn" data-value="${opt.value !== undefined ? opt.value : opt.label}">${opt.label}</button>`).join('');
    if (cancelable) {
        optionsHtml += `<button class="btn ghost" data-action="cancel-modal">Cancelar</button>`;
    }
    return showCustomModal(title, message, optionsHtml);
  }


  function showDialogueModal(title, message, options) {
    const optionsHtml = options.map((opt, idx) => `<button class="btn" data-value="${idx}">${opt.label}</button>`).join('');
    return showCustomModal(title, message, optionsHtml + `<button class="btn ghost" data-action="cancel-modal">Sair</button>`);
  }

  function showAccusationModal(caseData) {
    const suspectsHtml = caseData.suspects.map(s => `<button class="btn" data-value="${s.id}">${s.name}</button>`).join('');
    return showCustomModal('⚖️ Acusar Suspeito', 'Quem você acusa?', suspectsHtml + `<button class="btn ghost" data-action="cancel-modal">Cancelar</button>`);
  }


  return { fmtTime, getCase, getSkill, addToast, showConfirmationModal, showPromptModal, showDialogueModal, showAccusationModal, showOptionsModal, showInventoryModal: null }; // showInventoryModal is now in Utils, initially null, then assigned
})();

// Destructure for easier access
const { fmtTime, getCase, getSkill, addToast, showConfirmationModal, showPromptModal, showDialogueModal, showAccusationModal, showOptionsModal } = Utils;

// =====================================
// Module: Data Definitions (CASES, SKILLS)
// =====================================
const Data = (function() {
  const CASES = [
    {
      id: 'c-001', title: 'O Relógio da Escola', chapter: 1, difficulty: 1,
      intro: 'O relógio da escola sumiu minutos antes do sinal. Quem pegou?',
      suspects: [
        { id: 'zico', name: 'Zico', traits: ['brincalhão'] },
        { id: 'lia', name: 'Lia', traits: ['perfeccionista'] },
        { id: 'nara', name: 'Dona Nara', traits: ['zelosa'] }
      ],
      solution: 'zico',
      clues: [
        // k1 now requires revelation through dialogue
        { id: 'k1', text: 'Marca de graxa na porta', weight: 2, hs: { x: 8, y: 50, w: 22, h: 16, icon: '&#x1F527;' }, requiresReveal: true },
        { id: 'k2', text: 'Bilhete rasgado com a letra Z', weight: 1, requires: 'cipher', cipherText: 'Qeb troféu foi movido', hs: { x: 64, y: 28, w: 22, h: 16, icon: '&#x1F4DD;' } },
        { id: 'k3', text: 'Chave velha com etiqueta "Manutenção"', weight: 3, requires: 'pattern', patternSeq: [2, 4, 7, 11, 16], patternAnswer: 22, patternHint: '+2,+3,+4,+5...', hs: { x: 40, y: 70, w: 20, h: 16, icon: '&#x1F5DD;' }, patternOptions: [18, 20, 22, 24] },
        { id: 'z_conf', text: 'Confissão parcial de Zico', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "zico": {
          start: "z1",
          nodes: {
            "z1": {
              text: "Eu? Pegar o relógio? Só estava correndo…",
              options: [
                { label: "Perguntar sobre a graxa na porta", next: "z2", effect: { award: "z_conf", revealHotspot: "k1" } },
                { label: "Onde você estava às 10:10?", next: "z3" }
              ]
            },
            "z2": {
              text: "Tá… fui olhar a sala da manutenção. Tentei consertar o relógio.",
              options: [{ label: "Você mexeu no relógio?", next: "z4", effect: { award: "z_conf" } }]
            },
            "z3": { text: "Na Educação Física! Pergunta pra Lia.", options: [{ label: "Voltar", next: "z1" }] },
            "z4": { text: "Eu só queria ajudar! Não roubei nada.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "lia": {
          start: "l1",
          nodes: {
            "l1": {
              text: "Eu gosto de tudo certinho. Se o relógio sumiu, alguém bagunçou.",
              options: [{ label: "Viu alguém no corredor?", next: "l2" }, { label: "Tinha bilhete no quadro?", next: "l3" }]
            },
            "l2": { text: "Vi o Zico saindo da manutenção com as mãos sujas.", options: [{ label: "Encerrar", end: true }] },
            "l3": { text: "Tinha um bilhete rasgado… com a letra Z.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: corredor principal, porta da manutenção e quadro de avisos.',
      scene: 'corridor'
    },
    {
      id: 'c-002', title: 'O Mistério do Bolo', chapter: 1, difficulty: 2,
      intro: 'O bolo da diretora foi trocado por um de areia!',
      suspects: [
        { id: 'nino', name: 'Nino', traits: ['arteiro'] },
        { id: 'bia2', name: 'Bia 2', traits: ['curiosa'] },
        { id: 'teo', name: 'Chef Téo', traits: ['cozinheiro'] }
      ],
      solution: 'nino',
      clues: [
        { id: 'b1', text: 'Migalhas coloridas no chão', weight: 2, hs: { x: 30, y: 74, w: 20, h: 14, icon: '&#x1F36E;' } },
        { id: 'b2', text: 'Foto borrada de alguém na cozinha', weight: 2, requires: 'cipher', cipherText: 'Cozinha suja de farinha', hs: { x: 62, y: 30, w: 24, h: 16, icon: '&#x1F4F8;' } },
        { id: 'b3', text: 'Luvas pequenas atrás do palco', weight: 3, requires: 'pattern', patternSeq: [1, 2, 4, 8, 16], patternAnswer: 32, patternHint: 'Multiplicação por 2', hs: { x: 10, y: 50, w: 22, h: 16, icon: '&#x1F9E4;' }, patternOptions: [24, 28, 32, 36] }
      ],
      dialogues: {
        "nino": {
          start: "n1", nodes: {
            "n1": {
              text: "Eu? Nunca! Mas areia é engraçada, né?",
              options: [{ label: "Isso é uma confissão?", next: "n2" }, { label: "Onde você estava?", next: "n3" }]
            },
            "n2": { text: "Tá, eu troquei… era só uma brincadeira!", options: [{ label: "Encerrar", end: true }] },
            "n3": { text: "Eu estava na quadra. Pergunta pro Téo.", options: [{ label: "Voltar", next: "n1" }] }
          }
        },
        "teo": {
          start: "t1", nodes: {
            "t1": { text: "Na minha cozinha? Só com autorização!", options: [{ label: "Viu alguém?", next: "t2" }] },
            "t2": { text: "Um garoto pequeno com luvas…", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: salão de festas com cozinha ao fundo.',
      scene: 'kitchen'
    },
    {
      id: 'c-003', title: 'O Troféu Desaparecido', chapter: 2, difficulty: 3,
      intro: 'O troféu da olimpíada escolar sumiu da vitrine.',
      suspects: [
        { id: 'mara', name: 'Mara', traits: ['competitiva'] },
        { id: 'gui', name: 'Gui', traits: ['distraído'] },
        { id: 'jorge', name: 'Jorge', traits: ['zelador'] }
      ],
      solution: 'mara',
      clues: [
        { id: 't1', text: 'Pegada com sola em estrela', weight: 2, hs: { x: 74, y: 70, w: 20, h: 16, icon: '&#x1F463;' } },
        { id: 't2', text: 'Mapa com um X na quadra', weight: 2, requires: 'pattern', patternSeq: [100, 50, 25, 12.5], patternAnswer: 6.25, patternHint: 'Divisão por 2', hs: { x: 10, y: 28, w: 22, h: 16, icon: '&#x1F5FA;' }, patternOptions: [5, 6.25, 7.5, 10] },
        { id: 't3', text: 'Bilhete cifrado "Qeb troféu..."', weight: 3, requires: 'cipher', cipherText: 'Wkh wurohx zdv pdqdjhg', hs: { x: 46, y: 38, w: 22, h: 16, icon: '&#x1F4DD;' } }
      ],
      dialogues: {
        "mara": {
          start: "m1", nodes: {
            "m1": {
              text: "Se eu tivesse o troféu, mostraria!",
              options: [{ label: "Sobre a pegada de estrela", next: "m2" }, { label: "Quem tem acesso à vitrine?", next: "m3" }]
            },
            "m2": { text: "Tênis novos. Posso ter passado por lá…", options: [{ label: "Encerrar", end: true }] },
            "m3": { text: "Só o Jorge e a diretora. Eu não.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: saguão da escola com vitrine de troféus.',
      scene: 'hall'
    },
    {
      id: 'c-004', title: 'A Chave da Biblioteca Perdida', chapter: 2, difficulty: 2,
      intro: 'A chave mestra da biblioteca sumiu. Onde ela foi parar?',
      suspects: [
        { id: 'ana', name: 'Ana', traits: ['distraída'] },
        { id: 'caio', name: 'Professor Caio', traits: ['zeloso'] },
        { id: 'rosa', name: 'Dona Rosa', traits: ['organizada'] }
      ],
      solution: 'caio',
      clues: [
        // Updated to use the image as hotspot icon
        { id: 'l1', text: 'Livro com anotações sobre a chave', weight: 2, hs: { x: 15, y: 40, w: 20, h: 16, icon: '<img src="./assets/pista_chave_biblioteca.png" alt="Chave da Biblioteca" class="clue-icon"/>' }, requiresReveal: true },
        { id: 'l2', text: 'Bilhete cifrado sobre o livro', weight: 3, requires: 'cipher', cipherText: 'Fqhu zlv qd elhqd', hs: { x: 60, y: 25, w: 24, h: 18, icon: '&#x1F4DD;' } },
        { id: 'l3', text: 'Criptograma no pedestal', weight: 2, requires: 'pattern', patternSeq: [1, 3, 6, 10, 15], patternAnswer: 21, patternHint: '+2,+3,+4,+5...', hs: { x: 80, y: 60, w: 20, h: 16, icon: '&#x1F5D2;' }, patternOptions: [18, 20, 21, 23] },
        { id: 'caio_conf', text: 'Confissão parcial do Professor Caio', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "ana": {
          start: "a1", nodes: {
            "a1": {
              text: "Eu estava aqui. Tentei arrumar os livros mas me perdi. Acho que deixei a chave em algum lugar...",
              options: [{ label: "Onde você a deixou?", next: "a2" }, { label: "Viu alguém estranho?", next: "a3" }]
            },
            "a2": { text: "Pode estar em algum livro ou no pedestal.", options: [{ label: "Encerrar", end: true }] },
            "a3": { text: "Vi o Professor Caio olhando o pedestal.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "caio": {
          start: "c1", nodes: {
            "c1": {
              text: "Estava verificando os livros de ciência. Aquela chave... não era minha.",
              options: [{ label: "Onde você a pegou?", next: "c2" }, { label: "Por que você a escondeu?", next: "c3", effect: { revealHotspot: 'l1' } }] // Corrected to reveal l1
            },
            "c2": { text: "Encontrei no chão. Achei que era uma pista para um desafio da gincana.", options: [{ label: "Encerrar", end: true }] },
            "c3": { text: "Escondi a chave atrás do livro 'Mistérios da Biologia'. Não queria que ninguém a pegasse. Pensei que era um jogo.", options: [{ label: "Voltar", next: "c1", effect: { award: "caio_conf" } }] }
          }
        }
      },
      description: 'Cena: biblioteca escolar com estantes e um pedestal no centro.',
      scene: 'library'
    },
    {
      id: 'c-005', title: 'O Tesouro do Jardim', chapter: 3, difficulty: 3,
      intro: 'Uma caixa de tesouro da diretora, cheia de moedas de chocolate, foi escondida no jardim.',
      suspects: [
        { id: 'lucas', name: 'Lucas', traits: ['jardineiro'] },
        { id: 'mariana', name: 'Mariana', traits: ['competitiva'] },
        { id: 'joao', name: 'João', traits: ['calmo'] }
      ],
      solution: 'joao',
      clues: [
        { id: 'g1', text: 'Pá com terra diferente', weight: 2, hs: { x: 78, y: 75, w: 20, h: 16, icon: '&#x1F530;' } },
        { id: 'g2', text: 'Bilhete rasgado com uma pista', weight: 3, requiresReveal: true, hs: { x: 18, y: 55, w: 20, h: 16, icon: '&#x1F4DD;' } },
        { id: 'g3', text: 'Caixa de madeira com um padrão', weight: 3, requires: 'pattern', patternSeq: [5, 10, 15, 20, 25], patternAnswer: 30, patternHint: 'Multiplicação de 5', hs: { x: 50, y: 40, w: 20, h: 16, icon: '&#x1F4E6;' }, patternOptions: [28, 30, 32, 35] },
        { id: 'joao_conf', text: 'Confissão de João', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "lucas": {
          start: "l1", nodes: {
            "l1": {
              text: "Eu estava cuidando das plantas, não vi nada. Mas alguém mexeu na minha pá.",
              options: [{ label: "Onde?", next: "l2", effect: { revealHotspot: "g2" } }, { label: "Quem estava no jardim?", next: "l3" }]
            },
            "l2": { text: "No canteiro de flores. Encontrei um bilhete que estava enterrado ali.", options: [{ label: "Onde está o bilhete?", next: "l4" }] },
            "l3": { text: "Vi o João por perto, ele gosta de coisas escondidas.", options: [{ label: "Encerrar", end: true }] },
            "l4": { text: "Eu o rasguei, mas posso te dar um pedaço. Estava escrito 'próximo ao...', não lembro mais.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "joao": {
          start: "j1", nodes: {
            "j1": {
              text: "O tesouro? Foi só uma brincadeira. Eu só queria ver se alguém era esperto o suficiente pra achar. Está na quadra de basquete.",
              options: [{ label: "Por que você o escondeu?", next: "j2", effect: { award: "joao_conf" } }]
            },
            "j2": { text: "Só queria que todos participassem da caça ao tesouro!", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: jardim escolar com flores, canteiro e uma pá.',
      scene: 'garden'
    },
    {
      id: 'c-006', title: 'O Livro de Magia Sumiu', chapter: 3, difficulty: 4,
      intro: 'O livro de feitiços de brinquedo da sala de artes desapareceu. Quem o levou?',
      suspects: [
        { id: 'gabi', name: 'Gabi', traits: ['sonhadora'] },
        { id: 'leo', name: 'Leo', traits: ['cético'] },
        { id: 'arthur', name: 'Professor Arthur', traits: ['brincalhão'] }
      ],
      solution: 'gabi',
      clues: [
        { id: 'm1', text: 'Resíduo de pó mágico no chão', weight: 2, hs: { x: 25, y: 70, w: 20, h: 16, icon: '&#x1F4D9;' } },
        { id: 'm2', text: 'Nota com instruções de feitiço', weight: 3, requires: 'cipher', cipherText: 'Vw rwd qhdwv vwrslwv', hs: { x: 70, y: 30, w: 24, h: 18, icon: '&#x1F4DD;' } },
        { id: 'm3', text: 'Cristais com uma sequência de cores', weight: 3, requires: 'pattern', patternSeq: [1, 1, 2, 3, 5, 8], patternAnswer: 13, patternHint: 'Sequência de Fibonacci', hs: { x: 45, y: 55, w: 22, h: 16, icon: '&#x1F52E;' }, patternOptions: [11, 12, 13, 14] },
        { id: 'gabi_conf', text: 'Confissão de Gabi', weight: 2, isHiddenHotspot: true }
      ],
      dialogues: {
        "gabi": {
          start: "g1", nodes: {
            "g1": {
              text: "O livro? Eu só o levei emprestado para praticar a magia em casa. Não achei que fosse sumir de verdade. Ele está na sala dos professores.",
              options: [{ label: "Você viu alguém lá?", next: "g2", effect: { award: "gabi_conf" } }, { label: "Onde você o escondeu?", next: "g3" }]
            },
            "g2": { text: "Eu estava sozinha.", options: [{ label: "Encerrar", end: true }] },
            "g3": { text: "Achei que o Professor Arthur ia gostar. Deixei perto da mesa dele.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "leo": {
          start: "l1", nodes: {
            "l1": {
              text: "Mágica não existe. Alguém só o pegou para fazer uma brincadeira.",
              options: [{ label: "Você sabe quem?", next: "l2" }, { label: "Como você sabe que é uma brincadeira?", next: "l3" }]
            },
            "l2": { text: "Vi a Gabi na sala depois da aula.", options: [{ label: "Encerrar", end: true }] },
            "l3": { text: "O pó de purpurina no chão mostra que é só diversão.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: sala de artes com um baú de tesouro e um quadro de anotações.',
      scene: 'music_room' // Mapped to music_room_cartoon.png
    },
    {
      id: 'c-007', title: 'O Quadro Escondido', chapter: 4, difficulty: 3,
      intro: 'Um quadro valioso da galeria da escola foi misteriosamente virado para a parede. Quem o fez?',
      suspects: [
        { id: 'pedro', name: 'Pedro', traits: ['artista', 'sensível'] },
        { id: 'carla', name: 'Carla', traits: ['crítica', 'direta'] },
        { id: 'diretora', name: 'Diretora Ana', traits: ['ocupada', 'séria'] }
      ],
      solution: 'pedro',
      clues: [
        { id: 'd1', text: 'Pincel sujo de tinta vermelha no chão', weight: 2, hs: { x: 10, y: 80, w: 18, h: 12, icon: '&#x1F58C;&#xFE0F;' } },
        { id: 'd2', text: 'Rabiscos estranhos numa folha de papel', weight: 3, requires: 'difference', diffId: 'diff_quadro', hs: { x: 70, y: 20, w: 20, h: 15, icon: '&#x1F4DF;' } }, // New: Difference game
        { id: 'd3', text: 'Mensagem secreta em código Morse', weight: 2, requires: 'cipher', cipherText: '.-.- .--. --- .--.- ..- .', hs: { x: 30, y: 35, w: 25, h: 18, icon: '&#x1F4E9;' } } // Example Morse: 'PORQUE'
      ],
      dialogues: {
        "pedro": {
          start: "p1", nodes: {
            "p1": {
              text: "Eu? Virar um quadro? Eu amo arte! Mas... talvez eu não estivesse num bom dia.",
              options: [{ label: "Sobre o pincel sujo", next: "p2", effect: { award: "pedro_conf", revealHotspot: 'd1' } }]
            },
            "p2": { text: "Ah, sim. Estava a pintar e... escorregou da minha mão. Não viraria o quadro de propósito.", options: [{ label: "Encerrar", end: true }] }
          }
        },
        "carla": {
          start: "c1", nodes: {
            "c1": {
              text: "Aquele quadro não é dos meus favoritos. A cor... muito forte. Mas virá-lo? Que bobagem.",
              options: [{ label: "Viu alguém perto da galeria?", next: "c2" }]
            },
            "c2": { text: "Vi o Pedro a sair da galeria. Ele parecia chateado.", options: [{ label: "Encerrar", end: true }] }
          }
        }
      },
      description: 'Cena: galeria de arte da escola com quadros e um pequeno banco.',
      scene: 'hall' // Reusing hall for now, but could be new 'gallery' scene
    }
  ];

  const SCENE_BACKGROUNDS = {
    'corridor': './assets/school_hallway_cartoon.png',
    'kitchen': './assets/kitchen_cartoon.png',
    'hall': './assets/hall_cartoon.png',
    'library': './assets/library_cartoon.png',
    'garden': './assets/garden_cartoon.png',
    'music_room': './assets/music_room_cartoon.png'
  };

  const SKILLS = [ // New: Skill definitions
    {
      id: 'dica_barata',
      name: 'Mente Económica',
      description: 'As dicas inteligentes custam apenas 0 moedas.', // No cost
      cost: 5,
      effect: { type: 'hint_cost_reduction', value: 1 }, // Reduces hint cost by 1 (to 0)
      icon: '💡'
    },
    {
      id: 'olho_clinico',
      name: 'Olho Clínico',
      description: 'Pistas "ocultas" (reveladas por diálogo) são visíveis desde o início no mapa.',
      cost: 8,
      effect: { type: 'reveal_all_hotspots' },
      icon: '👁️'
    },
    {
      id: 'detetive_rapido',
      name: 'Detetive Rápido',
      description: 'Aumenta a sua chance de conseguir a medalha "Relâmpago" ao dar um bónus de 50 pontos de tempo.',
      cost: 10,
      effect: { type: 'time_bonus_increase', value: 50 },
      icon: '⚡'
    }
  ];

  function decodeCaesar(s, shift) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const portugueseAlphabet = 'ÁÂÃÀÉÊÍÓÔÕÚÇ';
    const fullAlphabet = alphabet + portugueseAlphabet;
    const fullAlphabetLower = fullAlphabet.toLowerCase();

    return s.split('').map(ch => {
      let charIndex = fullAlphabet.indexOf(ch);
      let isUpperCase = true;

      if (charIndex === -1) {
        charIndex = fullAlphabetLower.indexOf(ch);
        isUpperCase = false;
      }

      if (charIndex !== -1) {
        const currentAlphabet = isUpperCase ? fullAlphabet : fullAlphabetLower;
        const newIndex = (charIndex - shift + currentAlphabet.length) % currentAlphabet.length;
        return currentAlphabet[newIndex];
      }
      return ch;
    }).join('');
  }

  // New: Define difference data for difference games
  // This would typically involve two images and coordinates for differences
  // For now, using a simplified model with SVG differences as placeholders
  const DIFFERENCES = {
    'diff_quadro': {
      image1: './assets/quadro_original.png', // Placeholder for Image 1
      image2: './assets/quadro_virado.png',   // Placeholder for Image 2
      // Differences are relative to a 500x300 image size, adjust if image size changes
      // Format: { x, y, width, height }
      diffAreas: [
        { x: 50, y: 50, width: 80, height: 40, found: false },   // Example difference 1
        { x: 200, y: 150, width: 60, height: 30, found: false }, // Example difference 2
        { x: 350, y: 220, width: 90, height: 50, found: false }  // Example difference 3
      ]
    }
    // Add more difference games here
  };


  return { CASES, SCENE_BACKGROUNDS, SKILLS, decodeCaesar, DIFFERENCES };
})();

// =====================================
// Module: Game State Management
// =====================================
const GameState = (function() {
  let state = Storage.load();

  function getState() { return state; }
  function setState(newState) { state = newState; Storage.save(state); }

  function updateUser(updates) {
    state.user = { ...state.user, ...updates };
    Storage.save(state);
  }

  function getSession(caseId) {
    return state.sessions[caseId] || null;
  }

  function updateSession(caseId, updates) {
    if (!state.sessions[caseId]) {
      state.sessions[caseId] = {
        caseId, start: Date.now(), status: 'open',
        clues: [], errors: 0, hints: 0,
        sessionId: `session_${caseId}_${Date.now()}`,
        revealedHotspots: [],
        differenceGameStates: {} // New: Store states for difference games
      };
    }
    state.sessions[caseId] = { ...state.sessions[caseId], ...updates };
    Storage.save(state);
  }

  function hasSkill(skillId) { // New: Check if user has a skill
    return state.user.unlockedSkills.includes(skillId);
  }

  return { getState, setState, updateUser, getSession, updateSession, hasSkill };
})();

// =====================================
// Module: Scene Rendering with Cartoon Backgrounds
// =====================================
const SceneRenderer = (function() {

  function buildScene(caseData, session) {
    const sceneType = caseData.scene || 'corridor';
    const backgroundImage = getSceneBackground(sceneType);

    // Apply "Olho Clínico" skill effect
    const revealAllHotspots = GameState.hasSkill('olho_clinico');

    const hotspots = caseData.clues
      .filter(clue => {
        if (!clue.hs || session.clues.includes(clue.id)) return false;
        // If "Olho Clínico" is active, or if clue doesn't require revelation, or if it has been revealed
        if (revealAllHotspots) return true;
        if (clue.requiresReveal) {
          return session.revealedHotspots && session.revealedHotspots.includes(clue.id);
        }
        return true;
      })
      .map(clue => {
        const { x, y, w, h, icon } = clue.hs; // Get the icon from clue.hs
        return `<div class="hotspot" style="left:${x}%; top:${y}%; width:${w}%; height:${h}%;"
                data-action="tap-clue" data-clue-id="${clue.id}" data-session-id="${session.sessionId}" data-case-id="${caseData.id}">${icon}</div>`;
      }).join('');

    return `
      <div class="scene">
        <img src="${backgroundImage}" alt="Cenário ${sceneType}" class="scene-background" onerror="this.src='https://placehold.co/1200x400/0b1020/e6edf7?text=Cenário+não+encontrado';" />
        ${buildSceneSVG(sceneType)}
        ${hotspots}
      </div>
    `;
  }

  function getSceneBackground(sceneType) {
    const backgrounds = Data.SCENE_BACKGROUNDS;
    return backgrounds[sceneType] || 'https://placehold.co/1200x400/0b1020/e6edf7?text=Cenário+não+encontrado';
  }

  function buildSceneSVG(kind) {
    if (kind === 'corridor') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="180" y="80" width="180" height="170" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
          <rect x="790" y="50" width="300" height="150" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="12" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'kitchen') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="50" y="160" width="150" height="120" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="8" opacity="0.5"/>
          <ellipse cx="600" cy="210" rx="60" ry="25" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'library') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="100" y="50" width="250" height="300" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
          <rect x="750" y="50" width="250" height="300" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
        </svg>
      `;
    }
    if (kind === 'garden') {
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <path d="M50 350 Q 150 250, 300 350 T 600 350 T 900 350 T 1150 350" stroke="#93c5fd" stroke-width="2" fill="none" stroke-dasharray="5,5"/>
          <circle cx="200" cy="200" r="40" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
        </svg>
      `;
    }
    if (kind === 'music_room') { // Changed from magic_classroom
      return `
        <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
          <rect x="100" y="150" width="180" height="150" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10"/>
          <path d="M400 100 L500 150 L400 200 Z" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
          <circle cx="700" cy="200" r="60" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5"/>
        </svg>
      `;
    }

    // Default SVG if kind is not matched
    return `
      <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
        <rect x="80" y="80" width="280" height="200" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="10" opacity="0.5"/>
        <rect x="450" y="80" width="300" height="210" fill="transparent" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5,5" rx="15" opacity="0.5"/>
      </svg>
    `;
  }

  return { buildScene };
})();

// =====================================
// Module: UI Rendering
// =====================================
const UI = (function() {
  function render(html) {
    document.getElementById('app').innerHTML = html;
  }

  function renderWelcome(state) {
    render(`
      <div class="welcome">
        <div class="logo">🕵️‍♀️ Sherlock Bia</div>
        <p>Bem-vinda, <strong>${state.user.name}</strong>! Você está no nível <strong>${state.user.level}</strong>.</p>
        <div class="stats">
          <div class="stat">⭐ ${state.user.points} pontos</div>
          <div class="stat">🪙 ${state.user.coins} moedas</div>
          <div class="stat">🏆 ${state.user.medals.length} medalhas</div>
        </div>
        <div class="row" style="margin-top:20px">
          <button class="btn pri" data-action="go-hub">🗺️ Começar Investigação</button>
          <button class="btn" data-action="go-parents">👪 Painel dos Pais</button>
        </div>
        <div class="row" style="margin-top:10px">
          <label class="switch" for="fontToggle">
            <input id="fontToggle" type="checkbox" data-action="toggle-font" ${state.user?.settings?.largeFont ? 'checked' : ''}>
            <span class="small">Fonte grande</span>
          </label>
        </div>
      </div>
    `);
  }

  function renderHub(state) {
    const cards = Data.CASES.map(c => {
      const session = GameState.getSession(c.id);
      const stars = session?.result?.stars || 0;
      // In this version, no cases are explicitly locked by default
      const isLocked = false;

      return `
        <div class="card ${isLocked ? 'locked' : ''}">
          <h3>${c.title}</h3>
          <div class="row">
            <span class="badge">Cap. ${c.chapter}</span>
            <span class="badge">Dif. ${c.difficulty}</span>
            ${stars > 0 ? `<span class="badge" style="color:var(--gold)">⭐ ${stars}</span>` : ''}
          </div>
          <p class="small">${c.intro}</p>
          <div class="row" style="margin-top:8px">
            ${isLocked ?
              '<button class="btn" disabled>🔒 Bloqueado</button>' :
              `<button class="btn pri" data-action="start-case" data-case-id="${c.id}">🔍 Investigar</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    render(`
      <div class="grid">
        ${cards}
      </div>
      <div class="row" style="margin-top:16px; justify-content:center">
        <button class="btn" data-action="go-welcome">⟵ Voltar ao Início</button>
      </div>
    `);
  }

  function renderCase(caseData, state) {
    let session = GameState.getSession(caseData.id);
    if (!session) {
      GameState.updateSession(caseData.id, {
          caseId: caseData.id,
          start: Date.now(),
          status: 'open',
          clues: [],
          errors: 0,
          hints: 0,
          revealedHotspots: [],
          differenceGameStates: {}
      });
      session = GameState.getSession(caseData.id);
    }

    const currentSession = session;
    const cluesFound = currentSession.clues || [];
    const timeSpent = currentSession.timeSpent || (currentSession.start ? Math.floor((Date.now() - currentSession.start) / 1000) : 0);

    const essentialClues = caseData.clues.filter(clue => !clue.isHiddenHotspot);
    const essentialCluesFound = essentialClues.filter(clue => cluesFound.includes(clue.id));

    const suspectsList = caseData.suspects
      .map(suspect => `
        <button class="btn" data-action="talk-suspect" data-suspect-id="${suspect.id}" data-case-id="${caseData.id}">
          💬 ${suspect.name}
        </button>
      `).join('');

    render(`
      <div class="card">
        <h3>${caseData.title}</h3>
        <p>${caseData.intro}</p>
        <div class="stats">
          <div class="stat">⏱️ <b id="timer">${fmtTime(timeSpent)}</b></div>
          <div class="stat">🔍 ${cluesFound.length}/${caseData.clues.length} pistas</div>
          <div class="stat">❌ <b id="err">${currentSession.errors || 0}</b> erros</div>
        </div>
      </div>

      ${SceneRenderer.buildScene(caseData, currentSession)}

      <div class="row" style="margin-top:8px">
        ${(caseData.clues || []).filter(k => !k.hs && !k.isHiddenHotspot).map(k => {
            const found = currentSession.clues.includes(k.id);
            return `<button class="btn" data-action="tap-clue" data-session-id="${currentSession.sessionId}" data-clue-id="${k.id}" data-case-id="${caseData.id}">${found ? '✔️' : k.hs.icon || '🔍'} ${k.text}</button>`
        }).join('')}
      </div>

      <hr>

      <div class="grid">
        <button class="card" data-action="open-inventory">
          <h3>🎒 Inventário de Pistas (${essentialCluesFound.length}/${essentialClues.length})</h3>
          <p class="small">Clique para ver suas pistas e itens coletados.</p>
        </button>
        <div class="card">
          <h3>👥 Interrogatórios</h3>
          <p class="small">Converse para obter pistas (respostas certas liberam itens).</p>
          <div class="row" style="flex-wrap:wrap; gap:8px">
            ${suspectsList}
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn pri" data-action="make-accusation" data-case-id="${caseData.id}" data-session-id="${currentSession.sessionId}">⚖️ Fazer Acusação</button>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top:16px; justify-content:center">
        <button class="btn" data-action="go-hub">⟵ Voltar ao Mapa</button>
        <button class="btn ghost" data-action="give-hint" data-session-id="${currentSession.sessionId}">✨ Dica Inteligente (-${GameState.hasSkill('dica_barata') ? '0' : '1'} moeda)</button>
      </div>
    `);
     MainApp.startTimer(currentSession.sessionId);
  }

  function renderResult(caseId, res) {
    render(`
      <div class="card">
        <h3>✅ Caso resolvido!</h3>
        <p>Pontuação: <b>${res.score}</b> • Estrelas: ${'⭐'.repeat(res.stars)}</p>
        <p class="small">Condições: ${res.allFound ? 'Todas as pistas; ' : ''}${res.clean ? 'sem erros/dicas; ' : ''}${res.fast ? 'rápido; ' : ''}</p>
        <div class="row">
          <button class="btn pri" data-action="go-hub">Concluir</button>
          <button class="btn" data-action="start-case" data-case-id="${caseId}">Rejogar</button>
        </div>
      </div>
    `);
    MainApp.stopTimer();
  }


  function renderParents(state) {
    const rows = Object.values(state.sessions).map(s => {
      const c = getCase(s.caseId) || { title: '(Caso removido)' };
      const t = s.timeSpent || (s.start ? Math.floor((Date.now() - s.start) / 1000) : 0);
      return `<tr><td>${new Date(s.start || Date.now()).toLocaleDateString()}</td><td>${c.title}</td><td>${s.status || 'open'}</td><td>${fmtTime(t)}</td><td>${s.errors || 0}</td><td>${s.hints || 0}</td><td>${s.result ? s.result.stars : '-'}</td></tr>`;
    }).join('') || `<tr><td colspan="7" class="small">Sem dados ainda…</td></tr>`;

    render(`
      <div class="card">
        <h3>👪 Painel dos Pais</h3>
        <div class="row" style="justify-content:space-between">
          <label class="switch" for="narToggle">
            <input id="narToggle" type="checkbox" data-action="toggle-narration" ${state.user?.settings?.narration ? 'checked' : ''}>
            <span class="small">Leitura em voz alta (mock)</span>
          </label>
          <label class="switch" for="fontToggle2">
            <input id="fontToggle2" type="checkbox" data-action="toggle-font" ${state.user?.settings?.largeFont ? 'checked' : ''}>
            <span class="small">Fonte grande</span>
          </label>
        </div>
        <table class="table" style="margin-top:8px">
          <tr><th>Data</th><th>Caso</th><th>Status</th><th>Tempo</th><th>Erros</th><th>Dicas</th><th>⭐</th></tr>
          ${rows}
        </table>
        <div class="row" style="margin-top:10px"><button class="btn" data-action="go-hub">⟵ Voltar</button></div>
      </div>
    `);
  }

  function renderSkillTree(state) { // New: Render skill tree UI
    const skillsHtml = Data.SKILLS.map(skill => {
      const isUnlocked = state.user.unlockedSkills.includes(skill.id);
      const canAfford = state.user.coins >= skill.cost;
      return `
        <div class="skill-card ${isUnlocked ? 'unlocked' : ''}">
          <h4>${skill.icon} ${skill.name}</h4>
          <p>${skill.description}</p>
          <div class="skill-cost">${isUnlocked ? 'Desbloqueada' : `Custo: 🪙 ${skill.cost}`}</div>
          <div class="skill-action">
            ${isUnlocked
              ? '<button class="btn" disabled>✔️ Desbloqueada</button>'
              : `<button class="btn pri" data-action="purchase-skill" data-skill-id="${skill.id}" ${canAfford ? '' : 'disabled'}>Comprar</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    render(`
      <div class="skill-tree-container">
        <h2>🌟 Árvore de Habilidades da Bia</h2>
        <p>Gaste as suas moedas para desbloquear novas habilidades e tornar a Bia uma detetive ainda melhor!</p>
        <p class="stats">Moedas atuais: 🪙 ${state.user.coins}</p>
        <div class="skill-grid">
          ${skillsHtml}
        </div>
        <div class="row" style="margin-top:20px; justify-content:center">
          <button class="btn" data-action="go-welcome">⟵ Voltar ao Início</button>
        </div>
      </div>
    `);
  }

  return { render, renderWelcome, renderHub, renderCase, renderParents, renderResult, renderSkillTree };
})();

// =====================================
// Module: Game Logic
// =====================================
const GameLogic = (function() {

  async function handleClueClick(clueId, sessionId, caseId) {
    const caseData = getCase(caseId);
    const clue = caseData.clues.find(c => c.id === clueId);
    const session = GameState.getSession(caseId);

    if (!clue || session.clues.includes(clueId)) {
      addToast('Pista já registada ou inválida.', 'info');
      return;
    }

    let clueResolved = false;
    if (clue.requires === 'cipher') {
      const answer = await showPromptModal('🧩 Cifra de César', `Decifre: ${clue.cipherText}\nDica: Deslocamento de 3 letras para trás.`, 'Digite o texto decifrado...');
      if (answer === null) {
          addToast('Cifra cancelada.', 'info');
          return;
      }
      const expected = Data.decodeCaesar(clue.cipherText, 3).toLowerCase();
      if (answer.trim().toLowerCase() === expected) {
        addToast('✅ Cifra resolvida!');
        clueResolved = true;
      } else {
        addToast('❌ Resposta incorreta!', 'error');
        GameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
      }
    } else if (clue.requires === 'pattern') {
        const optionsToDisplay = clue.patternOptions || generatePatternOptions(clue.patternAnswer);
        const choice = await showOptionsModal('🧩 Padrões & Sequências', `Complete a sequência: ${clue.patternSeq.join(', ')}, ??\nDica: ${clue.patternHint}`,
            optionsToDisplay.map(opt => ({ label: String(opt), value: opt }))
        );

        if (choice === null) {
            addToast('Padrão cancelado.', 'info');
            return;
        }

        if (parseFloat(choice) === clue.patternAnswer) {
            addToast('✅ Padrão resolvido!');
            clueResolved = true;
        } else {
            addToast('❌ Resposta incorreta!', 'error');
            GameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
        }
    } else if (clue.requires === 'difference') { // New: Handle difference game
        const diffGameData = Data.DIFFERENCES[clue.diffId];
        if (!diffGameData) {
            addToast('Dados do jogo de diferenças não encontrados!', 'danger');
            return;
        }
        await handleDifferenceGame(clue, caseData, session, diffGameData);
        // After the difference game, check if the clue is resolved
        if (session.clues.includes(clueId)) {
          clueResolved = true;
        } else {
          // If the difference game was not fully solved or cancelled,
          // we don't mark the clue as resolved yet.
          return; // Exit here and re-render the case
        }
    } else {
      clueResolved = true;
    }

    if (clueResolved) {
      session.clues.push(clueId);
      GameState.updateSession(caseId, { clues: session.clues });
      addToast(`🔍 Pista encontrada: ${clue.text}`);
    }

    UI.renderCase(caseData, GameState.getState());
  }

  function generatePatternOptions(correctAnswer) {
      const options = new Set();
      options.add(correctAnswer);
      options.add(correctAnswer - 2);
      options.add(correctAnswer + 2);
      if (correctAnswer > 0) options.add(correctAnswer / 2);
      options.add(correctAnswer * 2);

      const sortedOptions = Array.from(options).sort((a, b) => a - b);
      if (sortedOptions.length > 5) {
          return sortedOptions.slice(0, 5);
      }
      return sortedOptions;
  }

  async function handleSuspectTalk(suspectId, caseId) {
    const caseData = getCase(caseId);
    const dialogue = caseData.dialogues[suspectId];

    if (!dialogue) {
      addToast('Este suspeito não tem nada a dizer.', 'info');
      return;
    }

    let currentNodeId = dialogue.start;
    let keepTalking = true;

    while (keepTalking) {
      const node = dialogue.nodes[currentNodeId];
      if (!node) {
        addToast('Fim do diálogo.', 'info');
        keepTalking = false;
        break;
      }

      const options = node.options || [];
      const choiceIndex = await showDialogueModal(`💬 Interrogando: ${caseData.suspects.find(s=>s.id===suspectId).name}`, node.text, options);

      if (choiceIndex === null || choiceIndex === undefined) {
        keepTalking = false;
        addToast('Conversa encerrada.', 'info');
        break;
      }

      const selectedOption = options[parseInt(choiceIndex)];

      if (selectedOption) {
        if (selectedOption.effect?.award) {
          const session = GameState.getSession(caseId);
          if (!session.clues.includes(selectedOption.effect.award)) {
            session.clues.push(selectedOption.effect.award);
            GameState.updateSession(caseId, { clues: session.clues });
            addToast(`🔍 Nova pista obtida através do diálogo: "${getCase(caseId).clues.find(c => c.id === selectedOption.effect.award).text}"`);
          } else {
            addToast('Já tem esta pista.', 'info');
          }
        }
        if (selectedOption.effect?.revealHotspot) {
          const session = GameState.getSession(caseId);
          if (!session.revealedHotspots.includes(selectedOption.effect.revealHotspot)) {
            session.revealedHotspots.push(selectedOption.effect.revealHotspot);
            GameState.updateSession(caseId, { revealedHotspots: session.revealedHotspots });
            addToast(`🔍 Novo local de interesse revelado!`);
          }
        }

        if (selectedOption.end) {
          addToast('Diálogo encerrado.', 'info');
          keepTalking = false;
        } else if (selectedOption.next) {
          currentNodeId = selectedOption.next;
        } else {
          keepTalking = false;
          addToast('Opção inválida ou diálogo encerrado.', 'info');
        }
      } else {
        keepTalking = false;
        addToast('Opção inválida ou diálogo encerrado.', 'info');
      }
    }
    UI.renderCase(caseData, GameState.getState());
  }


  async function handleAccusation(caseId, sessionId) {
    const caseData = getCase(caseId);
    const session = GameState.getSession(caseId);

    const accusedSuspectId = await showAccusationModal(caseData);

    if (accusedSuspectId === null) {
      addToast('Acusação cancelada.', 'info');
      return;
    }

    const isCorrect = accusedSuspectId === caseData.solution;

    if (!session.timeSpent && session.start) {
      session.timeSpent = Math.floor((Date.now() - session.start) / 1000);
    }

    if (isCorrect) {
      session.status = 'solved';
      const res = GameLogic.evaluate(session);
      session.result = res;
      GameLogic.grantRewards(GameState.getState(), res);
      GameState.updateSession(caseId, session);
      addToast('🎉 Caso resolvido!', 'ok');
      UI.renderResult(caseId, res);
    } else {
      GameState.updateSession(caseId, { errors: (session.errors || 0) + 1 });
      addToast('❌ Acusação incorreta! Continue a investigar.', 'error');
      UI.renderCase(caseData, GameState.getState());
    }
  }

  function evaluate(sess) {
    const c = getCase(sess.caseId);
    if (!c) return { score: 0, stars: 0, foundCount: 0, allFound: false, fast: false, clean: false };

    const found = c.clues.filter(k => sess.clues.includes(k.id));
    const weights = found.reduce((a, k) => a + (k.weight || 0), 0);
    let penalties = Math.min(30, (sess.errors * 3) + (sess.hints * 5));
    
    // Apply "Mente Económica" skill effect
    if (GameState.hasSkill('dica_barata')) {
      penalties = Math.min(30, (sess.errors * 3)); // Hints no longer contribute to penalty
    }

    const minutes = Math.round((sess.timeSpent || 0) / 60);
    let timeBonus = Math.max(0, 20 - minutes);

    // Apply "Detetive Rápido" skill effect
    if (GameState.hasSkill('detetive_rapido')) {
      timeBonus += Data.SKILLS.find(s => s.id === 'detetive_rapido').effect.value;
    }


    const score = weights - penalties + timeBonus;
    const allRequiredFound = c.clues.every(k => sess.clues.includes(k.id) || k.falsePositive || k.isHiddenHotspot);
    const fast = minutes <= 5;
    const clean = sess.errors === 0 && sess.hints === 0;

    let stars = 1;
    if (allRequiredFound) stars++;
    if (clean) stars++;
    if (fast) stars = Math.min(3, stars);

    return { score, stars, foundCount: found.length, allFound: allRequiredFound, fast, clean };
  }

  function grantRewards(state, res) {
    const pts = Math.max(0, res.score);
    state.user.points += pts;
    state.user.coins += res.stars;

    if (res.clean && !state.user.medals.includes('Sem Erros/Dicas')) {
      state.user.medals.push('Sem Erros/Dicas');
      addToast('🎖️ Nova Medalha: Sem Erros/Dicas!', 'ok');
    }
    if (res.allFound && !state.user.medals.includes('Olho de Águia')) {
      state.user.medals.push('Olho de Águia');
      addToast('🎖️ Nova Medalha: Olho de Águia!', 'ok');
    }
    if (res.fast && !state.user.medals.includes('Relâmpago')) {
      state.user.medals.push('Relâmpago');
      addToast('🎖️ Nova Medalha: Relâmpago!', 'ok');
    }
  }

  // New: Handle difference game logic
  async function handleDifferenceGame(clue, caseData, session, diffGameData) {
    return new Promise(resolve => {
        // Initialize game state for this specific difference game if not already present
        const currentDiffGameState = session.differenceGameStates[clue.diffId] || {
            foundDifferences: [],
            totalDifferences: diffGameData.diffAreas.length,
            errors: 0
        };
        session.differenceGameStates[clue.diffId] = currentDiffGameState;
        GameState.updateSession(caseData.id, { differenceGameStates: session.differenceGameStates });

        const modalTitle = `🔍 Encontre as Diferenças: ${clue.text}`;
        let modalMessage = `<p>Clique nas <strong>${currentDiffGameState.totalDifferences - currentDiffGameState.foundDifferences.length}</strong> diferenças restantes.</p>`;

        const imagesHtml = `
            <div class="difference-game-container">
                <div class="difference-image-wrapper">
                    <img src="${diffGameData.image1}" alt="Quadro Original" class="difference-image" />
                    <div id="diff-hotspots-1"></div>
                </div>
                <div class="difference-image-wrapper">
                    <img src="${diffGameData.image2}" alt="Quadro Alterado" class="difference-image" />
                    <div id="diff-hotspots-2"></div>
                </div>
            </div>
        `;

        const buttonsHtml = `<button class="btn ghost" data-action="cancel-diff-game">Cancelar</button>`;

        // Render the modal
        Utils.showCustomModal(modalTitle, imagesHtml + modalMessage, buttonsHtml, 'none')
            .then(result => {
                if (result === 'close') {
                    addToast('Jogo de diferenças concluído!', 'ok');
                    resolve(true); // Clue is resolved
                } else {
                    addToast('Jogo de diferenças cancelado.', 'info');
                    resolve(false); // Clue is not resolved
                }
            });

        const modalContentEl = document.querySelector('#custom-modal .modal-content');

        // Render hotspots on images within the modal
        function renderDiffHotspots() {
            const diffHotspots1 = modalContentEl.querySelector('#diff-hotspots-1');
            const diffHotspots2 = modalContentEl.querySelector('#diff-hotspots-2');
            if (!diffHotspots1 || !diffHotspots2) return; // Modal might be closed

            diffHotspots1.innerHTML = ''; // Clear existing hotspots
            diffHotspots2.innerHTML = '';

            diffGameData.diffAreas.forEach((area, index) => {
                const isFound = currentDiffGameState.foundDifferences.includes(index);
                const hotspotClass = `difference-hotspot ${isFound ? 'found' : ''}`;
                const style = `left:${area.x}px; top:${area.y}px; width:${area.width}px; height:${area.height}px;`;

                const hotspot1 = document.createElement('div');
                hotspot1.className = hotspotClass;
                hotspot1.style = style;
                hotspot1.dataset.diffIndex = index;
                if (!isFound) {
                    hotspot1.addEventListener('click', handleDiffClick);
                }
                diffHotspots1.appendChild(hotspot1);

                const hotspot2 = document.createElement('div');
                hotspot2.className = hotspotClass;
                hotspot2.style = style;
                hotspot2.dataset.diffIndex = index;
                if (!isFound) {
                    hotspot2.addEventListener('click', handleDiffClick);
                }
                diffHotspots2.appendChild(hotspot2);
            });
        }

        // Handle click on a difference hotspot
        function handleDiffClick(event) {
            const diffIndex = parseInt(event.target.dataset.diffIndex);

            if (currentDiffGameState.foundDifferences.includes(diffIndex)) {
                return; // Already found
            }

            currentDiffGameState.foundDifferences.push(diffIndex);
            addToast(`Diferença encontrada! (${currentDiffGameState.foundDifferences.length}/${currentDiffGameState.totalDifferences})`, 'ok');
            
            // Re-render hotspots to update their state
            renderDiffHotspots();

            if (currentDiffGameState.foundDifferences.length === currentDiffGameState.totalDifferences) {
                addToast('Todas as diferenças encontradas! Pista resolvida!', 'ok');
                session.clues.push(clue.id); // Add clue to session
                GameState.updateSession(caseData.id, { clues: session.clues, differenceGameStates: session.differenceGameStates });
                document.querySelector('#custom-modal .modal-options button[data-action="cancel-diff-game"]').dataset.value = 'close'; // Change cancel button to close
                document.querySelector('#custom-modal .modal-options button[data-action="cancel-diff-game"]').textContent = 'Concluir';
                // Automatically close or wait for user to click "Concluir"
                resolve(true);
            } else {
                GameState.updateSession(caseData.id, { differenceGameStates: session.differenceGameStates });
            }
        }

        // Initial render of hotspots when modal is shown
        // Use setTimeout to ensure the modal content is fully rendered
        setTimeout(() => {
            renderDiffHotspots();
            const closeButton = document.querySelector('#custom-modal .modal-options button[data-action="cancel-diff-game"]');
            if (closeButton) {
                closeButton.addEventListener('click', (e) => {
                    // This listener is critical for 'cancel' action from custom modal.
                    // If all differences are found, we change its data-value to 'close'
                    // and it will resolve the promise with 'close'
                    const value = e.target.dataset.value;
                    if (value === 'close') {
                        document.getElementById('custom-modal').classList.remove('show');
                        resolve(true); // Indicate clue resolved
                    } else {
                        document.getElementById('custom-modal').classList.remove('show');
                        resolve(false); // Indicate clue not resolved (cancelled)
                    }
                });
            }
        }, 100); // Small delay to ensure modal is ready
    });
  }


  return { handleClueClick, handleSuspectTalk, handleAccusation, evaluate, grantRewards };
})();

// =====================================
// Module: Event Handling
// =====================================
const EventHandler = (function() {
  function init() {
    document.getElementById('app').addEventListener('click', handleClick);
    document.querySelector('header').addEventListener('click', handleClick);
  }

  async function handleClick(e) {
    const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const elementWithData = e.target.dataset.action ? e.target : e.target.closest('[data-action]');

    const sessionId = elementWithData?.dataset.sessionId;
    const caseId = elementWithData?.dataset.caseId;
    const clueId = elementWithData?.dataset.clueId;
    const suspectId = elementWithData?.dataset.suspectId;
    const skillId = elementWithData?.dataset.skillId; // New: skillId for purchase

    switch (action) {
      case 'go-welcome':
        MainApp.goWelcome();
        break;
      case 'go-hub':
        MainApp.goHub();
        break;
      case 'go-parents':
        MainApp.goParents();
        break;
      case 'go-skill-tree': // New: navigate to skill tree
        MainApp.goSkillTree();
        break;
      case 'start-case':
        MainApp.startCase(caseId);
        break;
      case 'tap-clue':
        if (clueId && sessionId && caseId) {
            GameLogic.handleClueClick(clueId, sessionId, caseId);
        } else {
            console.warn('Missing data for tap-clue:', { clueId, sessionId, caseId });
        }
        break;
      case 'give-hint':
        if (sessionId) {
            MainApp.giveLLMHint(sessionId); // Changed to use LLM hint
        }
        break;
      case 'talk-suspect':
        if (suspectId && caseId) {
            GameLogic.handleSuspectTalk(suspectId, caseId);
        }
        break;
      case 'make-accusation':
        if (caseId && sessionId) {
            GameLogic.handleAccusation(caseId, sessionId);
        }
        break;
      case 'reset-progress':
        MainApp.resetProgress();
        break;
      case 'toggle-font':
        MainApp.toggleFont();
        break;
      case 'toggle-narration':
        MainApp.toggleNarration();
        break;
      case 'open-inventory':
        MainApp.openInventory();
        break;
      case 'purchase-skill': // New: purchase skill
        if (skillId) {
            MainApp.purchaseSkill(skillId);
        }
        break;
      case 'cancel-modal':
        // This case is handled by the showCustomModal promise resolver
        break;
      case 'cancel-diff-game':
          // This is a custom action for the difference game modal
          // The click handler for this button is added dynamically
          break;
      default:
        break;
    }
  }

  function handleChange(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    switch (action) {
      case 'toggle-font':
        MainApp.toggleFont();
        break;
      case 'toggle-narration':
        MainApp.toggleNarration();
        break;
    }
  }

  document.addEventListener('change', handleChange);

  return { init };
})();

// =====================================
// Module: LLM Integration (Gemini API)
// =====================================
const LLM = (function() {
    const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=`; // Key will be provided by Canvas

    async function generateHint(caseData, session) {
        let chatHistory = [];
        let prompt = `Você é um detetive experiente e está a ajudar um detetive júnior (Bia) a resolver um caso.
        O caso atual é: "${caseData.title}" - ${caseData.intro}.
        Os suspeitos são: ${caseData.suspects.map(s => s.name).join(', ')}.
        As pistas totais neste caso são: ${caseData.clues.map(c => c.text).join(', ')}.

        A Bia já encontrou as seguintes pistas: ${session.clues.length > 0 ? session.clues.map(id => caseData.clues.find(c => c.id === id)?.text || 'Pista desconhecida').join(', ') : 'Nenhuma pista ainda.'}.
        A Bia cometeu ${session.errors || 0} erros e usou ${session.hints || 0} dicas.

        Com base nas informações acima, dê uma dica útil e **muito breve** (máximo 20 palavras) para a Bia, que a ajude a progredir na investigação. A dica deve ser sobre a próxima ação mais lógica, focando em pistas ainda não encontradas ou em interrogar o suspeito certo. Não dê a resposta final do caso. Responda diretamente com a dica, sem introduções como "A sua dica é..." ou "Podes tentar...". Seja direto e no tom de um detetive experiente.
        `;

        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };

        let retries = 0;
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        while (retries < maxRetries) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    return result.candidates[0].content.parts[0].text;
                } else {
                    console.error("LLM response structure unexpected:", result);
                    return "Não consegui gerar uma dica agora. Tente novamente mais tarde.";
                }
            } catch (error) {
                console.error(`Erro ao chamar a API Gemini (tentativa ${retries + 1}):`, error);
                retries++;
                if (retries < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retries);
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }
        return "Não foi possível obter uma dica. Verifique a sua conexão ou tente mais tarde.";
    }

    return { generateHint };
})();


// =====================================
// Module: App Initialization
// =====================================
const MainApp = (function() {
  let S = Storage.load();
  let currentTimerIntervalId = null;

  function saveState() {
    Storage.save(S);
  }

  function startTimer(sessionId) {
    if (currentTimerIntervalId) clearInterval(currentTimerIntervalId);

    const session = S.sessions[sessionId];
    if (!session || session.status === 'solved') {
        return;
    }

    currentTimerIntervalId = setInterval(() => {
        if (!S.sessions[sessionId] || S.sessions[sessionId].status === 'solved') {
            clearInterval(currentTimerIntervalId);
            currentTimerIntervalId = null;
            return;
        }
        const elapsed = Math.floor((Date.now() - S.sessions[sessionId].start) / 1000);
        S.sessions[sessionId].timeSpent = elapsed;
        const tEl = document.getElementById('timer');
        if (tEl) tEl.textContent = fmtTime(elapsed);
    }, 1000);
  }

  function stopTimer() {
    if (currentTimerIntervalId) {
      clearInterval(currentTimerIntervalId);
      currentTimerIntervalId = null;
    }
  }

  function safeRender(renderFn) {
    try {
      renderFn(S);
    } catch (err) {
      console.error('Render error:', err);
      addToast('Ocorreu um erro ao carregar o ecrã. A tentar voltar ao hub.', 'danger');
      try {
        UI.renderHub(S);
      } catch (e2) {
        console.error('Fallback to Hub failed:', e2);
        addToast('Erro grave! Por favor, recarregue a página.', 'danger');
      }
    }
  }

  function goWelcome() {
    safeRender(UI.renderWelcome);
  }

  function goHub() {
    stopTimer();
    saveState();
    safeRender(UI.renderHub);
  }

  function goParents() {
    safeRender(UI.renderParents);
  }

  function goSkillTree() { // New: navigate to skill tree
    safeRender(UI.renderSkillTree);
  }

  async function resetProgress() {
    const confirmed = await showConfirmationModal('Zerar todo o progresso? Isso não poderá ser desfeito.');
    if (confirmed === 'true') {
      S = Storage.defaultState();
      saveState();
      addToast('Progresso zerado!', 'ok');
      goWelcome();
    } else {
      addToast('Ação cancelada.', 'info');
    }
  }

  function startCase(caseId) {
    const caseData = getCase(caseId);
    if (!caseData) {
      addToast('Caso não encontrado!', 'danger');
      return;
    }
    safeRender(() => UI.renderCase(caseData, S));
  }

  async function giveLLMHint(sessionId) { // Renamed from giveHint
    const session = S.sessions[sessionId];
    if (!session) {
      addToast('Não há sessão ativa para dar uma dica.', 'warn');
      return;
    }

    const hintCost = GameState.hasSkill('dica_barata') ? 0 : 1;

    if ((S.user.coins || 0) < hintCost) {
      addToast(`Sem moedas suficientes para uma dica inteligente. Custo: ${hintCost} moedas.`, 'warn');
      return;
    }

    const caseData = getCase(session.caseId);
    if (!caseData) {
        addToast('Dados do caso não encontrados para gerar a dica.', 'danger');
        return;
    }

    addToast('✨ A Bia está a pensar... a gerar uma dica inteligente!', 'info');
    S.user.coins = (S.user.coins || 0) - hintCost; // Deduct cost
    session.hints = (session.hints || 0) + 1;
    saveState();
    UI.renderCase(caseData, S); // Render to update coin count and hint count

    const hintText = await LLM.generateHint(caseData, session);
    addToast(`✨ Dica da Bia: ${hintText}`, 'info');
  }

  async function openInventory() {
    const currentCaseSession = Object.values(S.sessions).find(s => s.status === 'open');
    if (!currentCaseSession) {
      addToast('Nenhum caso ativo para abrir o inventário.', 'info');
      return;
    }
    const caseData = getCase(currentCaseSession.caseId);
    await Utils.showInventoryModal(caseData, currentCaseSession);
  }

  async function purchaseSkill(skillId) { // New: purchase skill
    const skill = getSkill(skillId);
    if (!skill) {
      addToast('Habilidade não encontrada!', 'danger');
      return;
    }

    if (GameState.hasSkill(skillId)) {
      addToast('Já desbloqueaste esta habilidade.', 'info');
      return;
    }

    if (S.user.coins < skill.cost) {
      addToast('Moedas insuficientes para desbloquear esta habilidade!', 'warn');
      return;
    }

    const confirmed = await showConfirmationModal(`Queres desbloquear "${skill.name}" por 🪙 ${skill.cost} moedas?`);
    if (confirmed === 'true') {
      S.user.coins -= skill.cost;
      S.user.unlockedSkills.push(skillId);
      saveState();
      addToast(`🌟 Habilidade "${skill.name}" desbloqueada!`, 'ok');
      goSkillTree(); // Re-render skill tree to show unlocked state
    } else {
      addToast('Compra de habilidade cancelada.', 'info');
    }
  }

  function toggleFont() {
    S.user.settings.largeFont = !S.user.settings.largeFont;
    saveState();
    addToast('Preferência de fonte guardada.', 'info');
    document.body.classList.toggle('large-font', S.user.settings.largeFont);

    const currentCaseSession = Object.values(S.sessions).find(s => s.status === 'open');
    if (currentCaseSession) {
        safeRender(() => UI.renderCase(getCase(currentCaseSession.caseId), S));
    } else {
        const currentPath = window.location.hash.slice(1);
        if (currentPath.includes('case')) {
            const activeCase = Object.values(S.sessions).find(s => s.status === 'open');
            if (activeCase) safeRender(() => UI.renderCase(getCase(activeCase.caseId), S));
        } else if (document.getElementById('app').innerHTML.includes('Painel dos Pais')) {
            safeRender(UI.renderParents);
        } else if (document.getElementById('app').innerHTML.includes('Árvore de Habilidades')) { // Check for skill tree
            safeRender(UI.renderSkillTree);
        }
        else {
            safeRender(UI.renderHub);
        }
    }
  }

  function toggleNarration() {
    S.user.settings.narration = !S.user.settings.narration;
    saveState();
    addToast('Configuração guardada. (Função de narração não implementada neste protótipo)', 'info');
  }

  function updateSessionTime(sessionId, elapsed) {
    if (S.sessions[sessionId]) {
      S.sessions[sessionId].timeSpent = elapsed;
    }
  }

  return {
    goWelcome,
    goHub,
    goParents,
    goSkillTree, // Exposed for navigation
    resetProgress,
    startCase,
    giveLLMHint,
    openInventory,
    purchaseSkill, // Exposed for purchasing skills
    toggleFont,
    toggleNarration,
    updateSessionTime,
    startTimer,
    stopTimer,
    init: function() {
      EventHandler.init();
      const params = new URLSearchParams(location.search);
      if (params.get('autoplay') === '1') {
        startCase('c-001');
      } else {
        goWelcome();
      }
    }
  };
})();

// Redefine showInventoryModal to include Portuguese text
Utils.showInventoryModal = async function(caseData, session) {
    const cluesFound = session.clues || [];
    const cluesListHtml = cluesFound
      .map(clueId => {
        const clue = caseData.clues.find(c => c.id === clueId);
        if (clue && !clue.isHiddenHotspot) {
          return `<li style="text-align: left; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.2em;">✔️</span>
                    <span><strong>${clue.text}</strong>${clue.weight ? ` <span class="small" style="white-space: nowrap;">(Peso: ${clue.weight})</span>` : ''}</span>
                  </li>`;
        }
        return '';
      })
      .join('') || '<li style="text-align: center;" class="small">Nenhuma pista encontrada ainda...</li>';

    const essentialClues = caseData.clues.filter(clue => !clue.isHiddenHotspot);
    const essentialCluesFound = essentialClues.filter(clue => cluesFound.includes(clue.id));

    const contentHtml = `
      <div style="text-align: center;">
        <p style="font-size: 1.1rem; margin-bottom: 15px;">Encontraste ${essentialCluesFound.length} de ${essentialClues.length} pistas essenciais!</p>
        <ul style="list-style-type: none; padding: 0; max-height: 200px; overflow-y: auto; text-align: center;">
          ${cluesListHtml}
        </ul>
      </div>
    `;

    return showCustomModal(
      '🎒 O teu Inventário de Pistas',
      contentHtml,
      `<button class="btn pri" data-value="close">Fechar</button>`
    );
};


document.addEventListener('DOMContentLoaded', MainApp.init);
