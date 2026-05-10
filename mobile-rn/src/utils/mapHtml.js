export function buildMapHtml(startLat, startLng, destinations, color = '#0d9488', hotelMalam = null) {
  const destJson = JSON.stringify(
    destinations.map((d, i) => ({
      lat: d.latitude,
      lng: d.longitude,
      nama: d.nama || d.name || `Destinasi ${i + 1}`,
      idx: i,
    }))
  );

  const waypoints = [
    [startLat, startLng],
    ...destinations.map((d) => [d.latitude, d.longitude]),
    hotelMalam ? [hotelMalam.latitude, hotelMalam.longitude] : [startLat, startLng],
  ];
  const osrmCoords = waypoints.map((p) => `${p[1]},${p[0]}`).join(';');
  const straightLine = JSON.stringify(waypoints);
  const centerLat = waypoints.reduce((s, p) => s + p[0], 0) / waypoints.length;
  const centerLng = waypoints.reduce((s, p) => s + p[1], 0) / waypoints.length;

  const markersJs = destinations.map((d, i) => `
    L.marker([${d.latitude},${d.longitude}],{
      icon:L.divIcon({className:'',
        html:'<div style="background:${color};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${i + 1}</div>',
        iconSize:[32,32],iconAnchor:[16,16]})
    }).addTo(map).bindPopup('<b>${(d.nama || d.name || '').replace(/'/g, "\\'")}</b>');
  `).join('\n');

  const hotelJs = hotelMalam ? `
    L.marker([${hotelMalam.latitude},${hotelMalam.longitude}],{
      icon:L.divIcon({className:'',
        html:'<div style="background:#1d4ed8;color:#fff;border-radius:6px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏨</div>',
        iconSize:[34,34],iconAnchor:[17,17]})
    }).addTo(map).bindPopup('<b>${(hotelMalam.nama || 'Hotel').replace(/'/g, "\\'")}</b><br>${'⭐'.repeat(Math.round(hotelMalam.bintang || 0))} · Rp ${hotelMalam.harga_per_malam ? hotelMalam.harga_per_malam.toLocaleString('id-ID') : '-'}/malam');
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,sans-serif}
    #map{width:100%;height:100%}
    #status{position:absolute;top:10px;left:50%;transform:translateX(-50%);
      background:rgba(13,148,136,0.92);color:#fff;padding:6px 16px;
      border-radius:20px;font-size:12px;font-weight:700;z-index:999;pointer-events:none}
    #status.hidden{display:none}

    #nav-hud{display:none;position:absolute;bottom:0;left:0;right:0;z-index:950}
    #nav-hud.show{display:block}
    #nav-header{background:#1d4ed8;padding:8px 14px;
      display:flex;justify-content:space-between;align-items:center}
    #nav-live-dot{width:8px;height:8px;background:#60a5fa;border-radius:50%;
      display:inline-block;margin-right:6px;animation:pulse 1.2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}
    #nav-instruksi{background:rgba(255,255,255,.97);backdrop-filter:blur(20px);
      padding:12px 16px;display:flex;align-items:center;gap:14px;
      border-top:1px solid rgba(0,0,0,.06)}
    #nav-arrow{font-size:44px;min-width:52px;text-align:center;color:#1d4ed8;line-height:1}
    #nav-dest-panel{background:rgba(240,249,255,.97);padding:9px 16px;
      display:flex;justify-content:space-between;align-items:center;
      border-top:1px solid rgba(13,148,136,.12)}
    #nav-dots{display:flex;gap:5px;align-items:center}

    #toast{display:none;position:absolute;top:16px;left:50%;transform:translateX(-50%);
      background:#0d9488;color:#fff;padding:12px 24px;border-radius:20px;
      font-weight:700;font-size:14px;z-index:9999;text-align:center;
      box-shadow:0 8px 24px rgba(13,148,136,.5)}
    #toast.show{display:block;animation:slideIn .3s ease}
    @keyframes slideIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

    #done-overlay{display:none;position:absolute;inset:0;z-index:9998;
      background:rgba(0,0,0,.4);align-items:center;justify-content:center}
    #done-overlay.show{display:flex}
    #done-card{background:linear-gradient(135deg,#7c3aed,#1d4ed8);color:#fff;
      padding:28px 32px;border-radius:24px;text-align:center;max-width:280px}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="status">Memuat rute...</div>

  <div id="nav-hud">
    <div id="nav-header">
      <div style="display:flex;align-items:center">
        <span id="nav-live-dot"></span>
        <span style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1.5px">NAVIGASI AKTIF</span>
      </div>
      <div style="text-align:right">
        <span id="nav-jarak-dest" style="color:#fff;font-size:16px;font-weight:800">—</span>
        <span id="nav-eta" style="color:#93c5fd;font-size:11px;margin-left:8px">—</span>
      </div>
    </div>
    <div id="nav-instruksi">
      <div id="nav-arrow">↑</div>
      <div style="flex:1">
        <p id="nav-instruksi-teks" style="font-weight:700;color:#0f172a;font-size:15px;margin:0">Menuju tujuan...</p>
        <p id="nav-jarak-step" style="color:#64748b;font-size:12px;margin:0"></p>
      </div>
    </div>
    <div id="nav-dest-panel">
      <div>
        <p id="nav-nama-dest" style="font-weight:700;color:#0f766e;font-size:13px;margin:0">—</p>
        <p id="nav-stop-info" style="color:#94a3b8;font-size:11px;margin:0">—</p>
      </div>
      <div id="nav-dots"></div>
    </div>
  </div>

  <div id="toast"></div>

  <div id="done-overlay">
    <div id="done-card">
      <p style="font-size:36px;margin-bottom:8px">🎉</p>
      <p style="font-size:20px;font-weight:800;margin-bottom:4px">Perjalanan Selesai!</p>
      <p id="done-total" style="font-size:13px;opacity:.8;margin-bottom:20px">—</p>
      <button onclick="document.getElementById('done-overlay').classList.remove('show')"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:10px 24px;
        border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">Tutup</button>
    </div>
  </div>

  <script>
    const DESTINATIONS = ${destJson};
    const START = { lat:${startLat}, lng:${startLng} };
    const ROUTE_COLOR = '${color}';

    const map = L.map('map',{zoomControl:true}).setView([${centerLat},${centerLng}],12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);

    L.marker([${startLat},${startLng}],{
      icon:L.divIcon({className:'',
        html:'<div style="background:#ef4444;color:#fff;border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
        iconSize:[14,14],iconAnchor:[7,7]})
    }).addTo(map).bindPopup('<b>Titik Awal</b>');

    ${markersJs}
    ${hotelJs}

    let routeLayer = null;

    async function muatRute() {
      const s = document.getElementById('status');
      s.textContent = 'Memuat rute jalan...'; s.classList.remove('hidden');
      routeLayer = L.polyline(${straightLine},{color:ROUTE_COLOR,weight:4,opacity:.6,dashArray:'8 6'}).addTo(map);
      map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
      try {
        const ctrl = new AbortController();
        setTimeout(()=>ctrl.abort(), 9000);
        const res = await fetch('https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson',{signal:ctrl.signal});
        const data = await res.json();
        if (data.code!=='Ok'||!data.routes?.[0]) throw new Error();
        const coords = data.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
        const km = (data.routes[0].distance/1000).toFixed(1);
        const mnt = Math.round(data.routes[0].duration/60);
        map.removeLayer(routeLayer);
        L.polyline(coords,{color:'#fff',weight:8,opacity:.8}).addTo(map);
        routeLayer = L.polyline(coords,{color:ROUTE_COLOR,weight:5,opacity:.9}).addTo(map);
        map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
        s.textContent = km+' km  ·  ~'+mnt+' menit';
        setTimeout(()=>s.classList.add('hidden'),3500);
      } catch(e) {
        s.textContent = 'Estimasi rute';
        setTimeout(()=>s.classList.add('hidden'),2500);
      }
    }
    muatRute();

    const PANAH = {
      'depart':'↑','straight':'↑','arrive':'🏁','merge':'↑','continue':'↑',
      'turn-right':'↪','turn-left':'↩','turn-slight right':'↗','turn-slight left':'↖',
      'turn-sharp right':'↪','turn-sharp left':'↩','roundabout':'↻','rotary':'↻',
    };
    function getArrow(step){const t=step?.maneuver?.type||'',m=step?.maneuver?.modifier||'';return PANAH[t+'-'+m]||PANAH[t]||'↑';}
    function fmtJarak(m){return m>=1000?(m/1000).toFixed(1)+' km':Math.round(m)+' m';}
    function fmtMenit(s){const j=Math.floor(s/3600),m=Math.round((s%3600)/60);return j>0?j+'j '+m+'mnt':(m<1?'<1mnt':'~'+m+'mnt');}
    function haversine(la1,lo1,la2,lo2){
      const R=6371000,r=Math.PI/180,dLa=(la2-la1)*r,dLo=(lo2-lo1)*r;
      const a=Math.sin(dLa/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dLo/2)**2;
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }

    let isNavigating = false;
    let indeksNav = 0;
    let userMarker = null, accuracyCircle = null;
    let navRouteLayers = [];
    let lastFetch = 0;
    let sedangFetch = false;
    const JARAK_TIBA = 200;
    const THROTTLE   = 8000;

    function renderDots() {
      const el = document.getElementById('nav-dots');
      el.innerHTML = DESTINATIONS.map((_,i)=>
        '<div style="width:'+(i===indeksNav?20:8)+'px;height:8px;border-radius:999px;'+
        'background:'+(i<indeksNav?'#0d9488':i===indeksNav?'#1d4ed8':'#cbd5e1')+';transition:all .3s"></div>'
      ).join('');
    }

    function updateInfoTujuan() {
      if (indeksNav >= DESTINATIONS.length) return;
      const dest = DESTINATIONS[indeksNav];
      document.getElementById('nav-nama-dest').textContent = dest.nama;
      document.getElementById('nav-stop-info').textContent = 'Stop '+(indeksNav+1)+' dari '+DESTINATIONS.length;
      document.getElementById('nav-jarak-dest').textContent = '—';
      document.getElementById('nav-eta').textContent = '—';
      document.getElementById('nav-arrow').textContent = '↑';
      document.getElementById('nav-instruksi-teks').textContent = 'Menghitung rute...';
      document.getElementById('nav-jarak-step').textContent = '';
      renderDots();
    }

    function tampilkanToast(pesan) {
      const el = document.getElementById('toast');
      el.textContent = pesan;
      el.classList.add('show');
      setTimeout(()=>el.classList.remove('show'),3500);
    }

    function tibaDiDestinasi() {
      const dest = DESTINATIONS[indeksNav];
      navRouteLayers.forEach(l=>map.removeLayer(l)); navRouteLayers=[];
      tampilkanToast('✅ Tiba di '+dest.nama+'!');

      // Kirim ke React Native untuk popup native
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'tiba',
          nama: dest.nama,
          indeks: indeksNav + 1,
          total: DESTINATIONS.length,
        }));
      }

      indeksNav++;
      if (indeksNav >= DESTINATIONS.length) {
        setTimeout(()=>{
          document.getElementById('done-total').textContent = 'Semua '+DESTINATIONS.length+' destinasi dikunjungi';
          document.getElementById('done-overlay').classList.add('show');
          document.getElementById('nav-hud').classList.remove('show');
          isNavigating = false;
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'selesai',total:DESTINATIONS.length}));
        },3000);
        return;
      }
      updateInfoTujuan();
    }

    async function fetchNavRoute(lat, lng) {
      if (indeksNav >= DESTINATIONS.length || sedangFetch) return;
      const now = Date.now();
      if (now - lastFetch < THROTTLE) return;
      lastFetch = now; sedangFetch = true;

      const dest = DESTINATIONS[indeksNav];
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/'+lng+','+lat+';'+dest.lng+','+dest.lat+'?steps=true&overview=full&geometries=geojson';
        const ctrl = new AbortController();
        setTimeout(()=>ctrl.abort(), 9000);
        const res = await fetch(url,{signal:ctrl.signal});
        const data = await res.json();
        if (!data.routes?.[0]) return;
        const route = data.routes[0];
        const latlngs = route.geometry.coordinates.map(c=>[c[1],c[0]]);

        navRouteLayers.forEach(l=>map.removeLayer(l)); navRouteLayers=[];
        const ol = L.polyline(latlngs,{color:'#fff',weight:10,opacity:.7}).addTo(map);
        const rl = L.polyline(latlngs,{color:'#1d4ed8',weight:6,opacity:.95}).addTo(map);
        navRouteLayers.push(ol,rl);

        document.getElementById('nav-jarak-dest').textContent = fmtJarak(route.distance);
        document.getElementById('nav-eta').textContent = fmtMenit(route.duration);

        const steps = (route.legs[0]?.steps||[]).filter(s=>s.distance>10);
        const step = steps[0]||route.legs[0]?.steps?.[0];
        if (step) {
          document.getElementById('nav-arrow').textContent = getArrow(step);
          document.getElementById('nav-instruksi-teks').textContent = step.name||'Lanjut terus';
          document.getElementById('nav-jarak-step').textContent = 'dalam '+fmtJarak(step.distance||0);
        }
      } catch(e) {
      } finally {
        sedangFetch = false;
      }
    }

    function startNavigation() {
      isNavigating = true;
      indeksNav = 0;
      document.getElementById('nav-hud').classList.add('show');
      updateInfoTujuan();
    }

    function stopNavigation() {
      isNavigating = false;
      navRouteLayers.forEach(l=>map.removeLayer(l)); navRouteLayers=[];
      document.getElementById('nav-hud').classList.remove('show');
    }

    function updateUserLocation(lat, lng, accuracy) {
      const latlng = [lat, lng];
      if (!userMarker) {
        userMarker = L.circleMarker(latlng,{
          radius:10,fillColor:'#1d4ed8',color:'#fff',weight:3,fillOpacity:1,
        }).addTo(map).bindPopup('Posisi Anda');
        if (accuracy) {
          accuracyCircle = L.circle(latlng,{
            radius:accuracy,color:'#1d4ed8',fillColor:'#1d4ed8',fillOpacity:.07,weight:1,
          }).addTo(map);
        }
      } else {
        userMarker.setLatLng(latlng);
        if (accuracyCircle&&accuracy) accuracyCircle.setLatLng(latlng).setRadius(accuracy);
      }

      if (!isNavigating || indeksNav >= DESTINATIONS.length) return;

      const dest = DESTINATIONS[indeksNav];
      const jarak = haversine(lat, lng, dest.lat, dest.lng);

      if (jarak <= JARAK_TIBA) { tibaDiDestinasi(); return; }

      document.getElementById('nav-jarak-dest').textContent = fmtJarak(jarak);

      map.panTo(latlng,{animate:true,duration:.5});

      fetchNavRoute(lat, lng);
    }
  </script>
</body>
</html>`;
}
