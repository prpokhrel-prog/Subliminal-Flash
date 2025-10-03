// ===== State =====
const state = {
  categories: {},
  currentCategory: null,
  presets: {},
  running: false,
  timer: null,
  lastMsg: null,
  lastWordIdx: 0,
  flashes: 0,
  startTs: 0,
  overlays: [],
  dimLayers: [],
  installPrompt: null,
  player: null,

  // v2 features + v3 additions
  ext: { cfg:{ ytApiKey:'', ytClientId:'' }, bookmarks:[], weights:{} },
  activeCats: new Set(),
  renderBullets: false,
  renderMarkdown: false,
  autoStop: false,
  autoStopMin: null,
  autoStopFlashes: null,
  endTs: null,
  totalFlashesLimit: null,
};

// ===== PWA install =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installPrompt = e;
  document.getElementById('installBtn').hidden = false;
});
document.getElementById('installBtn').addEventListener('click', async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  document.getElementById('installBtn').hidden = true;
});

// ===== Storage =====
function loadCore(){
  try{
    const raw = localStorage.getItem('sfp_store');
    if(raw){
      const o = JSON.parse(raw);
      state.categories = o.categories || {"General":["I am calm","I focus easily","I feel confident"]};
      state.presets = o.presets || {};
      state.currentCategory = o.currentCategory || Object.keys(state.categories)[0];
    } else {
      state.categories = {"General":["I am calm","I focus easily","I feel confident"]};
      state.presets = {};
      state.currentCategory = "General";
    }
  }catch(e){
    state.categories = {"General":["Hello world"]};
    state.presets = {};
    state.currentCategory = "General";
  }
}
function saveCore(){
  localStorage.setItem('sfp_store', JSON.stringify({
    categories: state.categories,
    presets: state.presets,
    currentCategory: state.currentCategory
  }));
}
function loadExt(){
  try{
    const raw = localStorage.getItem('sfp_store_ext');
    if(raw) state.ext = JSON.parse(raw);
  }catch(e){}
  state.ext.cfg = state.ext.cfg || { ytApiKey:'', ytClientId:'' };
  state.ext.bookmarks = state.ext.bookmarks || [];
  state.ext.weights = state.ext.weights || {};
}
function saveExt(){ localStorage.setItem('sfp_store_ext', JSON.stringify(state.ext)); }

// ===== UI Rendering =====
function renderCategories(){
  const ul = document.getElementById('categoryList');
  ul.innerHTML='';
  Object.keys(state.categories).forEach(name=>{
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = name;
    const open = document.createElement('button'); open.textContent = (name===state.currentCategory?'✓':'Open');
    open.onclick = ()=>{ state.currentCategory=name; saveCore(); renderCategories(); renderMessages(); renderMultiCats(); };
    const del = document.createElement('button'); del.textContent='🗑';
    del.onclick = ()=>{
      if(confirm(`Delete category "${name}"?`)){
        delete state.categories[name];
        delete state.ext.weights[name];
        if(state.currentCategory===name) state.currentCategory = Object.keys(state.categories)[0]||null;
        saveCore(); saveExt(); renderCategories(); renderMessages(); renderMultiCats();
      }
    };
    li.append(span, open, del);
    ul.appendChild(li);
  });
}

function renderMessages(){
  const ul = document.getElementById('messageList');
  ul.innerHTML='';
  const msgs = state.categories[state.currentCategory] || [];
  msgs.forEach((m, idx)=>{
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = m;
    const del = document.createElement('button'); del.textContent='🗑';
    del.onclick = ()=>{ msgs.splice(idx,1); saveCore(); renderMessages(); };
    li.append(span, del);
    ul.appendChild(li);
  });
}

function renderPresets(){
  const ul = document.getElementById('presetList');
  ul.innerHTML='';
  Object.entries(state.presets).forEach(([name,p])=>{
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = name;
    const load = document.createElement('button'); load.textContent='Load';
    load.onclick = ()=>applyPreset(p);
    const del = document.createElement('button'); del.textContent='🗑';
    del.onclick = ()=>{ delete state.presets[name]; saveCore(); renderPresets(); };
    li.append(span, load, del);
    ul.appendChild(li);
  });
}

function renderMultiCats(){
  const ul = document.getElementById('multiCatList');
  ul.innerHTML='';
  Object.keys(state.categories).forEach(name=>{
    const li = document.createElement('li');
    const left = document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='8px'; left.style.flex='1';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = state.activeCats.has(name);
    cb.onchange = ()=>{ if(cb.checked) state.activeCats.add(name); else state.activeCats.delete(name); };
    const label = document.createElement('span'); label.textContent = name;
    left.append(cb,label);
    const weight = document.createElement('input'); weight.type='number'; weight.min='0'; weight.value = state.ext.weights[name] ?? 1;
    weight.onchange = ()=>{ state.ext.weights[name] = Math.max(0, Number(weight.value||0)); saveExt(); };
    const wlbl = document.createElement('span'); wlbl.textContent='weight';
    li.append(left, weight, wlbl);
    ul.appendChild(li);
  });
}

// ===== Left panel actions =====
document.getElementById('addCategory').onclick = ()=>{
  const name = document.getElementById('newCategory').value.trim();
  if(!name) return;
  if(state.categories[name]) return alert('Category exists');
  state.categories[name]=[];
  state.currentCategory = name;
  state.ext.weights[name] = 1;
  document.getElementById('newCategory').value='';
  saveCore(); saveExt(); renderCategories(); renderMessages(); renderMultiCats();
};

document.getElementById('addMessage').onclick = ()=>{
  if(!state.currentCategory) return alert('Select a category');
  const v = document.getElementById('newMessage');
  const txt = v.value.trim();
  if(!txt) return;
  state.categories[state.currentCategory].push(txt);
  v.value='';
  saveCore(); renderMessages();
};

// Bullets add & toggles
document.getElementById('addBullets').onclick = ()=>{
  if(!state.currentCategory) return alert('Select a category');
  const txt = document.getElementById('newBullets').value;
  if(!txt.trim()) return;
  const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  state.categories[state.currentCategory].push(...lines);
  document.getElementById('newBullets').value='';
  saveCore(); renderMessages();
};
document.getElementById('renderBullets').onchange = (e)=> state.renderBullets = e.target.checked;
document.getElementById('renderMd').onchange = (e)=> state.renderMarkdown = e.target.checked;

// Select/Clear cats
document.getElementById('selectAllCats').onclick = ()=>{ state.activeCats = new Set(Object.keys(state.categories)); renderMultiCats(); };
document.getElementById('clearAllCats').onclick = ()=>{ state.activeCats = new Set(); renderMultiCats(); };

// Export/Import
document.getElementById('exportJson').onclick = ()=>{
  const data = JSON.stringify(state.categories, null, 2);
  downloadFile('messages.json', data, 'application/json');
};
document.getElementById('importJson').onclick = ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange = ()=>{
    const file = inp.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(reader.result);
        if(typeof obj==='object'){ state.categories = obj; state.currentCategory = Object.keys(state.categories)[0]||null; saveCore(); renderCategories(); renderMessages(); renderMultiCats(); }
      }catch(e){ alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  };
  inp.click();
};
document.getElementById('exportCsv').onclick = ()=>{
  const msgs = state.categories[state.currentCategory]||[];
  const csv = msgs.map(m=>m.replace(/"/g,'""')).map(m=>`"${m}"`).join('\n');
  downloadFile(`${state.currentCategory||'messages'}.csv`, csv, 'text/csv');
};
document.getElementById('importCsv').onclick = ()=> document.getElementById('importCsvFile').click();
document.getElementById('importCsvFile').onchange = (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    const lines = reader.result.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(s=>s.replace(/^"|"$/g,'').replace(/""/g,'"'));
    if(!state.currentCategory) return alert('Select a category');
    state.categories[state.currentCategory].push(...lines);
    saveCore(); renderMessages();
  };
  reader.readAsText(f);
};

// Presets
document.getElementById('savePreset').onclick = ()=>{
  const name = (document.getElementById('presetName').value||'').trim();
  if(!name) return;
  state.presets[name] = currentSettings();
  saveCore(); renderPresets();
  document.getElementById('presetName').value='';
};

function applyPreset(p){
  document.getElementById('intervalMs').value = p.interval;
  document.getElementById('durationMs').value = p.duration;
  document.getElementById('fontSize').value = p.font;
  document.getElementById('opacity').value = p.opacity;
  document.getElementById('textColor').value = p.color;
  document.getElementById('position').value = p.position;
  document.getElementById('mode').value = p.mode;
  document.getElementById('outline').checked = !!p.outline;
  document.getElementById('backdrop').checked = !!p.backdrop;
  document.getElementById('dim').value = p.dim||0;
  document.getElementById('noRepeat').checked = !!p.noRepeat;
  document.getElementById('autoStop').checked = !!p.autoStop;
  document.getElementById('autoStopMin').value = p.autoStopMin || '';
  document.getElementById('autoStopFlashes').value = p.autoStopFlashes || '';
  state.renderBullets = !!p.renderBullets;
  state.renderMarkdown = !!p.renderMarkdown;
  if(p.category && state.categories[p.category]){
    state.currentCategory = p.category;
    renderCategories(); renderMessages();
  }
  // restore active cats and weights if provided
  if(p.activeCats && Array.isArray(p.activeCats)){
    state.activeCats = new Set(p.activeCats.filter(c=>state.categories[c]));
  }
  if(p.weights && typeof p.weights==='object'){
    state.ext.weights = {...state.ext.weights, ...p.weights}; saveExt();
  }
  // reflect toggles
  document.getElementById('renderBullets').checked = state.renderBullets;
  document.getElementById('renderMd').checked = state.renderMarkdown;
}

function currentSettings(){
  return {
    interval: Number(document.getElementById('intervalMs').value||500),
    duration: Number(document.getElementById('durationMs').value||50),
    font: Number(document.getElementById('fontSize').value||36),
    opacity: Number(document.getElementById('opacity').value||0.9),
    color: document.getElementById('textColor').value||'#fff',
    position: document.getElementById('position').value,
    mode: document.getElementById('mode').value,
    outline: document.getElementById('outline').checked,
    backdrop: document.getElementById('backdrop').checked,
    dim: Number(document.getElementById('dim').value||0),
    category: state.currentCategory,
    noRepeat: document.getElementById('noRepeat').checked,
    autoStop: document.getElementById('autoStop').checked,
    autoStopMin: Number(document.getElementById('autoStopMin').value||0) || null,
    autoStopFlashes: Number(document.getElementById('autoStopFlashes').value||0) || null,
    renderBullets: state.renderBullets,
    renderMarkdown: state.renderMarkdown,
    activeCats: Array.from(state.activeCats),
    weights: state.ext.weights
  };
}

// ===== Tabs =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tabPanel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    attachOverlaysForActiveTab();
  });
});

// ===== Flashing =====
document.getElementById('autoStop').onchange = (e)=> state.autoStop = e.target.checked;
document.getElementById('autoStopMin').onchange = (e)=> state.autoStopMin = Number(e.target.value||0) || null;
document.getElementById('autoStopFlashes').onchange = (e)=> state.autoStopFlashes = Number(e.target.value||0) || null;

function chooseMessage(msgs, noRepeat){
  if(!msgs.length) return '';
  let msg = msgs[Math.floor(Math.random()*msgs.length)];
  if(noRepeat && msgs.length>1){
    let guard=0;
    while(msg===state.lastMsg && guard++<10){
      msg = msgs[Math.floor(Math.random()*msgs.length)];
    }
  }
  state.lastMsg = msg;
  return msg;
}
function chooseWord(msg){
  const words = msg.split(/\s+/).filter(Boolean);
  if(!words.length) return msg;
  const idx = state.lastWordIdx % words.length;
  state.lastWordIdx++;
  return words[idx];
}
function placeOverlay(el, position){
  el.style.alignItems='center';
  el.style.justifyContent='center';
  el.style.padding='2vw';
  if(position==='top'){ el.style.alignItems='flex-start'; el.style.paddingTop='3vh'; }
  else if(position==='bottom'){ el.style.alignItems='flex-end'; el.style.paddingBottom='3vh'; }
  else if(position==='random'){ const y=Math.random(); el.style.alignItems=(y<0.33?'flex-start':(y>0.66?'flex-end':'center')); }
}
function setOverlayStyle(els, s){
  els.forEach(el=>{
    el.style.fontSize = s.font+'px';
    el.style.color = s.color;
    el.style.opacity = s.opacity;
    el.style.textShadow = s.outline ? '0 0 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)' : 'none';
    el.style.backdropFilter = s.backdrop ? 'blur(2px)' : 'none';
  });
  state.dimLayers.forEach(d => d.style.background = `rgba(0,0,0,${s.dim||0})`);
}
function activeOverlays(){
  const activePanel = document.querySelector('.tabPanel.active');
  const id = activePanel.id;
  return {
    overlays: id==='youtubeTab' ? [document.getElementById('overlay')]
           : id==='tiktokTab' ? [document.getElementById('overlayTk')]
           : id==='videoTab'   ? [document.getElementById('overlay2')]
           : id==='browserTab' ? [document.getElementById('overlay3')]
           : [document.getElementById('overlay4')],
    dims: id==='youtubeTab' ? [document.getElementById('dimYt')]
         : id==='tiktokTab' ? [document.getElementById('dimTk')]
         : id==='videoTab'  ? [document.getElementById('dimV')]
         : id==='browserTab'? [document.getElementById('dimB')]
         : [document.getElementById('dimBlank')]
  };
}
function attachOverlaysForActiveTab(){
  const {overlays, dims} = activeOverlays();
  state.overlays = overlays;
  state.dimLayers = dims;
  const s = currentSettings();
  setOverlayStyle(overlays, s);
  placeOverlay(overlays[0], s.position);
}

function pickWeightedCategory(){
  const cats = Array.from(state.activeCats.size? state.activeCats : new Set([state.currentCategory||'']));
  const items = cats.map(c=>({cat:c, w: Math.max(0, Number(state.ext.weights[c] ?? 1))})).filter(i=>i.w>0);
  if(!items.length) return cats[0]||null;
  const total = items.reduce((a,b)=>a+b.w,0);
  let r = Math.random()*total;
  for(const it of items){ if((r -= it.w) <= 0) return it.cat; }
  return items[items.length-1].cat;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m])); }
function mdToHtml(s){
  const lines = s.split(/\r?\n/);
  let html=''; let inList=false;
  for(let line of lines){
    line = line.trim();
    const isBullet = /^(\*|-|•)\s+/.test(line);
    if(isBullet){
      if(!inList){ html+='<ul>'; inList=true; }
      const txt = line.replace(/^(\*|-|•)\s+/, '');
      html += '<li>'+txt+'</li>';
    } else {
      if(inList){ html+='</ul>'; inList=false; }
      if(line.length) html += '<p>'+line+'</p>';
    }
  }
  if(inList) html+='</ul>';
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

function startFlashing(){
  if(state.running) return;
  const s = currentSettings();
  const chosenCats = Array.from(state.activeCats.size? state.activeCats : new Set([state.currentCategory||'']));
  let totalMsgs=0; chosenCats.forEach(c=> totalMsgs += (state.categories[c]||[]).length);
  if(!totalMsgs){ alert('No messages in selected categories'); return; }
  if(s.autoStop){
    state.endTs = s.autoStopMin ? (Date.now() + s.autoStopMin*60*1000) : null;
    state.totalFlashesLimit = s.autoStopFlashes || null;
  } else { state.endTs=null; state.totalFlashesLimit=null; }

  attachOverlaysForActiveTab();
  state.running = true;
  state.flashes = 0;
  state.startTs = Date.now();
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;

  const tick = () => {
    if(!state.running) return;
    if(state.endTs && Date.now() >= state.endTs){ stopFlashing(); return; }
    if(state.totalFlashesLimit && state.flashes >= state.totalFlashesLimit){ stopFlashing(); return; }

    const cat = pickWeightedCategory();
    const pool = (state.categories[cat]||[]);
    if(!pool.length){ state.timer = setTimeout(tick, Math.max(5, s.interval)); return; }

    let msg = chooseMessage(pool, s.noRepeat);
    if(s.mode === 'word') msg = chooseWord(msg);

    let html = null;
    if(state.renderMarkdown){
      html = mdToHtml(escapeHtml(msg));
    } else if(s.renderBullets){
      const bullets = msg.split(/\n|•\s*/).map(x=>x.trim()).filter(Boolean);
      html = '<ul><li>'+bullets.join('</li><li>')+'</li></ul>';
    }
    state.overlays.forEach(el=>{
      placeOverlay(el, s.position);
      if(html){ el.innerHTML = html; } else { el.style.whiteSpace='pre-line'; el.textContent = msg; }
      el.style.visibility='visible';
      setTimeout(()=>{ el.style.visibility='hidden'; }, Math.max(5, s.duration));
    });

    state.flashes++;
    document.getElementById('statFlashes').textContent = String(state.flashes);
    const remainSec = state.endTs ? Math.max(0, Math.ceil((state.endTs - Date.now())/1000)) : Math.floor((Date.now()-state.startTs)/1000);
    document.getElementById('statTime').textContent = (state.endTs? '-':'') + remainSec + 's';

    state.timer = setTimeout(tick, Math.max(5, s.interval));
  };
  tick();
}
function stopFlashing(){
  state.running = false;
  clearTimeout(state.timer);
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  state.overlays.forEach(el=> el.style.visibility='hidden');
}
document.getElementById('startBtn').onclick = startFlashing;
document.getElementById('stopBtn').onclick = stopFlashing;
document.getElementById('resetStats').onclick = ()=>{
  state.flashes=0; state.startTs=Date.now(); state.endTs=null; state.totalFlashesLimit=null;
  document.getElementById('statFlashes').textContent='0';
  document.getElementById('statTime').textContent='0s';
};

// Shortcuts
document.addEventListener('keydown', (e)=>{
  if(e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA')) return;
  if(e.code==='Space'){ e.preventDefault(); state.running?stopFlashing():startFlashing(); }
  if(e.key==='f' || e.key==='F'){ toggleFullscreen(); }
  if(e.key==='ArrowUp'){ const fs = document.getElementById('fontSize'); fs.value = Number(fs.value)+2; attachOverlaysForActiveTab(); }
  if(e.key==='ArrowDown'){ const fs = document.getElementById('fontSize'); fs.value = Math.max(10, Number(fs.value)-2); attachOverlaysForActiveTab(); }
  if(e.key==='ArrowLeft'){ const i = document.getElementById('intervalMs'); i.value = Math.max(5, Number(i.value)-50); }
  if(e.key==='ArrowRight'){ const i = document.getElementById('intervalMs'); i.value = Number(i.value)+50; }
});

// Fullscreen
function toggleFullscreen(){ if(!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); } else { document.exitFullscreen?.(); } }
document.getElementById('fsBtn').onclick = toggleFullscreen;

// ===== YouTube Iframe API =====
let ytReady=false;
window.onYouTubeIframeAPIReady = function(){
  ytReady = true;
  state.player = new YT.Player('player', { height:'100%', width:'100%', videoId:'', playerVars:{ 'playsinline':1, 'modestbranding':1 } });
};
function extractYouTubeId(input){
  if(!input) return '';
  try{
    const u = new URL(input);
    if(u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if(u.searchParams.get('v')) return u.searchParams.get('v');
    if(u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0];
  }catch(e){ return input; }
  return input;
}
document.getElementById('loadYt').onclick = ()=>{
  if(!ytReady) return alert('YouTube API not ready yet');
  const id = extractYouTubeId(document.getElementById('ytUrl').value.trim());
  if(!id) return;
  state.player.loadVideoById(id);
  attachOverlaysForActiveTab();
};
document.getElementById('playYt').onclick = ()=>{
  if(!state.player) return;
  const s = state.player.getPlayerState();
  if(s===1) state.player.pauseVideo(); else state.player.playVideo();
};
document.getElementById('muteYt').onclick = ()=>{
  if(!state.player) return;
  if(state.player.isMuted()) state.player.unMute(); else state.player.mute();
};

// Bookmarks
function renderBookmarks(){
  const ul = document.getElementById('ytBookmarks'); ul.innerHTML='';
  state.ext.bookmarks.forEach(item=>{
    const li = document.createElement('li');
    const img = document.createElement('img'); img.src = item.thumb;
    const a = document.createElement('a'); a.href='#'; a.textContent=item.title;
    a.onclick = (e)=>{ e.preventDefault(); state.player && state.player.loadVideoById(item.videoId); };
    const rm = document.createElement('button'); rm.textContent='🗑'; rm.onclick = ()=>{
      state.ext.bookmarks = state.ext.bookmarks.filter(b=>b.videoId!==item.videoId);
      saveExt(); renderBookmarks();
    };
    li.append(img,a,rm); ul.appendChild(li);
  });
}
document.getElementById('ytBookmark').onclick = ()=>{
  try{
    const vid = state.player && state.player.getVideoData().video_id;
    const title = (state.player && state.player.getVideoData().title) || 'Video';
    if(!vid) return alert('No video loaded');
    const thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    if(!state.ext.bookmarks.find(b=>b.videoId===vid)){
      state.ext.bookmarks.unshift({videoId:vid, title, thumb}); saveExt(); renderBookmarks();
    }
  }catch(e){ alert('Unable to bookmark current video'); }
};

// YouTube Search (API key)
async function ytSearch(query){
  const key = state.ext.cfg.ytApiKey;
  if(!key){ alert('Add a YouTube API Key in YouTube Settings'); return; }
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('key', key);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  const res = await fetch(url);
  const data = await res.json();
  const ul = document.getElementById('ytResults'); ul.innerHTML='';
  (data.items||[]).forEach(item=>{
    const vid = item.id.videoId;
    const title = item.snippet.title;
    const thumb = item.snippet.thumbnails?.medium?.url || '';
    const li = document.createElement('li');
    const img = document.createElement('img'); img.src = thumb;
    const a = document.createElement('a'); a.href='#'; a.textContent=title;
    a.onclick = (e)=>{ e.preventDefault(); state.player && state.player.loadVideoById(vid); };
    const bk = document.createElement('button'); bk.textContent='☆'; bk.onclick = ()=>{
      if(!state.ext.bookmarks.find(b=>b.videoId===vid)){ state.ext.bookmarks.unshift({videoId:vid,title,thumb}); saveExt(); renderBookmarks(); }
    };
    li.append(img,a,bk); ul.appendChild(li);
  });
}
document.getElementById('ytSearchBtn').onclick = ()=>{
  const q = document.getElementById('ytSearch').value.trim();
  if(q) ytSearch(q);
};

// OAuth optional (Watch Later)
let gapiInited=false;
function gapiLoad(){ return new Promise(res=>{ gapi.load('client:auth2', ()=>res()); }); }
async function gapiInit(){
  if(!gapiInited){
    await gapiLoad();
    gapiInited=true;
  }
  const key = state.ext.cfg.ytApiKey;
  const cid = state.ext.cfg.ytClientId;
  if(!key || !cid){ alert('Set API Key & Client ID'); return false; }
  await gapi.client.init({
    apiKey: key,
    clientId: cid,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
    scope: "https://www.googleapis.com/auth/youtube.readonly"
  });
  return true;
}
document.getElementById('saveYtCfg').onclick = ()=>{
  state.ext.cfg.ytApiKey = document.getElementById('ytApiKey').value.trim();
  state.ext.cfg.ytClientId = document.getElementById('ytClientId').value.trim();
  saveExt(); alert('Saved YouTube config.');
};
document.getElementById('ytSignIn').onclick = async ()=>{
  if(!(await gapiInit())) return;
  await gapi.auth2.getAuthInstance().signIn();
  alert('Signed in');
};
document.getElementById('ytSignOut').onclick = async ()=>{
  if(!(await gapiInit())) return;
  await gapi.auth2.getAuthInstance().signOut();
  alert('Signed out');
};
document.getElementById('loadWatchLater').onclick = async ()=>{
  if(!(await gapiInit())) return;
  if(!gapi.auth2.getAuthInstance().isSignedIn.get()){ alert('Sign in first'); return; }
  try{
    const resp = await gapi.client.youtube.playlistItems.list({ part:'snippet,contentDetails', maxResults:10, playlistId:'WL' });
    const ul = document.getElementById('ytWatchLater'); ul.innerHTML='';
    (resp.result.items||[]).forEach(it=>{
      const vid = it.contentDetails.videoId;
      const title = it.snippet.title;
      const thumb = it.snippet.thumbnails?.medium?.url || '';
      const li = document.createElement('li');
      const img = document.createElement('img'); img.src=thumb;
      const a = document.createElement('a'); a.href='#'; a.textContent=title;
      a.onclick = (e)=>{ e.preventDefault(); state.player && state.player.loadVideoById(vid); };
      li.append(img,a); ul.appendChild(li);
    });
  }catch(e){ alert('Unable to load Watch Later'); console.error(e); }
};

// ===== TikTok =====
function buildTikTokEmbed(url){
  const wrap = document.getElementById('tiktokEmbed');
  wrap.innerHTML='';
  const bk = document.createElement('blockquote');
  bk.className='tiktok-embed';
  bk.setAttribute('cite', url);
  bk.setAttribute('data-video-id','');
  bk.style='max-width:720px; min-width:325px;';
  bk.appendChild(document.createElement('section'));
  wrap.appendChild(bk);
}
document.getElementById('loadTk').onclick = ()=>{
  const u = document.getElementById('tkUrl').value.trim();
  if(!u) return;
  buildTikTokEmbed(u);
  attachOverlaysForActiveTab();
};

// ===== Local/URL video =====
const video = document.getElementById('video');
document.getElementById('videoFile').addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  video.src = url; video.play().catch(()=>{});
  attachOverlaysForActiveTab();
});
document.getElementById('loadVideo').onclick = ()=>{
  const url = document.getElementById('videoUrl').value.trim();
  if(!url) return;
  video.src = url; video.play().catch(()=>{});
  attachOverlaysForActiveTab();
};
document.getElementById('playVideo').onclick = ()=>{ if(video.paused) video.play(); else video.pause(); };
document.getElementById('pipVideo').onclick = async ()=>{ try{ await video.requestPictureInPicture(); }catch(e){ alert('PiP not supported'); } };

// ===== Embed Browser =====
document.getElementById('goUrl').onclick = ()=>{
  const url = document.getElementById('navUrl').value.trim();
  if(!url) return;
  try{ new URL(url); document.getElementById('embedFrame').src = url; }
  catch(e){
    // fallback: treat as YouTube ID
    const id = extractYouTubeId(url);
    document.getElementById('embedFrame').src = 'https://www.youtube.com/embed/'+id;
  }
  attachOverlaysForActiveTab();
};
document.getElementById('openNew').onclick = ()=>{
  const url = document.getElementById('navUrl').value.trim();
  if(url) window.open(url, '_blank', 'noopener');
};

// ===== Helpers =====
function downloadFile(name, content, type){
  const blob = new Blob([content], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// ===== Init =====
function initYtCfgUI(){
  document.getElementById('ytApiKey').value = state.ext.cfg.ytApiKey || '';
  document.getElementById('ytClientId').value = state.ext.cfg.ytClientId || '';
  renderBookmarks();
}
function init(){
  loadCore(); loadExt();
  renderCategories(); renderMessages(); renderPresets(); renderMultiCats();
  attachOverlaysForActiveTab(); initYtCfgUI();
  if('serviceWorker' in navigator){ window.addEventListener('load', ()=>navigator.serviceWorker.register('sw.js')); }
}
init();
