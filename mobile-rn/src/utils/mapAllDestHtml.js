import { KATEGORI_WARNA, WARNA_RUTE } from '../constants/theme';

// HTML peta semua destinasi — mirip web map.html
export function buildMapAllDestHtml(destinations) {
  const destJson = JSON.stringify(destinations);

  const warnaJson = JSON.stringify(KATEGORI_WARNA);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,sans-serif;background:#f0f9ff}
    #map{width:100%;height:100%}

    /* Info panel bawah */
    #info-panel{
      display:none;position:absolute;bottom:0;left:0;right:0;z-index:900;
      background:rgba(255,255,255,0.97);
      border-top-left-radius:20px;border-top-right-radius:20px;
      padding:16px;
      box-shadow:0 -4px 30px rgba(0,0,0,0.12);
    }
    #info-panel.show{display:block}
    #info-handle{width:40px;height:4px;background:#e2e8f0;border-radius:2px;margin:0 auto 14px}

    /* Chip kategori */
    #chips{position:absolute;top:10px;left:10px;right:10px;z-index:800;
      display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}
    #chips::-webkit-scrollbar{display:none}
    .chip{background:rgba(255,255,255,0.92);backdrop-filter:blur(10px);
      border:1.5px solid #e2e8f0;border-radius:20px;
      padding:6px 14px;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;
      transition:all 0.2s;color:#475569}
    .chip.active{background:#0d9488;border-color:#0d9488;color:#fff}

    /* Counter */
    #counter{position:absolute;bottom:14px;right:14px;z-index:800;
      background:rgba(15,23,42,0.75);color:#fff;backdrop-filter:blur(8px);
      padding:6px 12px;border-radius:12px;font-size:12px;font-weight:700}
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Filter Chips -->
  <div id="chips">
    <div class="chip active" onclick="filterKat('')">Semua</div>
    <div class="chip" onclick="filterKat('Bahari')">Bahari</div>
    <div class="chip" onclick="filterKat('Cagar Alam')">Cagar Alam</div>
    <div class="chip" onclick="filterKat('Budaya')">Budaya</div>
    <div class="chip" onclick="filterKat('Taman Wisata Alam')">Taman Alam</div>
    <div class="chip" onclick="filterKat('Taman Hiburan')">Hiburan</div>
  </div>

  <!-- Counter -->
  <div id="counter"></div>

  <!-- Info panel -->
  <div id="info-panel">
    <div id="info-handle"></div>
    <div id="info-kat-badge" style="display:inline-flex;align-items:center;gap:6px;padding:3px 12px;border-radius:20px;margin-bottom:10px;font-size:11px;font-weight:700"></div>
    <p id="info-name" style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px"></p>
    <p id="info-city" style="font-size:13px;color:#64748b;margin-bottom:14px"></p>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:12px;text-align:center">
        <p style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;margin-bottom:4px">Harga Tiket</p>
        <p id="info-fee" style="font-size:14px;font-weight:800;color:#0f172a"></p>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:12px;padding:12px;text-align:center">
        <p style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:4px">Durasi</p>
        <p id="info-dur" style="font-size:14px;font-weight:800;color:#0f172a"></p>
      </div>
    </div>
    <button onclick="closePanel()" style="width:100%;padding:13px;border-radius:14px;
      background:linear-gradient(135deg,#0d9488,#2563eb);color:#fff;
      font-size:14px;font-weight:700;border:none;cursor:pointer">Tutup</button>
  </div>

  <script>
    const WARNA = ${warnaJson};
    const DESTINATIONS = ${destJson};

    const map = L.map('map',{zoomControl:false}).setView([-7.3274,108.2207],10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(map);
    L.control.zoom({position:'bottomright'}).addTo(map);

    let allMarkers = [];
    let activeKat = '';

    function getWarna(kat){ return WARNA[kat]||WARNA['Default']||'#0d9488'; }

    function buatIcon(kat, size=36){
      const bg = getWarna(kat);
      return L.divIcon({
        className:'',
        html:\`<div style="width:\${size}px;height:\${size}px;background:\${bg};
          border:3px solid #fff;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 10px rgba(0,0,0,.25)">
          <div style="width:10px;height:10px;background:#fff;border-radius:50%"></div>
        </div>\`,
        iconSize:[size,size],iconAnchor:[size/2,size/2],
      });
    }

    function formatRp(n){
      return 'Rp '+n.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');
    }

    function showPanel(dest){
      const kat = dest.category;
      const warna = getWarna(kat);
      const badge = document.getElementById('info-kat-badge');
      badge.textContent = kat;
      badge.style.background = warna+'20';
      badge.style.color = warna;
      document.getElementById('info-name').textContent = dest.name;
      document.getElementById('info-city').textContent = '📍 '+dest.city;
      document.getElementById('info-fee').textContent = formatRp(dest.entrance_fee);
      document.getElementById('info-dur').textContent = dest.average_duration_spent+' menit';
      document.getElementById('info-panel').classList.add('show');
    }

    function closePanel(){
      document.getElementById('info-panel').classList.remove('show');
    }

    map.on('click', closePanel);

    function renderMarkers(list){
      allMarkers.forEach(m=>map.removeLayer(m));
      allMarkers=[];
      list.forEach(dest=>{
        const lat=parseFloat(dest.latitude);
        const lng=parseFloat(dest.longitude);
        const m=L.marker([lat,lng],{icon:buatIcon(dest.category)})
          .on('click',function(e){
            L.DomEvent.stopPropagation(e);
            map.panTo([lat,lng],{animate:true});
            showPanel(dest);
          }).addTo(map);
        allMarkers.push(m);
      });
      document.getElementById('counter').textContent=list.length+' destinasi';
    }

    function filterKat(kat){
      activeKat=kat;
      document.querySelectorAll('.chip').forEach(c=>{
        const isActive=(kat===''&&c.textContent==='Semua')||c.textContent.includes(kat.replace('Taman Wisata Alam','Taman Alam'));
        c.classList.toggle('active',isActive);
      });
      const filtered=kat?DESTINATIONS.filter(d=>d.category===kat):DESTINATIONS;
      renderMarkers(filtered);
      closePanel();
      if(filtered.length>0){
        const bounds=filtered.map(d=>[parseFloat(d.latitude),parseFloat(d.longitude)]);
        map.fitBounds(bounds,{padding:[60,20]});
      }
    }

    // Initial render
    renderMarkers(DESTINATIONS);
    if(DESTINATIONS.length>0){
      const bounds=DESTINATIONS.map(d=>[parseFloat(d.latitude),parseFloat(d.longitude)]);
      map.fitBounds(bounds,{padding:[60,20]});
    }
  </script>
</body>
</html>`;
}
