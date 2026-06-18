        const audio = document.getElementById('bg-music');
        const modal = document.getElementById('instructions-modal');
        const startBtn = document.getElementById('start-btn');
        const levelContainer = document.getElementById('level-container');
        const levelTitle = document.getElementById('level-title');
        const progressBar = document.getElementById('global-progress');
        const progressContainer = document.getElementById('progress-bar-container');
        const levelsRoot = document.getElementById('levels-root');
        const REDIS_URL = "https://expert-jawfish-72148.upstash.io";
        const REDIS_TOKEN = "gQAAAAAAARnUAAIncDJjOGEyNGM2NzBkODg0ODFmOWMzYmMwNjc4N2M0NGEzY3AyNzIxNDg";

        let currentVolume = 75;
        let progressTimer = null;
        let currentLevelIndex = 0;
        let l3Distance = 0;
        let maxUnlockedLevel = 0;
        let startTime = null;
        let totalFails = 0;
        let levels = [];

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW setup failed: ', err));
            });
        }
        
        fetch(`${REDIS_URL}/get/global_survivors`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        })
        .then(res => res.json())
        .then(data => {
            const countEl = document.getElementById('intro-survivor-count');
            if (countEl && data.result) {
                
                const currentVictims = parseInt(data.result).toLocaleString();
                countEl.innerText = currentVictims;
                countEl.classList.remove('animate-pulse');
            }
        })
        .catch(err => {
            const countEl = document.getElementById('intro-survivor-count');
            if (countEl) countEl.innerText = "Countless";
            countEl.classList.remove('animate-pulse');
        });

        fetch('https://willworkforbugs.goatcounter.com/counter//.json')
        .then(res => res.json())
        .then(data => {
            const insEl = document.getElementById('intro-insanity-count');
            if (insEl && data.count) {
                
                insEl.innerText = data.count; 
                insEl.classList.remove('animate-pulse');
            }
        })
        .catch(() => {
            const insEl = document.getElementById('intro-insanity-count');
            if (insEl) {
                insEl.innerText = "Thousands";
                insEl.classList.remove('animate-pulse');
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                audio.pause();
            } else {
              
                if (startTime !== null && currentLevelIndex < levels.length) {
                    audio.play().catch(e => console.warn("Audio resume blocked by browser"));
                }
            }
        });

        function setVolume(val) {
            currentVolume = Math.max(0, Math.min(100, val));
            audio.volume = currentVolume / 100;

            if (levels[currentLevelIndex] && typeof levels[currentLevelIndex].updateUI === 'function') {
                levels[currentLevelIndex].updateUI(currentVolume);
            }

            if (currentVolume === 25) {
                if (!progressTimer) {
                    progressTimer = setTimeout(() => {
                        const currentLvl = levels[currentLevelIndex];
                        if (currentLvl && typeof currentLvl.canProgress === 'function' && !currentLvl.canProgress()) {
                            if (typeof currentLvl.onProgressFail === 'function') currentLvl.onProgressFail(); 
                        } else {
                            nextLevel(); 
                        }
                    }, 3000);
                }
            } else {
                if (progressTimer) {
                    clearTimeout(progressTimer);
                    progressTimer = null;
                }
            }
        }

        const levelBehaviors = [
            { id: 'level-1', init: () => { document.getElementById('l1-slider').addEventListener('input', (e) => setVolume(parseInt(e.target.value))); }, updateUI: (v) => { document.getElementById('l1-slider').value = v; document.getElementById('l1-display').innerText = v + '%'; }, reset: () => {} },
            { id: 'level-2', init: () => { document.getElementById('l2-up').onclick = () => setVolume(currentVolume + 1); document.getElementById('l2-down').onclick = () => setVolume(currentVolume - 1); }, updateUI: (v) => { document.getElementById('l2-display').innerText = v + '%'; }, reset: () => {} },
            { id: 'level-3', init: () => { const u = document.getElementById('l3-up'); const d = document.getElementById('l3-down'); u.onclick = () => { setVolume(currentVolume + 1); l3Distance += 1; u.style.transform = `translateY(-${l3Distance}px)`; d.style.transform = `translateY(${l3Distance}px)`; }; d.onclick = () => { setVolume(currentVolume - 1); l3Distance += 1; u.style.transform = `translateY(-${l3Distance}px)`; d.style.transform = `translateY(${l3Distance}px)`; }; }, updateUI: (v) => { document.getElementById('l3-display').innerText = v + '%'; }, reset: () => { l3Distance = 0; document.getElementById('l3-up').style.transform = `translateY(0px)`; document.getElementById('l3-down').style.transform = `translateY(0px)`; } },            
            { id: 'level-4', isDragging: false, init: function() { const k = document.getElementById('l4-knob'); const calc = (cX, cY) => { if (!this.isDragging) return; const r = k.getBoundingClientRect(); const x = cX - (r.left + r.width / 2); const y = cY - (r.top + r.height / 2); let deg = Math.atan2(y, x) * (180 / Math.PI) + 90; if (deg < -180) deg += 360; if (deg > 180) deg -= 360; if (deg > 135 && deg < 180) deg = 135; if (deg < -135 || (deg > 180 && deg < 225)) deg = -135; if (deg >= -135 && deg <= 135) setVolume(Math.round(((deg + 135) / 270) * 100)); }; const s = () => { this.isDragging = true; k.classList.remove('cursor-grab'); k.classList.add('cursor-grabbing'); }; const e = () => { this.isDragging = false; k.classList.remove('cursor-grabbing'); k.classList.add('cursor-grab'); }; k.addEventListener('mousedown', s); document.addEventListener('mousemove', (ev) => calc(ev.clientX, ev.clientY)); document.addEventListener('mouseup', e); k.addEventListener('touchstart', (ev) => { ev.preventDefault(); s(); }, {passive: false}); document.addEventListener('touchmove', (ev) => { if (this.isDragging) ev.preventDefault(); calc(ev.touches[0].clientX, ev.touches[0].clientY); }, {passive: false}); document.addEventListener('touchend', e); }, updateUI: (v) => { document.getElementById('l4-display').innerText = v + '%'; document.getElementById('l4-knob').style.transform = `rotate(${(v / 100) * 270 - 135}deg)`; }, reset: function() { this.isDragging = false; document.getElementById('l4-knob').classList.add('cursor-grab'); } },
            { id: 'level-5', init: () => { const s = document.getElementById('l5-slider'); s.addEventListener('input', (e) => setVolume(parseInt(e.target.value))); const c = s.parentElement; c.classList.add('cursor-pointer'); c.addEventListener('mousedown', (e) => { if (e.target === s) return; const r = c.getBoundingClientRect(); setVolume(Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))); }); }, updateUI: (v) => { document.getElementById('l5-slider').value = v; document.getElementById('l5-display').innerText = v + '%'; document.getElementById('l5-slider').style.transform = `scale(${Math.max(0.09, v / 100)})`; }, reset: () => { document.getElementById('l5-slider').style.transform = 'scale(0.75)'; } },            
            { id: 'level-6', interval: null, init: function() {}, updateUI: (v) => { document.getElementById('l6-display').innerText = v + '%'; }, reset: function() { const c = document.getElementById('l6-bubble-container'); c.innerHTML = ''; if (this.interval) clearInterval(this.interval); this.interval = setInterval(() => { if(document.getElementById('level-6').classList.contains('hidden')) return clearInterval(this.interval); const b = document.createElement('button'); const win = Math.random() < 0.05; const v = win ? 25 : Math.floor(Math.random() * 101); b.innerText = v; b.className = "absolute rounded-full bg-blue-500/40 backdrop-blur-sm border border-blue-300 text-white font-bold flex items-center justify-center hover:bg-blue-400 focus:outline-none shadow-inner cursor-pointer"; const s = Math.floor(Math.random() * 30) + 40; b.style.width = s + 'px'; b.style.height = s + 'px'; b.style.fontSize = (s * 0.4) + 'px'; b.style.left = Math.floor(Math.random() * (c.clientWidth - s)) + 'px'; b.style.bottom = '-50px'; const d = Math.random() * 3 + 3; b.style.animation = `floatUp ${d}s linear forwards`; b.onclick = () => { setVolume(v); b.remove(); }; c.appendChild(b); setTimeout(() => b.parentNode === c && b.remove(), d * 1000); }, 600); } },
            { id: 'level-7', init: () => { const t = document.getElementById('l7-textarea'); const wc = document.getElementById('l7-word-count'); const dict = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,"one hundred":100}; t.addEventListener('input', (e) => { const text = e.target.value; const words = text.trim().length > 0 ? text.trim().split(/\s+/) : []; wc.innerText = `${words.length} / 25+`; if (words.length >= 25) { wc.classList.add('text-green-500'); wc.classList.remove('text-gray-600', 'text-red-500'); const m = text.toLowerCase().match(/\b(\d+|one hundred|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]*(one|two|three|four|five|six|seven|eight|nine))?\b/); let v = 75; if(m) { v = /\d+/.test(m[0]) ? parseInt(m[0]) : (dict[m[1]] || 0) + (dict[m[2]] || 0); } setVolume(v); } else { wc.classList.add('text-gray-600'); wc.classList.remove('text-green-500', 'text-red-500'); setVolume(75); } }); }, updateUI: (v) => { document.getElementById('l7-display').innerText = v + '%'; }, reset: () => { document.getElementById('l7-textarea').value = ''; document.getElementById('l7-word-count').innerText = '0 / 25+'; document.getElementById('l7-word-count').className = 'text-xs font-mono text-gray-600 transition-colors duration-200'; } },
            { id: 'level-8', cool: false, init: function() { const u = document.getElementById('l8-up'); const d = document.getElementById('l8-down'); const b = document.getElementById('l8-cooldown-bar'); const click = (c) => { if (this.cool) return; setVolume(currentVolume + c); let time = 1000 - (16 * Math.min(Math.abs(currentVolume - 25), 50)); this.cool = true; u.classList.add('opacity-40', 'cursor-not-allowed', 'bg-red-900', 'hover:bg-red-900'); d.classList.add('opacity-40', 'cursor-not-allowed', 'bg-red-900', 'hover:bg-red-900'); u.classList.remove('bg-gray-800', 'hover:bg-gray-700'); d.classList.remove('bg-gray-800', 'hover:bg-gray-700'); b.style.transition = 'none'; b.style.width = '0%'; void b.offsetWidth; b.style.transition = `width ${time}ms linear`; b.style.width = '100%'; setTimeout(() => { this.cool = false; u.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-red-900', 'hover:bg-red-900'); d.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-red-900', 'hover:bg-red-900'); u.classList.add('bg-gray-800', 'hover:bg-gray-700'); d.classList.add('bg-gray-800', 'hover:bg-gray-700'); }, time); }; u.onclick = () => click(1); d.onclick = () => click(-1); }, updateUI: (v) => { document.getElementById('l8-display').innerText = v + '%'; }, reset: function() { this.cool = false; document.getElementById('l8-cooldown-bar').style.width = '100%'; } },
            { id: 'level-9', lastV: 75, locked: false, ver: false, init: function() { const s = document.getElementById('l9-slider'); const m = document.getElementById('l9-captcha-modal'); const c = document.getElementById('l9-checkbox'); s.addEventListener('input', (e) => { if (this.locked) return e.target.value = currentVolume; let v = parseInt(e.target.value); if (Math.abs(v - this.lastV) >= 10) { setVolume(this.lastV + (v < this.lastV ? -10 : 10)); this.locked = true; m.classList.remove('hidden'); } else setVolume(v); }); c.addEventListener('click', () => { if (this.ver) return; this.ver = true; document.getElementById('l9-spinner-icon').classList.remove('hidden'); setTimeout(() => { document.getElementById('l9-spinner-icon').classList.add('hidden'); document.getElementById('l9-check-icon').classList.remove('hidden'); setTimeout(() => { m.classList.add('hidden'); this.lastV = currentVolume; this.locked = this.ver = false; document.getElementById('l9-check-icon').classList.add('hidden'); }, 500); }, 2000); }); }, updateUI: (v) => { document.getElementById('l9-slider').value = v; document.getElementById('l9-display').innerText = v + '%'; }, reset: function() { this.lastV = 75; this.locked = false; this.ver = false; document.getElementById('l9-captcha-modal').classList.add('hidden'); document.getElementById('l9-check-icon').classList.add('hidden'); document.getElementById('l9-spinner-icon').classList.add('hidden'); } },
            { id: 'level-10', init: function() { document.getElementById('l10-btn').addEventListener('click', () => setVolume(Math.random() < 0.05 ? 25 : Math.floor(Math.random() * 101))); }, updateUI: (v) => { document.getElementById('l10-display').innerText = v + '%'; }, reset: () => {} },
            { id: 'level-11', t: [ { q: "End of a shoelace?", o: ["Aglet", "Grommet", "Lacet", "Tip"], a: 0 }, { q: "Hearts in octopus?", o: ["1", "2", "3", "4"], a: 2 }, { q: "Scottish national animal?", o: ["Nessie", "Unicorn", "Eagle", "Deer"], a: 1 }, { q: "Year Titanic sank?", o: ["1905", "1912", "1920", "1923"], a: 1 }, { q: "Capital of Australia?", o: ["Sydney", "Melbourne", "Canberra", "Perth"], a: 2 }, { q: "Hardest natural substance?", o: ["Gold", "Iron", "Diamond", "Quartz"], a: 2 }, { q: "Rarest ABO/Rh blood type?", o: ["O-", "B+", "AB-", "A-"], a: 2 }, { q: "Planet with most confirmed moons?", o: ["Jupiter", "Saturn", "Uranus", "Neptune"], a: 1 }, { q: "Bones in adult human?", o: ["198", "206", "214", "220"], a: 1 }, { q: "Loudest animal?", o: ["Lion", "Elephant", "Sperm Whale", "Howler"], a: 2 } ], init: function() {}, load: function() { if (currentVolume === 25) { document.getElementById('l11-question').innerText = "Stand by, adjusting volume..."; document.getElementById('l11-options').innerHTML = ''; return; } const q = this.t[Math.floor(Math.random() * this.t.length)]; document.getElementById('l11-question').innerText = q.q; const opts = document.getElementById('l11-options'); opts.innerHTML = ''; q.o.forEach((txt, i) => { const b = document.createElement('button'); b.className = "bg-gray-800 hover:bg-gray-700 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-colors"; b.innerText = txt; b.onclick = () => { setVolume(currentVolume + (i === q.a ? -5 : 5)); this.load(); }; opts.appendChild(b); }); }, updateUI: (v) => { document.getElementById('l11-display').innerText = v + '%'; if (v !== 25 && document.getElementById('l11-options').innerHTML === '') setTimeout(() => levels[10].load(), 50); }, reset: function() { this.load(); } },
            { id: 'level-12', init: function() { document.getElementById('l12-btn').addEventListener('click', () => { const r = Math.floor(Math.random() * 20) + 1; document.getElementById('l12-last-roll').innerText = `Rolled: ${r}`; setVolume(currentVolume > 25 ? currentVolume - r : currentVolume + r); }); }, updateUI: (v) => { document.getElementById('l12-display').innerText = v + '%'; }, reset: () => { document.getElementById('l12-last-roll').innerText = 'Ready'; } },
            { id: 'level-13', init: function() { document.getElementById('l13-slider').addEventListener('input', (e) => setVolume(parseInt(e.target.value))); document.getElementById('l13-age-input').addEventListener('input', (e) => { const v = e.target.value; const ok = /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}$/.test(v); e.target.classList.toggle('border-red-500', !ok); e.target.classList.toggle('border-green-500', ok); }); }, updateUI: function(v) { document.getElementById('l13-slider').value = v; document.getElementById('l13-display').innerText = v + '%'; const c = document.getElementById('l13-verify-container'); if (v === 25) { c.classList.remove('hidden'); c.classList.add('flex'); document.getElementById('l13-age-input').focus(); } else { c.classList.add('hidden'); c.classList.remove('flex'); document.getElementById('l13-age-input').value = ''; } }, canProgress: function() { return /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}$/.test(document.getElementById('l13-age-input').value); }, onProgressFail: function() { setVolume(75); }, reset: function() { document.getElementById('l13-age-input').value = ''; } },
            { id: 'level-14', init: () => { document.getElementById('l14-slider').addEventListener('input', (e) => setVolume(parseInt(e.target.value))); }, updateUI: (v) => { document.getElementById('l14-display').innerText = v + '%'; document.getElementById('level-container').style.filter = `brightness(${Math.max(0, Math.min(100, (Math.abs(v - 25) / 50) * 100))}%)`; }, reset: () => { document.getElementById('l14-slider').value = 75; } },
            { id: 'level-15', frame: null, angle: 0, sweep: true, init: function() { const b = document.getElementById('l15-btn'); const lock = () => { this.sweep = false; setVolume(Math.round(((Math.sin(this.angle) + 1) / 2) * 100)); b.classList.add('bg-yellow-700', 'scale-95'); b.classList.remove('bg-yellow-600'); }; const rel = () => { if (!this.sweep) { this.sweep = true; setVolume(75); this.loop(); b.classList.remove('bg-yellow-700', 'scale-95'); b.classList.add('bg-yellow-600'); } }; b.addEventListener('mousedown', lock); document.addEventListener('mouseup', rel); b.addEventListener('touchstart', (e) => { e.preventDefault(); lock(); }, {passive: false}); document.addEventListener('touchend', rel); }, loop: function() { if (!this.sweep) return; this.angle += 0.04; let v = ((Math.sin(this.angle) + 1) / 2) * 100; document.getElementById('l15-needle').style.left = v + '%'; document.getElementById('l15-display').innerText = Math.round(v) + '%'; this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: (v) => { if (!levels[14].sweep) { document.getElementById('l15-display').innerText = v + '%'; document.getElementById('l15-needle').style.left = v + '%'; } }, reset: function() { this.sweep = true; this.angle = Math.asin((75 / 100) * 2 - 1); if (this.frame) cancelAnimationFrame(this.frame); this.loop(); document.getElementById('l15-btn').classList.remove('bg-yellow-700', 'scale-95'); document.getElementById('l15-btn').classList.add('bg-yellow-600'); } },
            { id: 'level-16', fIdx: 0, signed: false, draw: false, read: false, ctx: null, docs: [ { t: "End User License Agreement", d: "By providing your signature below, you irrevocably agree that Hostile Volume is not responsible for any ensuing psychological damage or destruction of peripheral devices.\n\nYou willingly waive your right to an intuitive user experience. Furthermore, you agree to the terms of service which explicitly state that the volume slider may actively conspire against you. You must read this entire document. Scrolling is mandatory to prove your compliance. Do not stop until you reach the very bottom." }, { t: "Waiver of Liability", d: "You hereby release Hostile Volume, its creators, and affiliates from any claims of emotional distress, carpal tunnel syndrome, or generalized frustration.\n\nBy scrolling to the bottom and signing, you accept that any agonizing difficulty experienced is a designated feature, not a bug. Your continued participation indicates full consent to whatever nonsense we deploy next. Keep scrolling to acknowledge." }, { t: "Arbitration Agreement", d: "Any disputes arising from this volume slider will be settled by binding arbitration in a court of our choosing, likely located on a remote island.\n\nYou waive the right to a class-action lawsuit. You also agree that any attempt to inspect the source code to cheat the mechanics will result in immediate voiding of this contract. Scroll down to accept." }, { t: "Soul Transfer Authorization", d: "Upon achieving exactly 25% volume, you grant us a non-exclusive, perpetual, and irrevocable license to your immortal soul.\n\nThis license is entirely sub-licensable and transferable. We reserve the right to use it for powering server farms, training artificial intelligence models, or simply keeping it in a digital jar. Acknowledge by reaching the end of this text." }, { t: "Final Confirmation", d: "This serves as the final, irrevocable confirmation that you are doing this entirely to yourself.\n\nNo one forced you to adjust the volume. You could have just muted your device. But you chose this path of resistance. Scroll to the absolute bottom to accept your inevitable fate, sign your name, and unlock the slider." } ], init: function() { const c = document.getElementById('l16-signature-pad'); const tb = document.getElementById('l16-form-text'); const sBtn = document.getElementById('l16-submit-btn'); this.ctx = c.getContext('2d'); this.ctx.lineWidth = 3; this.ctx.strokeStyle = '#1e3a8a'; tb.addEventListener('scroll', () => { if (tb.scrollHeight - tb.scrollTop <= tb.clientHeight + 5) this.read = true; }); const pos = (e) => { const r = c.getBoundingClientRect(); const x = e.touches ? e.touches[0].clientX : e.clientX; const y = e.touches ? e.touches[0].clientY : e.clientY; return { x: (x - r.left) * (c.width / r.width), y: (y - r.top) * (c.height / r.height) }; }; const start = (e) => { e.preventDefault(); this.draw = this.signed = true; const p = pos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); }; const move = (e) => { if(!this.draw) return; e.preventDefault(); const p = pos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke(); }; const stop = () => this.draw = false; c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); c.addEventListener('mouseup', stop); c.addEventListener('mouseout', stop); c.addEventListener('touchstart', start, {passive: false}); c.addEventListener('touchmove', move, {passive: false}); c.addEventListener('touchend', stop); document.getElementById('l16-clear-btn').onclick = () => { this.ctx.clearRect(0,0,c.width,c.height); this.signed = false; }; sBtn.onclick = () => { if (!this.read) { sBtn.innerText = "SCROLL TO READ"; sBtn.classList.replace('bg-blue-700', 'bg-red-600'); tb.classList.add('border-red-500'); setTimeout(() => { sBtn.innerText = "Sign & Proceed"; sBtn.classList.replace('bg-red-600', 'bg-blue-700'); tb.classList.remove('border-red-500'); }, 1000); return; } if (!this.signed) { sBtn.innerText = "PLEASE SIGN"; sBtn.classList.replace('bg-blue-700', 'bg-red-600'); const wrap = document.getElementById('l16-canvas-wrapper'); wrap.classList.add('translate-x-2'); setTimeout(() => wrap.classList.replace('translate-x-2', '-translate-x-2'), 100); setTimeout(() => { wrap.classList.remove('-translate-x-2'); sBtn.innerText = "Sign & Proceed"; sBtn.classList.replace('bg-red-600', 'bg-blue-700'); }, 300); return; } this.fIdx++; if (this.fIdx < 5) { this.loadForm(); } else { document.getElementById('l16-form-container').classList.add('hidden'); document.getElementById('l16-form-container').classList.remove('flex'); document.getElementById('l16-reward-container').classList.remove('hidden'); document.getElementById('l16-reward-container').classList.add('flex'); this.updateUI(currentVolume); } }; document.getElementById('l16-reward-slider').addEventListener('input', (e) => setVolume(parseInt(e.target.value))); }, loadForm: function() { const c = document.getElementById('l16-signature-pad'); const tb = document.getElementById('l16-form-text'); this.signed = false; this.read = false; this.ctx.clearRect(0,0,c.width,c.height); document.getElementById('l16-form-title').innerText = `${this.docs[this.fIdx].t} (${this.fIdx+1}/5)`; tb.innerText = this.docs[this.fIdx].d; tb.scrollTop = 0; setTimeout(() => { if(tb.scrollHeight <= tb.clientHeight) this.read = true; }, 100); }, updateUI: function(v) { if (this.fIdx >= 5) { document.getElementById('l16-reward-slider').value = v; document.getElementById('l16-display').innerText = v + '%'; } }, reset: function() { this.fIdx = 0; setTimeout(() => { const c = document.getElementById('l16-signature-pad'); const r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height; this.loadForm(); }, 350); document.getElementById('l16-form-container').classList.remove('hidden'); document.getElementById('l16-form-container').classList.add('flex'); document.getElementById('l16-reward-container').classList.add('hidden'); document.getElementById('l16-reward-container').classList.remove('flex'); document.getElementById('l16-reward-slider').value = 75; } },
            { id: 'level-17', init: () => { document.getElementById('l17-slider').addEventListener('input', (e) => setVolume(100 - parseInt(e.target.value))); }, updateUI: (v) => { document.getElementById('l17-slider').value = 100 - v; document.getElementById('l17-display').innerHTML = `75% <span class="text-[8px] sm:text-[10px] text-red-500 absolute -right-12 sm:-right-16 font-sans font-bold animate-pulse tracking-widest bg-red-900/30 px-1 rounded">ERR_UI</span>`; }, reset: () => { document.getElementById('l17-slider').value = 25; } },
            { id: 'level-18', qInt: null, tTime: null, init: function() { const cb = document.getElementById('l18-chat-box'); const add = (s, m, c) => { cb.innerHTML += `<div><span class="text-${c}-400 font-bold">${s}:</span> ${m}</div>`; cb.scrollTop = cb.scrollHeight; }; document.getElementById('l18-send').onclick = () => { const i = document.getElementById('l18-input'); const val = i.value; if(!val) return; add('You', val, 'gray'); i.value = ''; if(!val.includes('25')) { setTimeout(() => add('System', 'Unclear request. Specify volume.', 'red'), 500); return; } setTimeout(() => add('System', 'Connecting to agent...', 'blue'), 500); setTimeout(() => { let p = 3; add('Agent', `Hello. You are number ${p} in queue.`, 'yellow'); this.qInt = setInterval(() => { p--; if(p>0) add('System', `Queue update: ${p}`, 'blue'); else { clearInterval(this.qInt); add('Agent', 'Confirm volume override NOW.', 'yellow'); document.getElementById('l18-confirm').classList.remove('hidden'); this.tTime = setTimeout(() => { document.getElementById('l18-confirm').classList.add('hidden'); add('System', 'Session timeout. Try again.', 'red'); setVolume(75); }, 800); } }, 2500); }, 1500); }; document.getElementById('l18-confirm').onclick = () => { document.getElementById('l18-confirm').classList.add('hidden'); clearTimeout(this.tTime); add('System', 'Override locked at 25%.', 'green'); setVolume(25); }; }, updateUI: (v) => { document.getElementById('l18-display').innerText = v + '%'; }, reset: function() { if(this.qInt) clearInterval(this.qInt); if(this.tTime) clearTimeout(this.tTime); document.getElementById('l18-chat-box').innerHTML = `<div><span class="text-blue-400 font-bold">System:</span> Manual overrides restricted. Speak to an agent.</div>`; document.getElementById('l18-confirm').classList.add('hidden'); } },
            { id: 'level-19', p: null, done: false, adTimer: null, init: function() {}, updateUI: function(v) { document.getElementById('l19-display').innerText = v + '%'; }, reset: function() { this.done = false; if (this.adTimer) clearTimeout(this.adTimer); this.adTimer = null; const st = document.getElementById('l19-status-text'), cc = document.getElementById('l19-click-catcher'); st.innerText = "Click video to play. Mandatory 30s watch time."; st.classList.remove('text-yellow-500', 'text-green-500'); cc.classList.add('hidden'); if (this.p && typeof this.p.seekTo === 'function') { this.p.seekTo(0); this.p.pauseVideo(); return; } const loadYT = () => { this.p = new YT.Player('l19-player', { height: '100%', width: '100%', videoId: 'dQw4w9WgXcQ', playerVars: { 'controls': 0, 'disablekb': 1, 'rel': 0, 'modestbranding': 1, 'fs': 0, 'playsinline': 1 }, events: { 'onStateChange': (e) => { if (e.data === 1 && !this.done) { st.innerText = "Ad playing. Controls disabled. Please wait 30s."; st.classList.add('text-yellow-500'); audio.pause(); cc.classList.remove('hidden'); if (!this.adTimer) this.adTimer = setTimeout(() => { if (!this.done) { this.done = true; this.p.pauseVideo(); st.innerText = "Ad complete. Thank you for your patience."; st.classList.replace('text-yellow-500', 'text-green-500'); audio.play(); setVolume(25); } }, 30000); } if (e.data === 0 && !this.done) { this.done = true; clearTimeout(this.adTimer); st.innerText = "Ad complete. Thank you for your patience."; st.classList.replace('text-yellow-500', 'text-green-500'); audio.play(); setVolume(25); } } } }); }; if (typeof YT !== 'undefined' && YT.Player) loadYT(); else window.onYouTubeIframeAPIReady = loadYT; } },
            { id: 'level-20', vols: { A:75, B:75, C:75, D:75, E:75 }, eInt: null, cDist: 0, init: function() { const calc = () => setVolume(Math.round((this.vols.A + this.vols.B + this.vols.C + this.vols.D + this.vols.E) / 5)); document.getElementById('l20-A').addEventListener('input', (e) => { this.vols.A = 100 - parseInt(e.target.value); calc(); }); let lB = 75; document.getElementById('l20-B').addEventListener('input', (e) => { let v = parseInt(e.target.value); if(Math.abs(v - lB) > 10) { e.target.value = 75; v = 75; } this.vols.B = lB = v; calc(); }); const cU = document.getElementById('l20-C-up'); const cD = document.getElementById('l20-C-down'); const mC = (ch) => { this.vols.C = Math.max(0, Math.min(100, this.vols.C + ch)); document.getElementById('l20-C-val').innerText = this.vols.C; this.cDist += 2; cU.style.transform = `translateX(${this.cDist}px)`; cD.style.transform = `translateX(-${this.cDist}px)`; calc(); }; cU.onclick = () => mC(1); cD.onclick = () => mC(-1); document.getElementById('l20-D').addEventListener('input', (e) => { this.vols.D = parseInt(e.target.value); document.getElementById('level-20').style.filter = `brightness(${Math.max(15, this.vols.D)}%)`; calc(); }); }, updateUI: function(v) { document.getElementById('l20-display').innerText = v + '%'; }, reset: function() { this.vols = { A:75, B:75, C:75, D:75, E:75 }; this.cDist = 0; document.getElementById('l20-A').value = 25; document.getElementById('l20-B').value = 75; document.getElementById('l20-C-val').innerText = 75; document.getElementById('l20-C-up').style.transform = `translateX(0px)`; document.getElementById('l20-C-down').style.transform = `translateX(0px)`; document.getElementById('l20-D').value = 75; document.getElementById('level-20').style.filter = `brightness(100%)`; document.getElementById('l20-E').value = 75; if(this.eInt) clearInterval(this.eInt); this.eInt = setInterval(() => { if (levels[currentLevelIndex].id !== 'level-20') return clearInterval(this.eInt); this.vols.E = Math.floor(Math.random() * 101); document.getElementById('l20-E').value = this.vols.E; const eS = document.getElementById('l20-E'); eS.classList.add('shadow-[0_0_15px_rgba(168,85,247,1)]'); setTimeout(() => eS.classList.remove('shadow-[0_0_15px_rgba(168,85,247,1)]'), 500); setVolume(Math.round((this.vols.A + this.vols.B + this.vols.C + this.vols.D + this.vols.E) / 5)); }, 4500); } },
            { id: 'level-21', ctx: null, w: 300, h: 300, gs: 15, tc: 20, snake: [], dx: 1, dy: 0, apples: [], frame: null, lastTime: 0, init: function() { const cvs = document.getElementById('l21-canvas'); this.ctx = cvs.getContext('2d'); const kbd = (e) => { const k = e.key.toLowerCase(); if((k==='w'||k==='arrowup')&&this.dy!==1){this.dx=0;this.dy=-1;} if((k==='s'||k==='arrowdown')&&this.dy!==-1){this.dx=0;this.dy=1;} if((k==='a'||k==='arrowleft')&&this.dx!==1){this.dx=-1;this.dy=0;} if((k==='d'||k==='arrowright')&&this.dx!==-1){this.dx=1;this.dy=0;} }; document.addEventListener('keydown', kbd); let sx, sy; cvs.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: false}); cvs.addEventListener('touchmove', e => { e.preventDefault(); if(!sx||!sy) return; let cx=e.touches[0].clientX, cy=e.touches[0].clientY, dx=sx-cx, dy=sy-cy; if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&this.dx!==1){this.dx=-1;this.dy=0;}else if(dx<0&&this.dx!==-1){this.dx=1;this.dy=0;}}else{if(dy>0&&this.dy!==1){this.dx=0;this.dy=-1;}else if(dy<0&&this.dy!==-1){this.dx=0;this.dy=1;}} sx=null; sy=null; }, {passive: false}); }, spawn: function(count=1) { for(let i=0; i<count; i++) { let v = Math.random() < 0.1 ? 25 : Math.floor(Math.random()*101); this.apples.push({x: Math.floor(Math.random()*this.tc), y: Math.floor(Math.random()*this.tc), v: v, c: v===25?'#22c55e':'#ef4444'}); } }, loop: function(t) { if(levels[currentLevelIndex].id !== 'level-21') return; this.frame = requestAnimationFrame((ts) => this.loop(ts)); if(t - this.lastTime < 130) return; this.lastTime = t; let h = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy}; if(h.x<0||h.x>=this.tc||h.y<0||h.y>=this.tc){setVolume(75); this.reset(); return;} for(let s of this.snake) if(h.x===s.x && h.y===s.y){setVolume(75); this.reset(); return;} this.snake.unshift(h); let eatenIdx = -1; for(let i=0; i<this.apples.length; i++) { if(h.x===this.apples[i].x && h.y===this.apples[i].y) { eatenIdx = i; break; } } if(eatenIdx !== -1) { setVolume(this.apples[eatenIdx].v); this.apples.splice(eatenIdx, 1); setTimeout(() => this.spawn(1), 1000); } else { this.snake.pop(); } this.ctx.fillStyle = '#030712'; this.ctx.fillRect(0,0,this.w,this.h); for(let a of this.apples) { this.ctx.fillStyle = a.c; this.ctx.fillRect(a.x*this.gs, a.y*this.gs, this.gs-1, this.gs-1); this.ctx.fillStyle = 'white'; this.ctx.font = 'bold 9px monospace'; this.ctx.textAlign='center'; this.ctx.fillText(a.v, a.x*this.gs+7, a.y*this.gs+11); } this.ctx.fillStyle = '#3b82f6'; for(let s of this.snake) this.ctx.fillRect(s.x*this.gs, s.y*this.gs, this.gs-1, this.gs-1); }, updateUI: function(v) { document.getElementById('l21-display').innerText = v + '%'; }, reset: function() { this.snake = [{x: 10, y: 10}, {x:9, y:10}]; this.dx = 1; this.dy = 0; this.apples = []; this.spawn(15); if(this.frame) cancelAnimationFrame(this.frame); this.lastTime = performance.now(); this.loop(this.lastTime); } },
            { id: 'level-22', rot: 0, vel: 0, drag: false, spinLock: false, lastA: 0, nums: [], frame: null, init: function() { const cvs = document.getElementById('l22-canvas'), ctx = cvs.getContext('2d'), btn = document.getElementById('l22-spin-btn'), cx = 200, cy = 200, r = 200; this.nums = Array.from({length: 101}, (_, i) => i); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px sans-serif'; for(let i=0; i<101; i++) { const a = (i * 2 * Math.PI) / 101, aNext = ((i+1) * 2 * Math.PI) / 101; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, aNext); ctx.fillStyle = i % 2 === 0 ? '#1f2937' : '#374151'; if(this.nums[i] === 25) ctx.fillStyle = '#7f1d1d'; ctx.fill(); ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI/101); ctx.fillStyle = '#d1d5db'; ctx.fillText(this.nums[i], r - 15, 0); ctx.restore(); } const getA = (e) => { const rect = cvs.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - (rect.left + rect.width/2), y = (e.touches ? e.touches[0].clientY : e.clientY) - (rect.top + rect.height/2); return Math.atan2(y, x); }; const start = (e) => { if(this.spinLock) return; e.preventDefault(); this.drag = true; this.lastA = getA(e); this.vel = 0; cvs.classList.replace('cursor-grab', 'cursor-grabbing'); }; const move = (e) => { if(!this.drag) return; const a = getA(e); let da = a - this.lastA; if(da > Math.PI) da -= 2*Math.PI; if(da < -Math.PI) da += 2*Math.PI; this.rot += da * (180/Math.PI); this.vel = da * (180/Math.PI); this.lastA = a; }; const end = () => { if(this.drag) { this.drag = false; cvs.classList.replace('cursor-grabbing', 'cursor-grab'); } }; cvs.addEventListener('mousedown', start); document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); cvs.addEventListener('touchstart', start, {passive: false}); document.addEventListener('touchmove', move, {passive: false}); document.addEventListener('touchend', end); btn.onclick = () => { if(this.spinLock) return; this.spinLock = true; this.vel = 50 + Math.random() * 50; btn.classList.add('opacity-50', 'cursor-not-allowed'); }; }, loop: function() { if(!this.drag) { this.rot += this.vel; this.vel *= 0.985; if(Math.abs(this.vel) < 0.05) { this.vel = 0; if(this.spinLock) { this.spinLock = false; document.getElementById('l22-spin-btn').classList.remove('opacity-50', 'cursor-not-allowed'); } } } let normRot = ((this.rot % 360) + 360) % 360; document.getElementById('l22-canvas').style.transform = `rotate(${this.rot}deg)`; let targetAngle = ((270 - normRot) % 360 + 360) % 360, sliceIdx = Math.floor(targetAngle / (360 / 101)), val = this.nums[sliceIdx]; if (val !== undefined && val !== window.currentVolume) setVolume(val); if (levels[currentLevelIndex].id === 'level-22') this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { document.getElementById('l22-display').innerText = v + '%'; }, reset: function() { this.rot = 270 - (75 * (360/101) + (180/101)); this.vel = 0; this.drag = this.spinLock = false; document.getElementById('l22-spin-btn').classList.remove('opacity-50', 'cursor-not-allowed'); if (this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-23', frame: null, ctx: null, w: 400, h: 400, balloons: [], arrows: [], bow: { x: 200, y: 380, angle: -Math.PI/2, charge: 0, charging: false }, mx: 200, my: 200, spawnT: 0, init: function() { const cvs = document.getElementById('l23-canvas'); cvs.width = this.w; cvs.height = this.h; this.ctx = cvs.getContext('2d'); const getPos = (e) => { const r = cvs.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cx - r.left) * (this.w / r.width), y: (cy - r.top) * (this.h / r.height) }; }; const start = (e) => { e.preventDefault(); this.bow.charging = true; this.bow.charge = 0; const p = getPos(e); this.mx = p.x; this.my = p.y; }; const move = (e) => { if(this.bow.charging) e.preventDefault(); const p = getPos(e); this.mx = p.x; this.my = p.y; }; const end = (e) => { if(!this.bow.charging) return; this.bow.charging = false; let speed = 10 + (this.bow.charge / 100) * 15; this.arrows.push({ x: this.bow.x, y: this.bow.y, vx: Math.cos(this.bow.angle) * speed, vy: Math.sin(this.bow.angle) * speed }); this.bow.charge = 0; }; cvs.addEventListener('mousedown', start); document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); cvs.addEventListener('touchstart', start, {passive: false}); document.addEventListener('touchmove', move, {passive: false}); document.addEventListener('touchend', end); }, loop: function() { if(levels[currentLevelIndex].id !== 'level-23') return; const c = this.ctx; c.clearRect(0, 0, this.w, this.h); this.spawnT++; if(this.spawnT > 30) { this.spawnT = 0; let val = Math.random() < 0.08 ? 25 : Math.floor(Math.random() * 101); this.balloons.push({ x: 40 + Math.random() * 320, y: this.h + 30, r: 20 + Math.random() * 10, v: val, sy: 1 + Math.random() * 2, col: `hsl(${Math.random()*360}, 70%, 50%)` }); } this.bow.angle = Math.atan2(this.my - this.bow.y, this.mx - this.bow.x); if(this.bow.charging && this.bow.charge < 100) this.bow.charge += 2; for(let i = this.balloons.length - 1; i >= 0; i--) { let b = this.balloons[i]; b.y -= b.sy; if(b.y < -50) { this.balloons.splice(i, 1); continue; } c.beginPath(); c.fillStyle = b.col; c.arc(b.x, b.y, b.r, 0, Math.PI*2); c.fill(); c.beginPath(); c.moveTo(b.x, b.y+b.r); c.lineTo(b.x, b.y+b.r+15); c.strokeStyle='white'; c.stroke(); c.fillStyle = 'white'; c.font = 'bold 14px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.v, b.x, b.y); } for(let i = this.arrows.length - 1; i >= 0; i--) { let a = this.arrows[i]; a.x += a.vx; a.y += a.vy; a.vy += 0.2; let angle = Math.atan2(a.vy, a.vx); c.save(); c.translate(a.x, a.y); c.rotate(angle); c.beginPath(); c.moveTo(-15, 0); c.lineTo(10, 0); c.strokeStyle='brown'; c.lineWidth=2; c.stroke(); c.beginPath(); c.moveTo(10, 0); c.lineTo(5, -4); c.lineTo(5, 4); c.fillStyle='gray'; c.fill(); c.restore(); let hit = false; for(let j = this.balloons.length - 1; j >= 0; j--) { let b = this.balloons[j]; let dx = a.x - b.x, dy = a.y - b.y; if(dx*dx + dy*dy < b.r*b.r) { setVolume(b.v); this.balloons.splice(j, 1); hit = true; break; } } if(hit || a.y > this.h || a.x < 0 || a.x > this.w) this.arrows.splice(i, 1); } c.save(); c.translate(this.bow.x, this.bow.y); c.rotate(this.bow.angle); c.beginPath(); c.arc(0, 0, 20, -Math.PI/2, Math.PI/2); c.strokeStyle='gold'; c.lineWidth=3; c.stroke(); c.beginPath(); c.moveTo(0, -20); c.lineTo(-this.bow.charge/5, 0); c.lineTo(0, 20); c.strokeStyle='white'; c.lineWidth=1; c.stroke(); c.restore(); this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { document.getElementById('l23-display').innerText = v + '%'; }, reset: function() { this.balloons = []; this.arrows = []; this.bow.charging = false; this.bow.charge = 0; if(this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-24', jumps: 0, p: ["", "Missed!", "Too slow!", "Nope.", "Haha loser!", "Swoosh!", "Nice try", "Can't touch this", "Getting tired...", "Whew...", "Hold on...", "Pause the Movie!", "Huff...", "Puff...", "Fine whatever just click me."], init: function() { const a = document.getElementById('l24-arena'), t = document.getElementById('l24-target'), tr = document.getElementById('l24-trap'); const evade = (e) => { if(this.jumps < 14) { if(e) e.preventDefault(); this.jumps++; const ar = a.getBoundingClientRect(), trct = t.getBoundingClientRect(); t.style.left = Math.random() * (ar.width - trct.width) + 'px'; t.style.top = Math.random() * (ar.height - trct.height) + 'px'; t.style.transform = 'none'; t.innerText = this.p[this.jumps]; setVolume(Math.floor(Math.random() * 21) + 80); } }; t.addEventListener('mouseenter', evade); t.addEventListener('touchstart', evade, {passive: false}); t.addEventListener('click', (e) => { e.stopPropagation(); if(this.jumps >= 14) { setVolume(25); t.innerText = "I yield."; t.classList.replace('bg-green-600', 'bg-gray-600'); t.classList.replace('hover:bg-green-500', 'hover:bg-gray-500'); } }); tr.addEventListener('click', () => setVolume(100)); }, updateUI: function(v) { document.getElementById('l24-display').innerText = v + '%'; }, reset: function() { this.jumps = 0; const t = document.getElementById('l24-target'); t.style.left = '50%'; t.style.top = '50%'; t.style.transform = 'translate(-50%, -50%)'; t.innerText = "25%"; t.classList.replace('bg-gray-600', 'bg-green-600'); t.classList.replace('hover:bg-gray-500', 'hover:bg-green-500'); } },
            { id: 'level-25', submitted: false, init: function() { document.getElementById('l25-submit').onclick = () => { if(this.submitted) return; const btn = document.getElementById('l25-submit'); btn.innerText = "Sending Data..."; const data = { Hotdog: document.getElementById('l25-q1').value, Enjoyment: document.getElementById('l25-q2').value, UIDesign: document.getElementById('l25-q3').value, BackgroundMusic: document.getElementById('l25-q4').value, LevelDesign: document.getElementById('l25-q5').value }; fetch('https://formspree.io/f/mvzwzenq', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) }).then(() => { this.submitted = true; document.getElementById('l25-form-container').classList.add('hidden'); document.getElementById('l25-form-container').classList.remove('flex'); document.getElementById('l25-reward').classList.remove('hidden'); document.getElementById('l25-reward').classList.add('flex'); setVolume(75); }).catch(e => { btn.innerText = "Network Error. Try Again."; }); }; document.getElementById('l25-slider').addEventListener('input', (e) => setVolume(parseInt(e.target.value))); }, updateUI: function(v) { document.getElementById('l25-display').innerText = v + '%'; if(this.submitted) document.getElementById('l25-slider').value = v; }, reset: function() { this.submitted = false; document.getElementById('l25-form-container').classList.remove('hidden'); document.getElementById('l25-form-container').classList.add('flex'); document.getElementById('l25-reward').classList.add('hidden'); document.getElementById('l25-reward').classList.remove('flex'); document.getElementById('l25-submit').innerText = "Submit to Proceed"; document.getElementById('l25-slider').value = 75; document.getElementById('l25-q1').selectedIndex = 0; document.getElementById('l25-q2').selectedIndex = 0; document.getElementById('l25-q3').selectedIndex = 0; document.getElementById('l25-q4').selectedIndex = 0; document.getElementById('l25-q5').selectedIndex = 0; } },
            { id: 'level-26', frame: null, ctx: null, w: 400, h: 400, ball: null, drag: false, sx: 0, sy: 0, cx: 0, cy: 0, particles: [], t: 0, init: function() { const cvs = document.getElementById('l26-canvas'); cvs.width = this.w; cvs.height = this.h; this.ctx = cvs.getContext('2d'); const getPos = (e) => { const r = cvs.getBoundingClientRect(); const x = e.touches ? e.touches[0].clientX : e.clientX; const y = e.touches ? e.touches[0].clientY : e.clientY; return { x: (x - r.left) * (this.w / r.width), y: (y - r.top) * (this.h / r.height) }; }; const start = (e) => { e.preventDefault(); this.drag = true; const p = getPos(e); this.sx = p.x; this.sy = p.y; this.cx = p.x; this.cy = p.y; }; const move = (e) => { if(this.drag) { e.preventDefault(); const p = getPos(e); this.cx = p.x; this.cy = p.y; } }; const end = (e) => { if(!this.drag) return; this.drag = false; if(!this.ball) { let dx = this.sx - this.cx; let dy = this.sy - this.cy; let dist = Math.sqrt(dx*dx + dy*dy); if(dist > 5) { this.ball = { x: 200, y: 380, vx: dx * 0.15, vy: dy * 0.15 }; } } }; cvs.addEventListener('mousedown', start); document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); cvs.addEventListener('touchstart', start, {passive: false}); document.addEventListener('touchmove', move, {passive: false}); document.addEventListener('touchend', end); }, loop: function() { if(levels[currentLevelIndex].id !== 'level-26') return; const c = this.ctx; this.t += 0.02; c.clearRect(0, 0, this.w, this.h); let lineW = 260; let lineX = 70 + Math.sin(this.t) * 60; c.fillStyle = '#1f2937'; c.fillRect(lineX, 20, lineW, 20); c.fillStyle = '#22c55e'; c.fillRect(lineX + (lineW * 0.25) - 2, 20, 4, 20); for(let i=0; i<=10; i++) { c.fillStyle = '#4b5563'; c.fillRect(lineX + (i/10)*lineW - 1, 40, 2, 5); } if(this.drag && !this.ball) { c.beginPath(); c.moveTo(200, 380); c.lineTo(200 + (this.sx - this.cx), 380 + (this.sy - this.cy)); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]); } c.save(); c.translate(200, 380); let angle = -Math.PI/2; if(this.drag && !this.ball) angle = Math.atan2(this.sy - this.cy, this.sx - this.cx); c.rotate(angle); c.fillStyle = '#4b5563'; c.fillRect(0, -10, 30, 20); c.beginPath(); c.arc(0, 0, 15, 0, Math.PI*2); c.fillStyle = '#374151'; c.fill(); c.restore(); if(this.ball) { this.ball.vy += 0.3; this.ball.x += this.ball.vx; this.ball.y += this.ball.vy; c.beginPath(); c.arc(this.ball.x, this.ball.y, 6, 0, Math.PI*2); c.fillStyle = '#f59e0b'; c.fill(); if(this.ball.y <= 40 && this.ball.vy < 0) { if(this.ball.x >= lineX && this.ball.x <= lineX + lineW) { let v = Math.max(0, Math.min(100, Math.round(((this.ball.x - lineX) / lineW) * 100))); setVolume(v); for(let i=0; i<15; i++) this.particles.push({x: this.ball.x, y: 40, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 1}); this.ball = null; } else { this.ball.vy *= -0.5; this.ball.y = 40; } } else if(this.ball.y > this.h || this.ball.x < 0 || this.ball.x > this.w) { this.ball = null; } } for(let i=this.particles.length-1; i>=0; i--) { let p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.05; c.globalAlpha = p.life; c.fillStyle = '#f59e0b'; c.fillRect(p.x, p.y, 4, 4); if(p.life <= 0) this.particles.splice(i, 1); } c.globalAlpha = 1; this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { document.getElementById('l26-display').innerText = v + '%'; }, reset: function() { this.ball = null; this.drag = false; this.particles = []; this.t = 0; if(this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-27', frame: null, ctx: null, w: 300, h: 200, stars: [], cX: 75, cw: 60, spawnT: 0, init: function() { const cvs = document.getElementById('l27-canvas'); cvs.width = this.w; cvs.height = this.h; this.ctx = cvs.getContext('2d'); document.getElementById('l27-slider').addEventListener('input', (e) => { this.cX = parseInt(e.target.value); }); }, loop: function() { if(levels[currentLevelIndex].id !== 'level-27') return; const c = this.ctx; c.clearRect(0,0,this.w,this.h); c.strokeStyle = 'rgba(34, 197, 94, 0.2)'; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(this.w * 0.25, 0); c.lineTo(this.w * 0.25, this.h); c.stroke(); c.setLineDash([]); this.spawnT++; if(this.spawnT > 15) { this.spawnT = 0; let sx = Math.random() < 0.2 ? (this.w * 0.25) : (Math.random() * this.w); this.stars.push({x: sx, y: -10, vy: 1.5 + Math.random()*1.5}); } let px = (this.cX / 100) * this.w; c.fillStyle = '#4b5563'; c.fillRect(px - this.cw/2, this.h - 10, this.cw, 10); c.fillRect(px - this.cw/2, this.h - 20, 4, 10); c.fillRect(px + this.cw/2 - 4, this.h - 20, 4, 10); for(let i=this.stars.length-1; i>=0; i--) { let s = this.stars[i]; s.y += s.vy; c.fillStyle = '#facc15'; c.beginPath(); c.arc(s.x, s.y, 4, 0, Math.PI*2); c.fill(); if(s.y > this.h - 20 && s.x >= px - this.cw/2 && s.x <= px + this.cw/2) { setVolume(Math.round((s.x / this.w) * 100)); this.stars.splice(i, 1); } else if(s.y > this.h) { this.stars.splice(i, 1); } } this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { document.getElementById('l27-display').innerText = v + '%'; }, reset: function() { this.stars = []; this.cX = 75; document.getElementById('l27-slider').value = 75; if(this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-28', frame: null, ctx: null, w: 300, h: 300, target: {x: 150, y: 130, r: 110}, ball: null, splats: [], t: 0, init: function() { const cvs = document.getElementById('l28-canvas'); cvs.width = this.w; cvs.height = this.h; this.ctx = cvs.getContext('2d'); const shoot = (e) => { e.preventDefault(); if (this.ball) return; const r = cvs.getBoundingClientRect(); const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (this.w / r.width); const cy = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * (this.h / r.height); const sx = this.w/2, sy = this.h; const dx = cx - sx, dy = cy - sy; const dist = Math.sqrt(dx*dx + dy*dy); this.ball = { x: sx, y: sy, tx: cx, ty: cy, vx: (dx/dist)*8, vy: (dy/dist)*8 }; }; cvs.addEventListener('mousedown', shoot); cvs.addEventListener('touchstart', shoot, {passive: false}); }, loop: function() { if(levels[currentLevelIndex].id !== 'level-28') return; const c = this.ctx; this.t += 0.03; this.target.x = 150 + Math.sin(this.t * 1.1) * 30; this.target.y = 130 + Math.cos(this.t * 0.8) * 20; c.clearRect(0,0,this.w,this.h); const rings = [ {r: 1, c: '#ef4444'}, {r: 0.8, c: '#ffffff'}, {r: 0.6, c: '#ef4444'}, {r: 0.4, c: '#ffffff'}, {r: 0.2, c: '#ef4444'} ]; for(let ri of rings) { c.beginPath(); c.arc(this.target.x, this.target.y, this.target.r * ri.r, 0, Math.PI*2); c.fillStyle = ri.c; c.fill(); } c.beginPath(); c.arc(this.target.x, this.target.y, this.target.r * 0.25, 0, Math.PI*2); c.strokeStyle = 'rgba(34, 197, 94, 0.9)'; c.lineWidth = 3; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); for(let s of this.splats) { c.beginPath(); c.arc(this.target.x + s.dx, this.target.y + s.dy, 5, 0, Math.PI*2); c.fillStyle = 'rgba(17, 24, 39, 0.8)'; c.fill(); } if(this.ball) { this.ball.x += this.ball.vx; this.ball.y += this.ball.vy; c.beginPath(); c.arc(this.ball.x, this.ball.y, 6, 0, Math.PI*2); c.fillStyle = '#3b82f6'; c.fill(); const distToT = Math.sqrt(Math.pow(this.ball.x - this.ball.tx, 2) + Math.pow(this.ball.y - this.ball.ty, 2)); if (distToT < 8) { const distToC = Math.sqrt(Math.pow(this.ball.x - this.target.x, 2) + Math.pow(this.ball.y - this.target.y, 2)); let vol = Math.round((distToC / this.target.r) * 100); if(vol > 100) vol = 100; setVolume(vol); this.splats.push({ dx: this.ball.x - this.target.x, dy: this.ball.y - this.target.y }); if(this.splats.length > 5) this.splats.shift(); this.ball = null; } } c.fillStyle = '#4b5563'; c.beginPath(); c.arc(this.w/2, this.h, 20, Math.PI, 0); c.fill(); this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { document.getElementById('l28-display').innerText = v + '%'; }, reset: function() { this.ball = null; this.splats = []; this.t = 0; if(this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-29', frame: null, ctx: null, w: 240, h: 200, ballPos: 75, ballVel: 0, angle: 0, fallen: false, init: function() { const cvs = document.getElementById('l29-canvas'); cvs.width = this.w; cvs.height = this.h; this.ctx = cvs.getContext('2d'); const s = document.getElementById('l29-slider'); s.addEventListener('input', () => { this.angle = -(parseInt(s.value) / 100) * 15; }); const snap = () => { s.value = 0; this.angle = 0; }; s.addEventListener('change', snap); s.addEventListener('mouseup', snap); s.addEventListener('touchend', snap); window.addEventListener('mouseup', (e) => { if(levels[currentLevelIndex] && levels[currentLevelIndex].id === 'level-29') snap(); }); }, loop: function() { if(levels[currentLevelIndex].id !== 'level-29') return; const c = this.ctx; c.clearRect(0,0,this.w,this.h); if(!this.fallen) { let accel = 0.5 * Math.sin(this.angle * Math.PI / 180); this.ballVel += accel; this.ballVel *= 0.95; this.ballPos += this.ballVel; if(this.ballPos < -5 || this.ballPos > 105) { this.fallen = true; document.getElementById('l29-display').innerHTML = '<span class="text-red-500 text-2xl sm:text-3xl font-black tracking-widest animate-pulse">ERR_LOST</span>'; } else { let v = Math.max(0, Math.min(100, Math.round(this.ballPos))); if(v !== window.currentVolume) setVolume(v); } } c.save(); c.translate(this.w/2, this.h/2); c.rotate(this.angle * Math.PI / 180); c.lineWidth = 4; c.strokeStyle = '#4b5563'; c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.stroke(); c.lineWidth = 8; c.strokeStyle = 'rgba(34, 197, 94, 0.6)'; c.beginPath(); c.moveTo(-55, 0); c.lineTo(-45, 0); c.stroke(); if(!this.fallen) { let px = (this.ballPos - 50) * 2; c.beginPath(); c.arc(px, -8, 8, 0, Math.PI*2); c.fillStyle = '#3b82f6'; c.fill(); } c.restore(); if(this.fallen) { c.fillStyle = '#ef4444'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText("BALL LOST.", this.w/2, this.h/2 - 40); c.fillStyle = '#9ca3af'; c.font = '10px monospace'; c.fillText("USE DEV BAR TO RESET", this.w/2, this.h/2 - 20); } this.frame = requestAnimationFrame(() => this.loop()); }, updateUI: function(v) { if(!this.fallen) document.getElementById('l29-display').innerText = v + '%'; }, reset: function() { this.ballPos = 75; this.ballVel = 0; this.angle = 0; this.fallen = false; document.getElementById('l29-slider').value = 0; if(this.frame) cancelAnimationFrame(this.frame); this.loop(); } },
            { id: 'level-30', reqVol: 75, processing: false, timerInt: null, timeLimit: 0, timeRemaining: 0, canvasCtx: null, signed: false, init: function() { const s = document.getElementById('l30-req-slider'), v = document.getElementById('l30-req-val'), btn = document.getElementById('l30-submit'), log = document.getElementById('l30-log'), pop = document.getElementById('l30-popup-overlay'), popCont = document.getElementById('l30-popup-content'), tBar = document.getElementById('l30-popup-timer-bar'); this.addLog = (msg, col='gray') => { log.innerHTML += `<div class="text-${col}-400">> ${msg}</div>`; log.scrollTop = log.scrollHeight; }; s.addEventListener('input', (e) => { this.reqVol = parseInt(e.target.value); v.innerText = this.reqVol + '%'; }); this.fail = (reason) => { this.processing = false; clearInterval(this.timerInt); pop.classList.add('hidden'); pop.classList.remove('flex'); btn.classList.remove('opacity-50', 'cursor-not-allowed'); btn.innerText = "SUBMIT FORM 8B"; this.addLog('REJECTED: ' + reason, 'red'); }; this.startTimer = (ms, onTime) => { this.timeLimit = ms; this.timeRemaining = ms; tBar.style.width = '100%'; let lastT = performance.now(); this.timerInt = setInterval(() => { let now = performance.now(); this.timeRemaining -= (now - lastT); lastT = now; tBar.style.width = Math.max(0, (this.timeRemaining / this.timeLimit) * 100) + '%'; if(this.timeRemaining <= 0) { clearInterval(this.timerInt); onTime(); } }, 16); }; this.p1 = () => { pop.classList.remove('hidden'); pop.classList.add('flex'); this.signed = false; popCont.innerHTML = `<div class="text-red-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Signature Required</div><canvas id="l30-sig-pad" class="w-full h-24 bg-gray-200 rounded cursor-crosshair touch-none shadow-inner"></canvas><button id="l30-sig-btn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded text-xs focus:outline-none tracking-widest uppercase">Verify</button>`; const c = document.getElementById('l30-sig-pad'); const r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height; this.canvasCtx = c.getContext('2d'); this.canvasCtx.lineWidth = 3; this.canvasCtx.strokeStyle = '#1e3a8a'; let draw = false; const getP = (e) => { const br = c.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: cx - br.left, y: cy - br.top }; }; const st = (e) => { e.preventDefault(); draw = true; this.signed = true; const p=getP(e); this.canvasCtx.beginPath(); this.canvasCtx.moveTo(p.x, p.y); }; const mv = (e) => { if(draw) { e.preventDefault(); const p=getP(e); this.canvasCtx.lineTo(p.x, p.y); this.canvasCtx.stroke(); }}; const ed = () => { draw = false; }; c.addEventListener('mousedown', st); c.addEventListener('mousemove', mv); c.addEventListener('mouseup', ed); c.addEventListener('mouseout', ed); c.addEventListener('touchstart', st, {passive: false}); c.addEventListener('touchmove', mv, {passive: false}); c.addEventListener('touchend', ed); document.getElementById('l30-sig-btn').onclick = () => { if(!this.signed) return; clearInterval(this.timerInt); pop.classList.add('hidden'); pop.classList.remove('flex'); this.addLog('Signature accepted...', 'green'); setTimeout(this.p2, 1000); }; this.startTimer(4000, () => this.fail("Failed to sign in time.")); }; this.p2 = () => { pop.classList.remove('hidden'); pop.classList.add('flex'); popCont.innerHTML = `<div class="text-red-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Stamp Required</div><div class="w-full h-32 relative overflow-hidden bg-gray-900 border border-gray-700 rounded shadow-inner" id="l30-stamp-area"><button id="l30-stamp-btn" class="absolute w-16 h-10 bg-red-700 hover:bg-red-600 text-white font-black text-[10px] tracking-widest rounded shadow-[0_0_15px_rgba(220,38,38,0.6)] focus:outline-none border-2 border-red-400 touch-none">STAMP</button></div>`; const b = document.getElementById('l30-stamp-btn'); const a = document.getElementById('l30-stamp-area'); let mvInt = setInterval(() => { b.style.left = Math.random() * (a.clientWidth - 64) + 'px'; b.style.top = Math.random() * (a.clientHeight - 40) + 'px'; }, 500); b.onclick = (e) => { e.preventDefault(); clearInterval(mvInt); clearInterval(this.timerInt); pop.classList.add('hidden'); pop.classList.remove('flex'); this.addLog('Form stamped...', 'green'); setTimeout(this.p3, 1000); }; b.addEventListener('touchstart', b.onclick, {passive:false}); this.startTimer(3500, () => { clearInterval(mvInt); this.fail("Failed to stamp form in time."); }); }; this.p3 = () => { pop.classList.remove('hidden'); pop.classList.add('flex'); popCont.innerHTML = `<div class="text-red-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Type exactly: AGREE</div><input type="text" id="l30-agree-in" class="w-full bg-gray-200 text-black font-black text-center p-3 text-lg rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`; const inp = document.getElementById('l30-agree-in'); setTimeout(() => inp.focus(), 100); inp.addEventListener('input', () => { if(inp.value === 'AGREE') { clearInterval(this.timerInt); pop.classList.add('hidden'); pop.classList.remove('flex'); this.addLog('Audit passed. Adjusting volume...', 'green'); this.processing = false; btn.innerText = "SUBMIT FORM 8B"; btn.classList.remove('opacity-50', 'cursor-not-allowed'); setVolume(this.reqVol); } }); this.startTimer(5000, () => this.fail("Consent not provided.")); }; btn.addEventListener('click', () => { if(this.processing) return; if (this.reqVol !== 25) { this.addLog('REJECTED: Only exactly 25% is approved today.', 'red'); return; } const c1 = document.getElementById('l30-cb-1').checked; const c2 = document.getElementById('l30-cb-2').checked; if (!c1 || !c2) { this.addLog('REJECTED: Mandatory checkboxes unchecked.', 'red'); return; } this.processing = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); btn.innerText = "AUDITING..."; log.innerHTML = ''; this.addLog('Transmitting to auditor...', 'blue'); setTimeout(this.p1, 1500); }); }, updateUI: function(v) { document.getElementById('l30-display').innerText = v + '%'; }, reset: function() { this.processing = false; if(this.timerInt) clearInterval(this.timerInt); document.getElementById('l30-req-slider').value = 75; document.getElementById('l30-req-val').innerText = '75%'; document.getElementById('l30-submit').innerText = "SUBMIT FORM 8B"; document.getElementById('l30-submit').classList.remove('opacity-50', 'cursor-not-allowed'); document.getElementById('l30-log').innerHTML = '<div>> System Ready.</div>'; document.getElementById('l30-cb-1').checked = false; document.getElementById('l30-cb-2').checked = false; document.getElementById('l30-popup-overlay').classList.add('hidden'); document.getElementById('l30-popup-overlay').classList.remove('flex'); } }
            
        ];

       function jumpToLevel(index) {
            if (progressTimer) {
                clearTimeout(progressTimer);
                progressTimer = null;
            }
           
            if (audio.paused) {
                audio.volume = 0.75;
                audio.play().catch(e => console.warn("Audio blocked by browser:", e));
            }
        
            document.getElementById('victory-screen').classList.add('hidden');
            document.getElementById('victory-screen').classList.remove('flex');
            
            document.getElementById('instructions-modal').classList.add('hidden');
            document.getElementById('instructions-modal').classList.remove('flex');
            
            progressContainer.classList.remove('hidden');
            levelContainer.classList.remove('hidden');
            
            currentLevelIndex = index;
            loadLevel(currentLevelIndex);
        
            updateDevBar(); 
        }

       function updateDevBar() {
            const devBar = document.getElementById('dev-bar');
            
            devBar.innerHTML = '';

            const loginLink = document.createElement('a');
            loginLink.href = '/login/';
            loginLink.target = '_blank';
            loginLink.rel = 'noopener noreferrer';
            loginLink.className = "h-8 px-3 shrink-0 flex items-center justify-center bg-gray-950/70 hover:bg-gray-800 text-[10px] sm:text-xs font-mono text-gray-500 hover:text-gray-300 rounded border border-gray-800 transition-colors focus:outline-none ml-1 sm:ml-2";
            loginLink.innerText = "Login";
            devBar.appendChild(loginLink);

            const resetBtn = document.createElement('button');
            resetBtn.className = "h-8 px-3 shrink-0 flex items-center justify-center bg-yellow-900/50 hover:bg-yellow-600 text-[10px] sm:text-xs font-mono text-yellow-400 rounded border border-yellow-800 transition-colors focus:outline-none mr-2 sm:mr-3";
            resetBtn.innerText = "RESET";
            resetBtn.onclick = () => jumpToLevel(currentLevelIndex);
            devBar.appendChild(resetBtn);
            
            const lvlLabel = document.createElement('span');
            lvlLabel.className = "text-[10px] sm:text-xs font-mono text-gray-500 font-bold mr-1 sm:mr-2 uppercase tracking-widest shrink-0";
            lvlLabel.innerText = "Lvl:";
            devBar.appendChild(lvlLabel);
            
            levels.forEach((lvl, i) => {
                const btn = document.createElement('button');
                
                if (i <= maxUnlockedLevel) {
                   
                    btn.className = "w-8 h-8 shrink-0 flex items-center justify-center bg-gray-800 hover:bg-blue-600 text-[10px] sm:text-xs font-mono text-gray-300 rounded border border-gray-700 transition-colors focus:outline-none";
                    btn.onclick = () => jumpToLevel(i);
                    
                    if (i === currentLevelIndex) {
                        btn.classList.add('ring-2', 'ring-blue-500', 'bg-gray-700');

                        setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100);
                    }
                } else {
                    btn.className = "w-8 h-8 shrink-0 flex items-center justify-center bg-gray-950 text-[10px] sm:text-xs font-mono text-gray-700 rounded border border-gray-800 opacity-40 cursor-not-allowed";
                    btn.disabled = true;
                }
                
                btn.innerText = i + 1;
                devBar.appendChild(btn);
            });

            const winBtn = document.createElement('button');
            
            if (maxUnlockedLevel >= levels.length) {
                winBtn.className = "h-8 px-3 shrink-0 flex items-center justify-center bg-green-900/50 hover:bg-green-600 text-[10px] sm:text-xs font-mono text-green-400 rounded border border-green-800 transition-colors focus:outline-none ml-3 mr-4 md:mr-0";
                winBtn.disabled = false;
                winBtn.onclick = () => jumpToLevel(levels.length);
            } else {
                winBtn.className = "h-8 px-3 shrink-0 flex items-center justify-center bg-gray-950 text-[10px] sm:text-xs font-mono text-gray-700 rounded border border-gray-800 opacity-40 cursor-not-allowed ml-3 mr-4 md:mr-0";
                winBtn.disabled = true;
            }
            
            if (currentLevelIndex >= levels.length) {
                winBtn.classList.add('ring-2', 'ring-green-400', 'bg-green-800');
                setTimeout(() => winBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100);
            }

            winBtn.innerText = "WIN";
            devBar.appendChild(winBtn);
        }

        function loadLevel(index) {
            document.querySelectorAll('.level-ui').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('flex'); 
            });
            
            document.getElementById('level-container').style.filter = 'none';

            if (index >= levels.length) {
                progressBar.style.width = '100%';
                levelContainer.classList.add('hidden');
                progressContainer.classList.add('hidden');
                
                const vic = document.getElementById('victory-screen');
                vic.classList.remove('hidden');
                vic.classList.add('flex');
                setTimeout(() => vic.classList.remove('opacity-0'), 100);

                const actualStart = startTime || Date.now(); 
                const timeDiff = Math.floor((Date.now() - actualStart) / 1000);
                const minutes = Math.floor(timeDiff / 60);
                const seconds = timeDiff % 60;
                const timeString = `${minutes}m ${seconds}s`;
                
                const timeEl = document.getElementById('vic-time');
                if (timeEl) timeEl.innerText = timeString;

                const REDIS_URL = "https://expert-jawfish-72148.upstash.io";
            
                const REDIS_TOKEN = "gQAAAAAAARnUAAIncDJjOGEyNGM2NzBkODg0ODFmOWMzYmMwNjc4N2M0NGEzY3AyNzIxNDg";

                fetch(`${REDIS_URL}/incr/global_survivors`, {
                    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
                })
                .then(res => res.json())
                .then(data => {
                    let rankText = "Anonymized";
                    if (data.result) {
                        rankText = `#${data.result.toLocaleString()}`;
                    } else if (data.error) {
                        console.warn("Redis Error:", data.error);
                        rankText = "Token Error";
                    }
                    
                    const survivorEl = document.getElementById('vic-survivor');
                    if (survivorEl) survivorEl.innerText = rankText;
                    
                    const shareBtn = document.getElementById('share-btn');
                    if (shareBtn) {
                        const shareText = `I just wasted ${timeString} of my life setting my volume to 25%.\n\nI was moron ${rankText}.\n\nSuffer with me: https://hostilevolume.com`;
                        
                        shareBtn.onclick = () => {
                            navigator.clipboard.writeText(shareText).then(() => {
                                const toast = document.getElementById('share-toast');
                                if(toast) {
                                    toast.classList.remove('opacity-0');
                                    setTimeout(() => toast.classList.add('opacity-0'), 2000);
                                }
                            }).catch(err => {
                                console.error('Could not copy text: ', err);
                                alert("Browser blocked copy. The suffering continues.");
                            });
                        };
                    }
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    document.getElementById('vic-survivor').innerText = "Offline Victim";
                });

                return;
            }

            progressBar.style.width = `${(index / levels.length) * 100}%`;

            const level = levels[index];
            level.reset(); 
            
            const levelEl = document.getElementById(level.id);
            levelEl.classList.remove('hidden');
            
            if (level.display === 'flex') {
                 levelEl.classList.add('flex');
            }

            levelTitle.innerText = `Level ${index + 1} of ${levels.length}`;
            
            levelContainer.classList.remove('opacity-100');
            levelContainer.classList.add('opacity-0');
            
            setTimeout(() => {
                setVolume(75); 
                levelContainer.classList.remove('opacity-0');
                levelContainer.classList.add('opacity-100');
            }, 300);
        }

        function nextLevel() {
            progressTimer = null; 
            currentLevelIndex++;
            if (currentLevelIndex > maxUnlockedLevel) {
                maxUnlockedLevel = currentLevelIndex;
            }
            loadLevel(currentLevelIndex);
            updateDevBar();
        }

        async function loadLevelData() {
            const files = Array.from({ length: 30 }, (_, i) => `data/levels/level-${String(i + 1).padStart(2, '0')}.json`);
            const loadedLevelData = await Promise.all(files.map(file => fetch(file).then(res => {
                if (!res.ok) throw new Error(`Failed to load ${file}`);
                return res.json();
            })));

            levelsRoot.innerHTML = loadedLevelData.map(level => level.html).join('\n');
            levels = loadedLevelData.map((level, index) => ({
                ...level,
                ...levelBehaviors[index]
            }));

            levels.forEach((level, index) => {
                if (!level.id || !levelBehaviors[index] || level.id !== levelBehaviors[index].id) {
                    throw new Error(`Level data mismatch at index ${index}`);
                }
            });
        }

        // TEMP TEST JUMP PATCH - remove after verification
        function createTestLevelJumpControls() {
            const params = new URLSearchParams(window.location.search);
            if (!params.has('testLevels') && !params.has('dev') && !params.has('debug')) return;

            maxUnlockedLevel = levels.length;

            const panel = document.createElement('div');
            panel.id = 'test-level-jumper';
            panel.className = 'fixed top-3 right-3 z-[25000] flex items-center gap-2 bg-black/80 border border-yellow-500/50 rounded-lg p-2 shadow-xl backdrop-blur text-xs font-mono';
            panel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:25000;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.9);border:2px solid #eab308;border-radius:8px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,.45);font:700 12px monospace;color:#fff;';

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = String(levels.length);
            input.value = String(currentLevelIndex + 1);
            input.className = 'w-14 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-yellow-500';
            input.style.cssText = 'width:56px;background:#111827;border:1px solid #6b7280;border-radius:4px;color:#fff;padding:6px 8px;';

            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.className = 'bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded px-3 py-1 uppercase tracking-wider';
            jumpBtn.innerText = 'Jump';
            jumpBtn.style.cssText = 'background:#eab308;color:#000;border:0;border-radius:4px;padding:7px 12px;font-weight:900;text-transform:uppercase;cursor:pointer;';
            jumpBtn.onclick = () => {
                const requestedLevel = parseInt(input.value, 10);
                if (!Number.isFinite(requestedLevel)) return;
                jumpToLevel(Math.max(1, Math.min(levels.length, requestedLevel)) - 1);
            };

            const label = document.createElement('span');
            label.innerText = 'Level';
            label.style.cssText = 'color:#fde68a;text-transform:uppercase;letter-spacing:.08em;';

            panel.append(label, input, jumpBtn);
            document.body.appendChild(panel);
        }

        async function bootstrapApp() {
            await loadLevelData();

            levels.forEach(level => {
                try { level.init(); } catch (e) { console.error(`Error initializing ${level.id}:`, e); }
            });

            createTestLevelJumpControls();
            updateDevBar();

           startBtn.addEventListener('click', () => {
                
               startTime = Date.now();
                audio.volume = 0.75;
                audio.play().catch(e => console.warn("Audio blocked by browser:", e));

                modal.classList.add('opacity-0');
                
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    progressContainer.classList.remove('hidden');
                    levelContainer.classList.remove('hidden');
                    
                    loadLevel(0);
                }, 500);
            });
        }

        bootstrapApp().catch(err => {
            console.error('Failed to start Hostile Volume:', err);
            levelTitle.innerText = 'Failed to load levels';
        });
