const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./cloud-BSWqccjs.js","./index-BDVmTcBx.js","./index-C-j-Whiw.css","./zip-D_jIKcq_.js","./bytes-Bld9ulzd.js"])))=>i.map(i=>d[i]);
import{P as L,_ as w,c as C,h as A,cb as I,g3 as M,g6 as P,g8 as T,g9 as j,g7 as D}from"./index-BDVmTcBx.js";import{S as q}from"./host-_3bc49YR.js";/* empty css                  */const N=`// Script runtime: the \`studio\` API as a script sees it. This file runs inside
// the script sandbox (a dedicated worker started by an iframe with an opaque
// origin and a content security policy without network access), followed by
// the user's script wrapped in an async function. Every call becomes a
// structured-clone message to Photo Studio, which checks it and answers.
// Plain JavaScript: it is inserted as text, not bundled.
const __studioRegister = (() => {
  'use strict';
  let port = null;
  let main = null;
  let info = { lineOffset: 0, script: { id: '', name: '' }, event: null };
  let next = 0;
  let cancelled = false;
  const pending = new Map();
  // Calls a script may have waiting at once: a loop that calls the API without
  // awaiting stops here instead of flooding Photo Studio with requests.
  const MAX_PENDING = 10000;

  class ScriptCancelled extends Error {
    constructor() {
      super('The script was stopped.');
      this.name = 'ScriptCancelled';
    }
  }
  const send = (message) => port.postMessage(message);
  function call(method, ...args) {
    if (cancelled) return Promise.reject(new ScriptCancelled());
    if (pending.size >= MAX_PENDING) throw new Error(\`More than \${MAX_PENDING} API calls are waiting: use await in loops that call the studio API.\`);
    flushLogs();
    const id = ++next;
    // The call site, so an error reports the script's line rather than the runtime's.
    const site = new Error();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, site });
      send({ type: 'call', id, method, args });
    });
  }
  function receive(ev) {
    const m = ev.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ping') return send({ type: 'pong', n: m.n });
    if (m.type === 'cancel') {
      cancelled = true;
      for (const p of pending.values()) p.reject(new ScriptCancelled());
      pending.clear();
      return;
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.type === 'result') p.resolve(m.value);
    else if (m.name === 'ScriptCancelled') p.reject(new ScriptCancelled());
    else {
      const error = new Error(m.message);
      error.name = m.name || 'Error';
      error.stack = \`\${error.name}: \${error.message}\\n\${String(p.site.stack || '').split('\\n').slice(1).join('\\n')}\`;
      p.reject(error);
    }
  }

  // console.* goes to the Scripts panel output.
  const show = (v) => {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return \`\${v.name}: \${v.message}\`;
    try {
      return JSON.stringify(v, (_k, x) => (ArrayBuffer.isView(x) ? \`[\${x.constructor.name} \${x.length}]\` : x));
    } catch {
      return String(v);
    }
  };
  // Output goes out at once up to LOG_RATE lines a second; more is held (the
  // latest LOG_HOLD lines) until the script next waits, so a loop that keeps
  // logging cannot flood Photo Studio or keep the watchdog from stopping it.
  const LOG_RATE = 100;
  const LOG_HOLD = 500;
  let held = [];
  let dropped = 0;
  let flushTimer = 0;
  let windowStart = 0;
  let windowCount = 0;
  function flushLogs() {
    clearTimeout(flushTimer);
    flushTimer = 0;
    if (dropped) send({ type: 'log', level: 'warn', text: \`(\${dropped} more lines were not shown)\` });
    for (const line of held) send(line);
    held = [];
    dropped = 0;
    windowStart = Date.now();
    windowCount = 0;
  }
  function emit(line) {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      windowCount = 0;
    }
    if (!held.length && windowCount < LOG_RATE) {
      windowCount++;
      return send(line);
    }
    held.push(line);
    if (held.length >= LOG_HOLD * 2) {
      dropped += held.length - LOG_HOLD;
      held = held.slice(-LOG_HOLD);
    }
    flushTimer ||= setTimeout(flushLogs, 50);
  }
  const log = (level) => (...args) => emit({ type: 'log', level, text: args.map(show).join(' ').slice(0, 4000) });
  const scriptConsole = Object.freeze({ log: log('log'), info: log('info'), debug: log('log'), warn: log('warn'), error: log('error') });

  const idOf = (layer) => (layer && typeof layer === 'object' ? layer.id : layer);
  const layer = (info) => (info ? new Layer(info) : null);

  class Layer {
    constructor(data) {
      Object.assign(this, data);
    }
    refresh() { return call('layers.get', this.documentId, this.id).then(layer); }
    set(props) { return call('layers.set', this.documentId, this.id, props).then(layer); }
    rename(name) { return this.set({ name }); }
    show() { return this.set({ visible: true }); }
    hide() { return this.set({ visible: false }); }
    move(dx, dy) { return call('layers.translate', this.documentId, this.id, dx, dy).then(layer); }
    moveTo(x, y) {
      const b = this.bounds || { x: 0, y: 0 };
      return this.move(x - b.x, y - b.y);
    }
    arrange(where) {
      const w = where && typeof where === 'object' ? Object.fromEntries(Object.entries(where).map(([k, v]) => [k, idOf(v)])) : where;
      return call('layers.arrange', this.documentId, this.id, w).then(layer);
    }
    duplicate() { return call('layers.duplicate', this.documentId, this.id).then(layer); }
    remove() { return call('layers.remove', this.documentId, this.id); }
    select() { return call('layers.select', this.documentId, [this.id]); }
    pixels(rect) { return call('layers.getPixels', this.documentId, this.id, rect); }
    setPixels(image, x, y) {
      const img = x === undefined ? image : { ...image, x, y };
      return call('layers.setPixels', this.documentId, this.id, img).then(layer);
    }
    getText() { return call('layers.getText', this.documentId, this.id); }
    setText(textOrOptions) { return call('layers.setText', this.documentId, this.id, textOrOptions).then(layer); }
    setStyle(style) { return call('layers.setStyle', this.documentId, this.id, style).then(layer); }
    async children() {
      const all = await call('layers.list', this.documentId);
      return all.filter((l) => l.parentId === this.id).map(layer);
    }
    export(options = {}) { return call('documents.export', this.documentId, { ...options, layer: this.id }); }
  }

  const doc = (info) => (info ? new Document(info) : null);
  class Document {
    constructor(data) {
      Object.assign(this, data);
    }
    refresh() { return call('documents.get', this.id).then(doc); }
    activate() { return call('documents.activate', this.id).then(doc); }
    async layers() { return (await call('layers.list', this.id)).map(layer); }
    async layer(idOrName) {
      const all = await call('layers.list', this.id);
      return layer(all.find((l) => l.id === idOrName) || all.find((l) => l.name === idOrName));
    }
    async selectedLayers() { return (await call('layers.selected', this.id)).map(layer); }
    selectLayers(layers) { return call('layers.select', this.id, [].concat(layers).map(idOf)); }
    addLayer(options = {}) {
      const o = { ...options };
      for (const k of ['above', 'inside']) if (o[k] !== undefined) o[k] = idOf(o[k]);
      return call('layers.create', this.id, o).then(layer);
    }
    composite(rect) { return call('documents.composite', this.id, rect); }
    selection() { return call('selection.get', this.id); }
    select(shape, operation) { return call('selection.set', this.id, shape, operation); }
    selectAll() { return call('selection.all', this.id); }
    deselect() { return call('selection.clear', this.id); }
    invertSelection() { return call('selection.invert', this.id); }
    selectionMask() { return call('selection.getMask', this.id); }
    setSelectionMask(mask, operation) { return call('selection.setMask', this.id, mask, operation); }
    run(command, arg) { return call('commands.run', command, arg, this.id); }
    export(options = {}) { return call('documents.export', this.id, options); }
    save() { return call('documents.save', this.id); }
    close(options = {}) { return call('documents.close', this.id, options); }
    undo() { return call('documents.undo', this.id); }
    redo() { return call('documents.redo', this.id); }
  }

  const studio = Object.freeze({
    apiVersion: 1,
    get script() { return { ...info.script }; },
    // Set when the script runs for a Script Events Manager event.
    get event() { return info.event ? { ...info.event } : null; },
    get cancelled() { return cancelled; },
    checkCancelled() {
      if (cancelled) throw new ScriptCancelled();
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.min(60000, Number(ms) || 0)))),
    app: Object.freeze({
      info: () => call('app.info'),
      message: (text) => call('app.message', String(text)),
    }),
    documents: Object.freeze({
      list: async () => (await call('documents.list')).map(doc),
      active: () => call('documents.active').then(doc),
      get: (id) => call('documents.get', id).then(doc),
      create: (options = {}) => call('documents.create', options).then(doc),
      open: async (options = {}) => (await call('documents.open', options)).map(doc),
    }),
    commands: Object.freeze({
      run: (id, arg) => call('commands.run', id, arg),
      list: () => call('commands.list'),
    }),
    history: Object.freeze({
      checkpoint: (label) => call('history.checkpoint', label),
      setGrouping: (on) => call('history.grouping', !!on),
    }),
    ui: Object.freeze({
      alert: (message, title) => call('ui.alert', String(message), title),
      confirm: (message, title) => call('ui.confirm', String(message), title),
      prompt: (message, value, title) => call('ui.prompt', String(message), value === undefined ? '' : String(value), title),
      form: (title, fields, options) => call('ui.form', String(title), fields, options),
      progress: (fraction, message) => call('ui.progress', fraction === undefined ? null : fraction, message),
    }),
    files: Object.freeze({
      open: (options = {}) => call('files.open', options),
      save: (name, data, type) => call('files.save', name, data, type),
      saveAll: (files, zipName) => call('files.saveAll', files, zipName),
    }),
    image: Object.freeze({
      create(width, height, fill) {
        const data = new Uint8ClampedArray(width * height * 4);
        if (fill) {
          const [r, g, b, a = 255] = typeof fill === 'string' ? [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16)) : fill;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
        return { width, height, data };
      },
      encode: (image, options) => call('image.encode', image, options),
    }),
  });

  // The script's own line number of an error, from the worker's stack.
  function lineOf(error) {
    const stack = String((error && error.stack) || '');
    for (const m of stack.matchAll(/blob:[^\\s)]*?:(\\d+):\\d+/g)) {
      const line = Number(m[1]) - info.lineOffset;
      if (line > 0) return line;
    }
    return 0;
  }
  async function run() {
    try {
      if (!main) throw new Error('The script did not load.');
      await main(studio, scriptConsole);
      flushLogs();
      send({ type: 'done' });
    } catch (error) {
      flushLogs();
      if (cancelled || (error && error.name === 'ScriptCancelled')) return send({ type: 'done', cancelled: true });
      send({ type: 'failed', name: (error && error.name) || 'Error', message: String((error && error.message) || error), line: lineOf(error) });
    }
  }
  self.addEventListener('unhandledrejection', (ev) => {
    ev.preventDefault();
    if (port && !(ev.reason && ev.reason.name === 'ScriptCancelled')) scriptConsole.error('Unhandled rejection:', ev.reason);
  });
  self.onmessage = (ev) => {
    if (port || !ev.data || ev.data.type !== 'start' || !ev.ports[0]) return;
    port = ev.ports[0];
    info = ev.data.info;
    port.onmessage = receive;
    void run();
  };
  return (fn) => {
    main = fn;
  };
})();
`,R="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:",z=`let started = false;
addEventListener('message', (ev) => {
  if (started || ev.source !== parent || !ev.data || ev.data.type !== 'start' || !ev.ports[0]) return;
  started = true;
  const url = URL.createObjectURL(new Blob([ev.data.code], { type: 'text/javascript' }));
  const worker = new Worker(url, { name: 'script' });
  worker.onerror = (e) => {
    e.preventDefault();
    parent.postMessage({ type: 'worker-error', message: String(e.message || 'The script could not run.'), line: e.lineno || 0 }, '*');
  };
  worker.postMessage({ type: 'start', info: ev.data.info }, [ev.ports[0]]);
});`;function G(){return`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${R}"><script>${z}<\/script></head><body></body></html>`}function F(n){const e=`${N}
__studioRegister(async function (studio, console) {
`;return{code:`${e}${n}
});
`,lineOffset:e.split(`
`).length-1}}const B=1e3,k=1e3,v=4e3,O=1e4,H=new Set(["log","info","warn","error"]);class U{constructor(e,s,t,i=30){this.source=e,this.info=s,this.handlers=t,this.timeoutSeconds=i}source;info;handlers;timeoutSeconds;frame;port;finish;watchdog=0;heard=0;queue=Promise.resolve();stopping=0;inCall=0;queued=0;pings=[];logWindow=0;logCount=0;logDropped=0;onWindowMessage=e=>{if(!this.frame||e.source!==this.frame.contentWindow)return;const s=e.data;s?.type==="worker-error"&&this.end({status:"failed",message:String(s.message??"The script could not run.").replace(/^Uncaught /,"").slice(0,v),line:Math.max(0,Number(s.line)-this.lineOffset)})};lineOffset=0;run(){return new Promise(e=>{this.finish=e;const{code:s,lineOffset:t}=F(this.source);this.lineOffset=t;const i=document.createElement("iframe");i.setAttribute("sandbox","allow-scripts"),i.setAttribute("aria-hidden","true"),i.tabIndex=-1,i.className="script-sandbox",i.title="Script sandbox",i.srcdoc=G(),this.frame=i,window.addEventListener("message",this.onWindowMessage),i.addEventListener("load",()=>{const r=new MessageChannel;this.port=r.port1,this.port.onmessage=o=>this.receive(o.data),this.heard=performance.now(),i.contentWindow.postMessage({type:"start",code:s,info:{...this.info,lineOffset:t}},"*",[r.port2]),this.watchdog=window.setInterval(()=>this.tick(),B)},{once:!0}),document.body.append(i)})}cancel(){!this.finish||this.stopping||(this.port?.postMessage({type:"cancel"}),this.stopping=window.setTimeout(()=>this.end({status:"cancelled"}),2e3))}tick(){const e=Math.floor(Math.random()*4503599627370496);this.pings=[e,...this.pings].slice(0,4),this.port?.postMessage({type:"ping",n:e}),this.inCall&&(this.heard=performance.now()),(performance.now()-this.heard)/1e3>this.timeoutSeconds?this.end({status:"timeout",seconds:this.timeoutSeconds}):this.flushDropped()}receive(e){if(!(!e||typeof e!="object"||!this.finish))if(e.type==="pong")typeof e.n=="number"&&this.pings.includes(e.n)&&(this.heard=performance.now());else if(e.type==="call"&&typeof e.id=="number"&&typeof e.method=="string"){const{id:s,method:t}=e,i=Array.isArray(e.args)?e.args:[];if(++this.queued>O)return this.end({status:"failed",message:`More than ${O} API calls are waiting: use await in loops that call the studio API.`,line:0});this.queue=this.queue.then(async()=>{if(this.finish){this.inCall++;try{const r=await this.handlers.call(t,i);this.port?.postMessage({type:"result",id:s,value:r},V(r))}catch(r){const o=r instanceof Error?r:new Error(String(r));this.port?.postMessage({type:"error",id:s,name:o.name==="ScriptError"?"Error":o.name,message:o.message})}finally{this.inCall--,this.heard=performance.now()}}}).finally(()=>this.queued--)}else e.type==="log"?this.log(e.level,e.text):e.type==="done"?this.end({status:e.cancelled?"cancelled":"done"}):e.type==="failed"&&this.end({status:"failed",message:String(e.message??"The script failed.").slice(0,v),line:Math.max(0,Math.floor(Number(e.line)))||0})}log(e,s){const t=performance.now();if(t-this.logWindow>=1e3&&(this.flushDropped(),this.logWindow=t,this.logCount=0),typeof s=="string"&&s.length>v||this.logCount>k*20)return this.end({status:"failed",message:"It sent more output than Photo Studio accepts.",line:0});if(++this.logCount>k){this.logDropped++;return}this.handlers.log(typeof e=="string"&&H.has(e)?e:"log",String(s??"").slice(0,v))}flushDropped(){if(!this.logDropped)return;const e=this.logDropped;this.logDropped=0,this.handlers.log("warn",`(${e} more lines were not shown)`)}end(e){const s=this.finish;s&&(this.flushDropped(),this.finish=void 0,this.queue.then(()=>{this.dispose(),s(this.stopping&&e.status==="done"?{status:"cancelled"}:e)}))}dispose(){clearInterval(this.watchdog),clearTimeout(this.stopping),window.removeEventListener("message",this.onWindowMessage),this.port?.close(),this.port=void 0,this.frame?.remove(),this.frame=void 0}}function V(n){const e=new Set,s=t=>{ArrayBuffer.isView(t)&&t.buffer instanceof ArrayBuffer&&t.byteLength===t.buffer.byteLength&&e.add(t.buffer)};if(n&&typeof n=="object"){s(n);for(const t of Object.values(n))s(t)}return[...e]}const p=n=>C(String(n));function g(n,e,s,t,i){const r=document.createElement("dialog");r.className="files-dialog script-dialog",r.setAttribute("aria-label",e);const o=t.at(-1);r.innerHTML=`<form method="dialog"><p class="script-origin" title="This window comes from a script you installed">${L("square-code",13)}<span>Script: ${p(n)}</span></p><h2>${p(e)}</h2>${s}<div class="dialog-actions">${t.slice(0,-1).map(([u,l])=>`<button type="button" data-act="${u}">${p(l)}</button>`).join("")}<button type="submit" class="primary" data-act="${o[0]}">${p(o[1])}</button></div></form>`,document.body.append(r);const d=r.querySelector("form");return new Promise(u=>{const l=c=>{r.close(),r.remove(),u(c===null?null:{action:c,form:d})};r.addEventListener("cancel",c=>{c.preventDefault(),l(null)}),d.addEventListener("submit",c=>{c.preventDefault(),d.reportValidity()&&l(o[0])});for(const[c,,h]of t.slice(0,-1))h||r.querySelector(`button[data-act="${c}"]`).addEventListener("click",()=>l(c==="cancel"?null:c));i?.(r),r.showModal()})}const b=n=>n.split(/\n{2,}/).map(e=>`<p class="script-message">${p(e).replace(/\n/g,"<br>")}</p>`).join("");function W(n,e){const s=`script-field-${e}`,t=o=>n[o]!==void 0?`${o}="${n[o]}"`:"",i=`name="${p(n.name)}" id="${s}"`;let r;return n.type==="checkbox"?`<label class="dialog-field checkbox-field" for="${s}">${p(n.label)}<input type="checkbox" ${i} ${n.value===!0||n.value==="yes"?"checked":""}></label>`:(n.type==="select"?r=`<select ${i}>${(n.options??[]).map(([o,d])=>`<option value="${p(o)}" ${String(n.value)===o?"selected":""}>${p(d)}</option>`).join("")}</select>`:n.type==="textarea"?r=`<textarea ${i} rows="4">${p(n.value)}</textarea>`:n.type==="range"?r=`<span class="script-range"><input type="range" ${i} ${t("min")} ${t("max")} ${t("step")} value="${p(n.value)}"><output for="${s}">${p(n.value)}</output></span>`:n.type==="number"?r=`<input type="number" ${i} ${t("min")} ${t("max")} ${n.step!==void 0?t("step"):'step="any"'} value="${p(n.value)}" required>`:n.type==="color"?r=`<input type="color" ${i} value="${/^#[0-9a-f]{6}$/i.test(String(n.value))?p(n.value):"#000000"}">`:r=`<input type="text" ${i} value="${p(n.value)}" autocomplete="off">`,`<label class="dialog-field" for="${s}">${p(n.label)}${r}</label>`)}function X(n,e,s){return{async alert(t,i){await g(e,i,b(t),[["ok","OK"]])},async confirm(t,i){return(await g(e,i,b(t),[["cancel","Cancel"],["ok","OK"]]))?.action==="ok"},async prompt(t,i,r){const o=await g(e,r,`${b(t)}<label class="dialog-field"><input type="text" name="answer" value="${p(i)}" autocomplete="off" aria-label="Answer"></label>`,[["cancel","Cancel"],["ok","OK"]]);return o?o.form.elements.namedItem("answer").value:null},async form(t,i,r,o){const d=await g(e,t,`${o?b(o):""}<div class="script-form">${i.map(W).join("")}</div>`,[["cancel","Cancel"],["ok",r]],l=>{for(const c of l.querySelectorAll('input[type="range"]'))c.addEventListener("input",()=>c.nextElementSibling.textContent=c.value)});if(!d)return null;const u={};return i.forEach((l,c)=>{const h=d.form.querySelector(`#script-field-${c}`);u[l.name]=l.type==="checkbox"?h.checked:l.type==="number"||l.type==="range"?Number(h.value):h.value}),u},progress:s,async openFiles(t){const i=t.accept==="image"||!t.accept?document.querySelector("#file-input")?.accept??"image/*":t.accept;let r=null;return await g(e,t.multiple?"Choose Files":"Choose a File",`<p class="script-message">The script asks to read ${t.multiple?"files":"a file"}. It receives only what you choose.</p><p class="script-picked muted" aria-live="polite">Nothing chosen yet.</p>`,[["cancel","Cancel"],["device","From this device…","stay"],["puter","From Puter…","stay"],["ok","Use"]],d=>{const u=d.querySelector('button[type="submit"]');u.disabled=!0;const l=d.querySelector(".script-picked"),c=a=>{r=a,u.disabled=!a.length,l.textContent=a.length?a.map(m=>m.name).join(", "):"Nothing chosen yet."},h=async a=>c(await Promise.all(a.map(async m=>{const f=await m.read();return{name:m.name,type:f.type||m.type||"",data:new Uint8Array(await f.arrayBuffer())}})));d.querySelector('[data-act="device"]').addEventListener("click",()=>{const a=document.createElement("input");a.type="file",a.accept=i,a.multiple=t.multiple,a.onchange=()=>{h(Array.from(a.files??[]).map(m=>({name:m.name,type:m.type,read:async()=>m})))},a.click()}),d.querySelector('[data-act="puter"]').addEventListener("click",()=>{w(async()=>{const{pickCloudFiles:a}=await import("./cloud-BSWqccjs.js");return{pickCloudFiles:a}},__vite__mapDeps([0,1,2]),import.meta.url).then(({pickCloudFiles:a})=>a(t.multiple,i)).then(a=>h(a.map(m=>({name:m.name,read:()=>m.read()})))).catch(a=>l.textContent=String(a instanceof Error?a.message:a))})})?r??[]:[]},async saveFiles(t,i){const r=t.reduce((h,a)=>h+a.data.length,0),o=r<1024*1024?`${Math.max(1,Math.round(r/1024))} KB`:`${(r/1048576).toFixed(1)} MB`,d=t.length===1?`“${t[0].name}”`:`${t.length} files as “${i}”`,u=await g(e,"Save Files",`<p class="script-message">The script wants to save ${p(d)} (${o}).</p>`,[["cancel","Cancel"],["puter","Save to Puter…"],["download","Download"]]);if(!u)return!1;let l,c;if(t.length===1)l=new Blob([t[0].data],{type:t[0].type}),c=t[0].name;else{const{uniqueName:h,zipStore:a}=await w(async()=>{const{uniqueName:f,zipStore:_}=await import("./zip-D_jIKcq_.js");return{uniqueName:f,zipStore:_}},__vite__mapDeps([3,4]),import.meta.url),m=new Set;l=new Blob([a(t.map(f=>({name:h(f.name,m),data:f.data})))],{type:"application/zip"}),c=i??"files.zip"}if(u.action==="puter"){const{cloudSaveAs:h}=await w(async()=>{const{cloudSaveAs:a}=await import("./cloud-BSWqccjs.js");return{cloudSaveAs:a}},__vite__mapDeps([0,1,2]),import.meta.url);h(l,c).then(a=>n.message(`Saved ${a.name} to Puter`)).catch(a=>n.message(String(a instanceof Error?a.message:a)))}else{const{download:h}=await w(async()=>{const{download:a}=await import("./index-BDVmTcBx.js").then(m=>m.oS);return{download:a}},__vite__mapDeps([1,2]),import.meta.url);h(l,c)}return!0}}}function K(n,e,s){const t=document.createElement("div");t.className="script-run",t.setAttribute("role","status"),t.hidden=!0,t.innerHTML=`${L("square-code",14)}<span class="script-run-name">${p(e)}</span><span class="script-run-message"></span><progress max="1" aria-label="Script progress"></progress><button type="button" class="script-run-stop" title="Stop the script (its changes so far stay as one undo step)">Stop</button>`,t.querySelector("button").addEventListener("click",s),n.root.append(t);const i=window.setTimeout(()=>t.hidden=!1,400),r=t.querySelector("progress");return r.removeAttribute("value"),{progress(o,d){o===null?r.removeAttribute("value"):r.value=o,t.querySelector(".script-run-message").textContent=d,(d||o!==null)&&(t.hidden=!1)},stopping(){t.querySelector("button").disabled=!0,t.querySelector(".script-run-message").textContent="Stopping…"},remove(){clearTimeout(i),t.remove()}}}const E=500,y=[],$=new Set;function te(n){return $.add(n),()=>$.delete(n)}function x(n,e,s){y.push({time:Date.now(),script:n,level:e,text:s}),y.length>E&&y.splice(0,y.length-E),$.forEach(t=>t())}function ne(){y.length=0,$.forEach(n=>n())}let S;const se=()=>!!S;async function J(n,e){const s=await A({title:"Run Script?",className:"script-confirm",body:`<p>“${C(n)}” is a script: a small program that can change your open documents, create and close documents, and ask you to open or save files.</p><p class="muted">It runs separately from Photo Studio, without network access and without access to your Puter account or this site's storage. Run it only if you trust where it came from.</p>${e.offerInstall?'<label class="dialog-field checkbox-field">Add it to File → Scripts<input type="checkbox" name="install"></label>':""}`,submit:"Run Script"});if(!s)return null;const t=e.offerInstall&&I(s.form,"install");return s.close(),{install:t}}async function re(n,e){if(S)return n.message("Another script is running. Stop it first."),!1;let s=e.trusted??(e.id?!!M(e.id)?.trusted:!1);if(!s){if(e.event)return n.message(`“${e.name}” was not run for ${e.event.name}: run it once from File → Scripts first.`),!1;const u=await J(e.name,{offerInstall:!e.id});if(!u)return!1;if(s=!0,e.id)await P(e.id,{trusted:!0});else if(u.install){const l=T(e.source,e.name,{trusted:!0});await j(l),e={...e,id:l.id}}}const t=`${e.name} (script)`;let i;const r=new U(e.source,{script:{id:e.id??"",name:e.name},event:e.event??null},{call:(u,l)=>o.call(u,l),log:(u,l)=>x(e.name,u,l)},D(e.source).timeout??30);i=K(n,e.name,()=>{i?.stopping(),r.cancel()});const o=new q(n,X(n,e.name,(u,l)=>i?.progress(u,l)),t);S=r;let d;try{d=await r.run()}finally{S=void 0,i.remove(),o.finish()}return Q(n,e.name,d),!0}function Q(n,e,s){if(s.status==="done"){x(e,"info","Finished.");return}const t=s.status==="cancelled"?`Stopped “${e}”. Changes it made so far can be undone in one step.`:s.status==="timeout"?`Stopped “${e}”: it did not respond for ${s.seconds} seconds.`:`“${e}” failed${s.line?` at line ${s.line}`:""}: ${s.message}`;x(e,s.status==="cancelled"?"info":"error",t),n.message(t)}export{ne as clearScriptLog,J as confirmScript,te as onScriptLog,re as runScript,y as scriptLog,se as scriptRunning};
