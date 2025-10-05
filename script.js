// Sherlock Bia — v1.7 (engine v1.6.1 + cases.json)
const STORAGE_KEY = "sbia_state_v1_7";
const S = { coins: 0, stars: 0, sessions: {} };
let currentCaseId = null;
let currentTimerIntervalId = null;
let CASES = [];

const $ = (s,el=document)=>el.querySelector(s);
function fmtTime(sec){ sec=Math.max(0,Math.floor(sec||0)); const m=String(Math.floor(sec/60)).padStart(2,'0'); const s2=String(sec%60).padStart(2,'0'); return `${m}:${s2}`;}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
function load(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) Object.assign(S, JSON.parse(raw)); }catch(e){ console.warn('load fail', e);} }
function toast(msg, ms=2200){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }

function showModal({title, body, actions=[{label:'Fechar', variant:'ghost'}]}={}){
  const root = document.getElementById('modalRoot');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="dialog">
      <header><h3>${title||''}</h3><button class="btn ghost" id="mClose">✖</button></header>
      <div class="content">${typeof body==='string'?body:''}</div>
      <footer>${actions.map((a,i)=>`<button class="btn ${a.variant||''}" data-i="${i}">${a.label}</button>`).join('')}</footer>
    </div>`;
  root.appendChild(modal);
  function close(){ window.removeEventListener('keydown',onKey); modal.removeEventListener('click',onOverlay); modal.remove(); }
  function onKey(e){ if(e.key==='Escape'){ close(); } }
  function onOverlay(e){ if(e.target===modal){ close(); } }
  window.addEventListener('keydown', onKey);
  modal.addEventListener('click', onOverlay);
  modal.querySelector('#mClose').addEventListener('click', close);
  modal.querySelectorAll('footer .btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i=+btn.dataset.i; const a=actions[i]; if(a?.onClick) a.onClick(close); else close(); });
  });
  return { close, el: modal, contentEl: modal.querySelector('.content') };
}

// Preload images to reduce flicker
async function preloadImages(list){
  await Promise.all(list.map(src=> new Promise(res=>{ const i=new Image(); i.onload=i.onerror=()=>res(); i.src=src; })));
}

// --------------- UI ---------------
const UI = {
  async init(){
    load();
    this.renderHud();
    await Data.loadCases(); // loads CASES and preloads thumbs/backgrounds
    this.renderCaseList();
    this.bindGlobal();
  },
  renderHud(){ $('#timer').textContent='00:00'; $('#stars').textContent=S.stars; $('#coins').textContent=S.coins; },
  renderCaseList(){
    const wrap = $('#caseList');
    wrap.innerHTML = CASES.map(c=>`
      <article class="case-card">
        <header><strong>${c.title}</strong><span class="badge">Fácil</span></header>
        <div class="thumb" style="background-image:url('assets/${c.thumb}')"></div>
        <div class="body">
          <p>${c.summary}</p>
          <button class="btn" data-action="start-case" data-case-id="${c.id}">Investigar</button>
        </div>
      </article>`).join('');
  },
  bindGlobal(){
    document.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const action = b.dataset.action;
      if (action==='start-case'){ Main.startCase(b.dataset.caseId); }
      if (b.id==='btnBack'){ Main.exitCase(); }
      if (b.id==='btnInventory'){ Main.openInventory(); }
      if (b.id==='btnHint'){ Main.giveHint(); }
      if (b.id==='btnAccuse'){ Main.accuse(); }
      if (action==='tap-hotspot'){ Main.collectClue(b.dataset.caseId, b.dataset.clueId); }
      if (action==='tap-clue'){ Main.showClueDetail(b.dataset.caseId, b.dataset.clueId); }
      if (action==='talk-suspect'){ Main.talkSuspect(b.dataset.caseId, b.dataset.suspectId); }
    });
    window.addEventListener('beforeunload', save);
  },
  renderCase(caseId){
    const c = CASES.find(x=>x.id===caseId); if(!c) return;
    $('#caseIntro').classList.add('hidden'); $('#gameArea').classList.remove('hidden');
    if (!S.sessions[caseId]){ S.sessions[caseId]={caseId, clues:[], suspectsTalked:[], start:Date.now(), timeSpent:0, status:'active'}; save(); }
    currentCaseId = caseId;
    this.renderScene(caseId, c.scenes[0]);
    this.renderSide(caseId);
    Main.startTimer(caseId);
  },
  renderScene(caseId, sceneDef){
    const scene = $('#scene'); const hsWrap = $('#hotspots');
    scene.style.backgroundImage = `url('assets/${sceneDef.bg}')`;
    hsWrap.innerHTML='';
    (sceneDef.hotspots||[]).forEach(h=>{
      const btn = document.createElement('button');
      btn.className='hotspot'; btn.dataset.action='tap-hotspot'; btn.dataset.caseId=caseId; btn.dataset.clueId=h.clueId;
      btn.style.left = h.x+'%'; btn.style.top=h.y+'%'; btn.style.width=h.w+'%'; btn.style.height=h.h+'%';
      btn.innerHTML = `<span class="icon">${h.icon||'🔎'}</span>`;
      hsWrap.appendChild(btn);
    });
  },
  renderSide(caseId){
    const c = CASES.find(x=>x.id===caseId); const sess = S.sessions[caseId];
    $('#cluesList').innerHTML = (c.clues||[]).map(k=>{
      const found = sess.clues.includes(k.id);
      return `<div class="clue">
        <div><strong>${k.text}</strong> ${found?'<span class="status-ok">[coletada]</span>':'<span class="status-pending">[pendente]</span>'}</div>
        <div><button class="btn ghost" data-action="tap-clue" data-case-id="${caseId}" data-clue-id="${k.id}">${found?'Ver':'Detalhes'}</button></div>
      </div>`;
    }).join('');
    $('#suspectsList').innerHTML = (c.suspects||[]).map(s=>{
      const talked = (sess.suspectsTalked||[]).includes(s.id);
      return `<div class="suspect">
        <strong>${s.name}</strong>
        <small>${s.desc||''}</small>
        <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
          <em>${talked?'Já conversou':'Ainda não conversou'}</em>
          <button class="btn" data-action="talk-suspect" data-case-id="${caseId}" data-suspect-id="${s.id}" ${talked?'disabled':''}>Conversar</button>
        </div>
      </div>`;
    }).join('');
  }
};


// --------------- Data ---------------
const Data = {
  async loadCases(){
    // Try embedded JSON first (works on file://)
    const tag = document.getElementById('cases-json');
    if (tag) {
      try {
        CASES = JSON.parse(tag.textContent);
      } catch (e) {
        console.warn('Falha ao parsear cases embutidos:', e);
        CASES = [];
      }
    }
    // Fallback: fetch (for GitHub Pages / http/https)
    if (!CASES || CASES.length === 0) {
      try {
        const res = await fetch('./cases.json');
        CASES = await res.json();
      } catch (e) {
        console.warn('Falha no fetch de cases.json:', e);
        CASES = [];
      }
    }

    const imgs = [];
    CASES.forEach(c=>{
      imgs.push('assets/'+c.thumb);
      (c.scenes||[]).forEach(s=> imgs.push('assets/'+s.bg));
      (c.clues||[]).forEach(cl=>{ if (cl.asset) imgs.push('assets/'+cl.asset); });
      (c.suspects||[]).forEach(su=>{ if (su.icon) imgs.push('assets/'+su.icon); });
    });
    await preloadImages(Array.from(new Set(imgs)));
  }
};


// --------------- Main ---------------
const Main = {
  talkSuspect(caseId, suspectId){
    const c = CASES.find(x=>x.id===caseId); const sess = S.sessions[caseId]; if(!c||!sess) return;
    const s = (c.suspects||[]).find(x=>x.id===suspectId); if(!s) return;
    const talked = (sess.suspectsTalked||[]).includes(suspectId);
    const dialog = talked
      ? `<p>${s.name}: Já conversamos, lembra? Dê uma olhada nas pistas que você juntou.</p>`
      : `<p>${s.name}: Oi! Eu estava por aqui, mas não vi tudo. Você já conferiu as pistas do cenário?</p>`;
    showModal({ title:`Conversa com ${s.name}`, body: dialog });
    if (!talked){
      sess.suspectsTalked = (sess.suspectsTalked||[]);
      sess.suspectsTalked.push(suspectId);
      save();
      UI.renderSide(caseId);
      toast('Entrevista registrada');
    }
  },

  startCase(id){ UI.renderCase(id); },
  exitCase(){ $('#gameArea').classList.add('hidden'); $('#caseIntro').classList.remove('hidden'); currentCaseId=null; this.stopTimer(); UI.renderHud(); },
  startTimer(caseId){
    if (currentTimerIntervalId) clearInterval(currentTimerIntervalId);
    const sess = S.sessions[caseId]; if(!sess || sess.status==='solved') return;
    currentTimerIntervalId = setInterval(()=>{
      const s=S.sessions[caseId]; if(!s || s.status==='solved'){ clearInterval(currentTimerIntervalId); currentTimerIntervalId=null; return; }
      s.timeSpent = Math.floor((Date.now()-s.start)/1000); $('#timer').textContent = fmtTime(s.timeSpent);
    }, 1000);
  },
  stopTimer(){ if(currentTimerIntervalId){ clearInterval(currentTimerIntervalId); currentTimerIntervalId=null; } },
  collectClue(caseId, clueId){
    const sess=S.sessions[caseId]; const c=CASES.find(x=>x.id===caseId); if(!sess||!c) return;
    if (!sess.clues.includes(clueId)){ sess.clues.push(clueId); S.stars+=1; S.coins+=1; save(); UI.renderSide(caseId); UI.renderHud(); toast('Pista coletada! +1⭐ +1🪙'); }
    else { toast('Você já coletou essa pista.'); }
  },
  showClueDetail(caseId, clueId){
    const c=CASES.find(x=>x.id===caseId); const clue=c?.clues.find(k=>k.id===clueId); if(!clue) return;
    const img = clue.asset ? `<img src="assets/${clue.asset}" alt="" style="width:100%;border-radius:10px;margin:8px 0;" onerror="this.style.display='none'"/>` : '';
    showModal({title: clue.text, body:`<p>${clue.detail||''}</p>${img}`});
  },
  openInventory(){ const body = `<p><strong>Estrelas:</strong> ${S.stars}</p><p><strong>Moedas:</strong> ${S.coins}</p><p style="color:#94a3b8">Dicas online requerem chave de API; caso contrário, usamos dicas offline.</p>`; showModal({title:'Inventário', body}); },
  async giveHint(){
    if(!currentCaseId){ toast('Abra um caso para pedir uma dica.'); return; }
    const sess=S.sessions[currentCaseId]; const c=CASES.find(x=>x.id===currentCaseId);
    const useOnline = (window.GEMINI_API_KEY && window.GEMINI_API_KEY.trim().length>0);
    let hintText='';
    if (useOnline){ try{ hintText = await LLM.generateHint(c, sess); }catch(e){ console.warn('LLM falhou', e);} }
    if(!hintText){
      const pending=(c.clues||[]).find(cl=>!sess.clues.includes(cl.id));
      hintText = pending ? `Dica offline: você ainda não coletou "${pending.text}". Explore os cenários e observe áreas destacadas.`
                         : 'Você já coletou as pistas principais. Revise os suspeitos e faça a acusação.';
    }
    showModal({title:'Dica', body:`<p>${hintText}</p>`});
  },
  accuse(){
    if(!currentCaseId) return; const c=CASES.find(x=>x.id===currentCaseId); const sess=S.sessions[currentCaseId];
    const body = document.createElement('div');
    body.innerHTML = `
      <p>Quem é o(a) culpado(a)?</p>
      <div style="display:grid;gap:8px;margin-top:8px;">
        ${(c.suspects||[]).map(s=>`
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="radio" name="culprit" value="${s.id}"/>
            <img src="assets/${s.icon||'bia.png'}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:6px" onerror="this.style.display='none'"/>
            <span><strong>${s.name}</strong> — <small>${s.desc||''}</small></span>
          </label>`).join('')}
      </div>`;
    const m = showModal({
      title:'Acusação', body: body.outerHTML,
      actions:[
        {label:'Cancelar', variant:'ghost'},
        {label:'Confirmar', onClick:(close)=>{
          const sel = document.querySelector('input[name="culprit"]:checked');
          if(!sel){ toast('Escolha um suspeito.'); return; }
          const ok = sel.value === c.solve.culprit;
          if(ok){
            sess.status='solved'; this.stopTimer(); S.stars+=3; S.coins+=3; save(); UI.renderHud(); close();
            showModal({title:'Caso Resolvido! 🎉', body:`<p>${c.solve.reasonText}</p><p>+3⭐ +3🪙</p>`});
          } else {
            S.coins=Math.max(0,S.coins-1); save(); UI.renderHud(); close();
            showModal({title:'Ainda não…', body:'A acusação não bate com as evidências. Revise as pistas e tente novamente.'});
          }
        }}
      ]
    });
  }
};

const LLM = {
  async generateHint(caseData, session){
    const k = window.GEMINI_API_KEY?.trim(); if(!k) throw new Error('Sem chave');
    const prompt = `Você dá dicas sutis para um jogo infantil de detetive.\nCaso: ${caseData.title}\nResumo: ${caseData.summary}\nPistas coletadas: ${(session.clues||[]).join(', ')||'nenhuma'}.\nDê 1 dica curta, sem spoilers, em PT-BR.`;
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+encodeURIComponent(k), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{parts:[{text:prompt}]}] })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
};

document.addEventListener('DOMContentLoaded', ()=> UI.init());
