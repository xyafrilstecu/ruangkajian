// ==========================================
// 1. HELPER DAN LOCAL STORAGE
// =========================================
const $ = (...s) => document.querySelector(...s);
const store = {
    get(k) {
        try {
            return JSON.parse(localStorage.getItem(k));
        } catch (e) {
            return null;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem(k, JSON.stringify(v));
        } catch (e) {}
    }
};
// Format waktu menjadi menit:detik
const fmt = s =>
    Math.floor(s / 60) + ':' +
    String(Math.floor(s % 60)).padStart(2, '0');
// Notifikasi
let tt;
const toast = m => {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => {
        t.classList.remove('show');
    }, 2400);
};
// ==========================================
// 2. PENGATURAN WAKTU
// ==========================================
const modes = ['auto', 'pagi', 'siang', 'senja', 'malam'];
let mode = 'auto';
// Menentukan suasana berdasarkan jam perangkat
const autoTime = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 10) return 'pagi';
    if (h >= 10 && h < 15) return 'siang';
    if (h >= 15 && h < 18) return 'senja';
    return 'malam';
};
// Mengubah tampilan berdasarkan waktu
function applyTime() {
    const t = mode === 'auto' ? autoTime() : mode;
    document.body.dataset.time = t;
    $('#tl').textContent =
        mode === 'auto'
            ? 'Otomatis · ' + t
            : t[0].toUpperCase() + t.slice(1);
}
// Mengganti mode waktu
$('#dTime').onclick = () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    applyTime();
    store.set('rk_mode', mode);
};
// Memuat pengaturan sebelumnya
mode = store.get('rk_mode') || 'auto';
applyTime();
setInterval(applyTime, 60000);
// ==========================================
// 3. ANIMASI DAUN DAN PARTIKEL CAHAYA
// ==========================================
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cols = [
        '#7fb069',
        '#a3c46b',
        '#d9b44a',
        '#c98a4b'
    ];

    setInterval(() => {
        if (document.hidden) return;

        const l = document.createElement('span');
        const n = document.body.dataset.time === 'malam';

        l.className = 'leaf' + (n ? ' glow' : '');
        l.style.left = Math.random() * 100 + 'vw';
        l.style.setProperty(
            '--dx',
            (Math.random() * 160 - 60) + 'px'
        );
        l.style.animationDuration =
            (9 + Math.random() * 7) + 's';
        if (!n) {
            l.style.background =
                cols[Math.floor(Math.random() * 4)];
        }
        l.onanimationend = () => l.remove();
        document.body.appendChild(l);
    }, 1300);
}
// ==========================================
// 4. DATA DAN PEMUTAR KAJIAN (YOUTUBE IFRAME API)
// ==========================================
// Judul, nama kanal, dan durasi diisi otomatis dari YouTube.
const K = [
    { id: 'CB8VcQW2XQ8', t: 'Memuat judul…', s: 'YouTube', d: 0 },
    { id: 'CsnIfa7p3D8', t: 'Memuat judul…', s: 'YouTube', d: 0 },
    { id: 'jri_8ZZjgQk', t: 'Memuat judul…', s: 'YouTube', d: 0 }
];
let cur = 0;
let pos = 0;
let playing = false;
let seeking = false;
let player = null;
let ready = false;

const fmtD = s => (s > 0 ? fmt(s) : '–:––');
const esc = t => String(t).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

// Menampilkan daftar kajian
function renderList() {
    $('#list').innerHTML = K.map((k, i) => `
        <button class="item${i === cur ? ' on' : ''}" data-i="${i}">
            <span>
                ${esc(k.t)}
                <small>${esc(k.s)}</small>
            </span>
            <span class="time">
                ${fmtD(k.d)}
            </span>
        </button>
    `).join('');
}
renderList();

// Mengambil judul asli video lewat oEmbed YouTube
K.forEach(k => {
    fetch(
        'https://www.youtube.com/oembed?format=json&url=' +
        encodeURIComponent('https://www.youtube.com/watch?v=' + k.id)
    )
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(j => {
            k.t = j.title;
            k.s = j.author_name || 'YouTube';
            renderList();
            ui();
        })
        .catch(() => {});
});

// Memperbarui tampilan player
function ui() {
    const k = K[cur];
    $('#ttl').textContent = k.t;
    $('#cur').textContent = fmt(pos);
    $('#dur').textContent = fmtD(k.d);
    if (!seeking) {
        $('#seek').value = k.d ? pos / k.d * 1000 : 0;
    }
    $('#play').textContent = playing ? 'Jeda' : 'Putar';
    $('#bigPlay').textContent = playing ? '❚❚' : '▶';
    $('.screen').classList.toggle('playing', playing);
    document.querySelectorAll('.item').forEach((e, i) => {
        e.classList.toggle('on', i === cur);
    });
}

// Menyamakan data dengan pemutar YouTube
function sync() {
    if (!ready) return;
    const k = K[cur];
    const d = player.getDuration();
    if (d > 0 && Math.abs(d - k.d) > 1) {
        k.d = d;
        renderList();
    }
    const vd = player.getVideoData && player.getVideoData();
    if (vd && vd.video_id === k.id && vd.title && vd.title !== k.t) {
        k.t = vd.title;
        if (vd.author) k.s = vd.author;
        renderList();
    }
    if (!seeking) pos = player.getCurrentTime() || 0;
}

// Memuat YouTube IFrame API
window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('yt', {
        videoId: K[cur].id,
        playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 0,
            iv_load_policy: 3,
            start: Math.floor(pos)
        },
        events: {
            onReady() {
                ready = true;
                if (player.getVideoData().video_id !== K[cur].id) {
                    player.cueVideoById(K[cur].id);
                }
                sync();
                ui();
            },
            onStateChange(e) {
                const S = YT.PlayerState;
                if (e.data === S.PLAYING) playing = true;
                if (e.data === S.PAUSED) playing = false;
                if (e.data === S.ENDED) {
                    playing = false;
                    pos = K[cur].d || pos;
                }
                sync();
                ui();
            },
            onError(e) {
                playing = false;
                ui();
                toast('Video tidak bisa diputar di sini (kode ' + e.data + ')');
            }
        }
    });
};
const ytScript = document.createElement('script');
ytScript.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(ytScript);

// Tombol play dan pause
function toggle() {
    startAudio();
    if (!ready) {
        toast('Pemutar YouTube masih dimuat…');
        return;
    }
    if (playing) player.pauseVideo();
    else player.playVideo();
}
$('#play').onclick = $('#bigPlay').onclick = toggle;

// Mundur / maju 10 detik
function skip(delta) {
    if (!ready) return;
    const d = K[cur].d || Infinity;
    pos = Math.min(d, Math.max(0, player.getCurrentTime() + delta));
    player.seekTo(pos, true);
    ui();
}
$('#back').onclick = () => skip(-10);
$('#fwd').onclick = () => skip(10);

// Mengatur posisi kajian
const seekEl = $('#seek');
seekEl.addEventListener('pointerdown', () => { seeking = true; });
seekEl.addEventListener('input', () => {
    seeking = true;
    pos = seekEl.value / 1000 * K[cur].d;
    $('#cur').textContent = fmt(pos);
});
seekEl.addEventListener('change', () => {
    if (ready && K[cur].d) player.seekTo(pos, true);
    seeking = false;
    ui();
});

// Memilih kajian
$('#list').onclick = e => {
    const b = e.target.closest('.item');
    if (!b) return;
    cur = +b.dataset.i;
    pos = 0;
    startAudio();
    ui();
    if (ready) {
        player.loadVideoById(K[cur].id);
    } else {
        toast('Pemutar YouTube masih dimuat…');
    }
};

// Sinkronisasi waktu setiap setengah detik
setInterval(() => {
    if (ready && playing) sync();
    ui();
}, 500);
// ==========================================
// 5. FITUR BOOKMARK
// ==========================================
$('#bm').onclick = () => {
    if (ready) sync();
    store.set('rk_bm', {
        cur,
        pos
    });
    $('#bmInfo').textContent =
        'Tersimpan di ' + fmt(pos);
    toast('Posisi tersimpan di ' + fmt(pos));
};
// Memuat bookmark sebelumnya
const bm = store.get('rk_bm');
if (bm && K[bm.cur]) {
    cur = bm.cur;
    pos = bm.pos;
    $('#bmInfo').textContent =
        'Terakhir disimpan di ' +
        fmt(pos) +
        ' — tekan Putar untuk lanjut';
}
ui();
// ==========================================
// 6. AMBIENT MIXER (WEB AUDIO API)
// ==========================================
let ctx, nbuf;
// Daftar suara alam
const CH = [
    { k: 'rain', n: 'Hujan', i: '🌧', peak: 0.5 },
    { k: 'bird', n: 'Burung', i: '🐦', peak: 0.35 },
    { k: 'river', n: 'Sungai', i: '💧', peak: 0.8 },
    { k: 'wind', n: 'Angin', i: '🍃', peak: 0.9 }
];
// Pengaturan suara
const st = store.get('rk_mix') || {
    rain: { on: false, v: 60 },
    bird: { on: true, v: 40 },
    river: { on: false, v: 50 },
    wind: { on: false, v: 40 }
};
const gains = {};
// Menampilkan kontrol suara
$('#chs').innerHTML = CH.map(c => `
    <div class="ch">
        <button
            data-k="${c.k}"
            aria-pressed="${st[c.k].on}"
            aria-label="${c.n}"
        >
            ${c.i}
        </button>
        <span>${c.n}</span>
        <input
            type="range"
            min="0"
            max="100"
            value="${st[c.k].v}"
            data-k="${c.k}"
            aria-label="Volume ${c.n}"
        >
    </div>
`).join('');
// Filter audio
const flt = (t, f, q) => {
    const x = ctx.createBiquadFilter();
    x.type = t;
    x.frequency.value = f;
    if (q) x.Q.value = q;
    return x;
};
// Membuat suara noise
const noise = () => {
    const s = ctx.createBufferSource();
    s.buffer = nbuf;
    s.loop = true;
    s.start();
    return s;
};
// Mengatur perubahan suara otomatis
const lfo = (hz, depth, target) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = hz;
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
};
// Inisialisasi audio
function initAudio() {
    if (ctx) {
        ctx.resume();
        return;
    }
    ctx = new (
        window.AudioContext ||
        window.webkitAudioContext
    )();
    nbuf = ctx.createBuffer(
        1,
        ctx.sampleRate * 2,
        ctx.sampleRate
    );
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
        d[i] = Math.random() * 2 - 1;
    }
    // Membuat jalur audio setiap suara
    CH.forEach(c => {
        const g = ctx.createGain();
        g.gain.value = 0;
        g.connect(ctx.destination);
        gains[c.k] = g;
    });
    // Suara hujan
    noise()
        .connect(flt('highpass', 1200))
        .connect(flt('lowpass', 9000))
        .connect(gains.rain);
    // Suara sungai
    const rv = ctx.createGain();
    rv.gain.value = 0.6;
    noise()
        .connect(flt('bandpass', 520, 0.6))
        .connect(rv)
        .connect(gains.river);
    lfo(0.3, 0.25, rv.gain);
    // Suara angin
    const wf = flt('lowpass', 380, 1);
    const wg = ctx.createGain();
    wg.gain.value = 0.7;
    noise()
        .connect(wf)
        .connect(wg)
        .connect(gains.wind);
    lfo(0.08, 250, wf.frequency);
    lfo(0.11, 0.3, wg.gain);
    // Suara kicau burung
    (function chirp() {
        const s = st.bird;
        if (s.on && s.v > 0) {
            const n = 2 + Math.floor(Math.random() * 3);
            const f0 = 2400 + Math.random() * 1800;
            for (let j = 0; j < n; j++) {
                const t = ctx.currentTime + j * 0.14;
                const o = ctx.createOscillator();
                const e = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(f0, t);
                o.frequency.exponentialRampToValueAtTime(
                    f0 * (Math.random() > 0.5 ? 1.35 : 0.72),
                    t + 0.09
                );
                e.gain.setValueAtTime(0, t);
                e.gain.linearRampToValueAtTime(
                    0.5,
                    t + 0.015
                );
                e.gain.exponentialRampToValueAtTime(
                    0.001,
                    t + 0.11
                );
                o.connect(e).connect(gains.bird);
                o.start(t);
                o.stop(t + 0.12);
            }
        }
        setTimeout(chirp, 1500 + Math.random() * 3000);
    })();
    apply();
}
// Menerapkan volume suara
function apply() {
    if (!ctx) return;
    CH.forEach(c => {
        const s = st[c.k];
        gains[c.k].gain.setTargetAtTime(
            s.on ? s.v / 100 * c.peak : 0,
            ctx.currentTime,
            0.15
        );

    });
}
// Memulai audio
function startAudio() {
    initAudio();
}
// Tombol mengaktifkan suara
$('#chs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    initAudio();
    const s = st[b.dataset.k];
    s.on = !s.on;
    b.setAttribute('aria-pressed', s.on);
    apply();
    store.set('rk_mix', st);
});
// Pengaturan volume
$('#chs').addEventListener('input', e => {
    const k = e.target.dataset.k;
    if (!k) return;
    initAudio();
    st[k].v = +e.target.value;
    if (st[k].v > 0 && !st[k].on) {
        st[k].on = true;
        document.querySelector(
            `.ch button[data-k="${k}"]`
        ).setAttribute('aria-pressed', true);
    }
    apply();
    store.set('rk_mix', st);
});
// ==========================================
// 7. MENU DAN MODE KHUSYUK
// ==========================================
const mix = $('#mixer');
// Mengatur tampilan mixer
const setMix = o => {
    mix.classList.toggle('open', o);
    document.body.classList.toggle('mixer-open', o);
    $('#dMix').setAttribute('aria-pressed', o);
};
// Tombol suasana
$('#dMix').onclick = () => {
    setMix(!mix.classList.contains('open'));
};
// Navigasi suasana
$('#navMix').onclick = e => {
    e.preventDefault();
    setMix(true);
};
// Membuka mixer otomatis pada layar besar
if (innerWidth >= 1100) {
    setMix(true);
}
// Mode khusyuk
$('#dFocus').onclick = () => {
    const f = document.body.classList.toggle('focus');
    $('#dFocus').setAttribute('aria-pressed', f);
    toast(
        f
            ? 'Mode khusyuk aktif'
            : 'Mode khusyuk nonaktif'
    );
};
// ==========================================
// 8. HIKMAH HARI INI
// ==========================================
const H = [
    {
        q: 'Ingatlah, hanya dengan mengingat Allah hati menjadi tenang.',
        s: 'QS. Ar-Ra’d: 28'
    },
    {
        q: 'Siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.',
        s: 'HR. Muslim'
    },
    {
        q: 'Sebaik-baik kalian adalah yang belajar Al-Qur’an dan mengajarkannya.',
        s: 'HR. Bukhari'
    },
    {
        q: 'Sesungguhnya bersama kesulitan ada kemudahan.',
        s: 'QS. Al-Insyirah: 6'
    }
];
// Menampilkan hikmah secara acak
function hik() {
    const h = H[Math.floor(Math.random() * H.length)];
    $('#hq').textContent = h.q;
    $('#hs').textContent = h.s;
    $('#hikmah').classList.add('show');
}
// Tombol menutup hikmah
$('#hx').onclick = () => {
    $('#hikmah').classList.remove('show');
};
// Tombol hikmah
$('#dHik').onclick = () => {
    document.body.classList.remove('focus');
    $('#dFocus').setAttribute('aria-pressed', false);
    hik();
};
// Menampilkan hikmah setelah halaman dibuka
setTimeout(hik, 1200);