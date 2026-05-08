import { WARNA_RUTE } from '../constants/theme';

// Peta rute itinerary dengan OSRM + turn-by-turn HUD + live navigation
export function buildMapHtml(startLat, startLng, destinations, allDays = null) {
  const waypoints = [
    [startLat, startLng],
    ...destinations.map((d) => [d.latitude, d.longitude]),
    [startLat, startLng],
  ];

  const osrmCoords = waypoints.map((p) => `${p[1]},${p[0]}`).join(';');
  const straightLine = JSON.stringify(waypoints);

  const markersJs = destinations
    .map((d, i) => `
      L.marker([${d.latitude},${d.longitude}],{
        icon:L.divIcon({
          className:'',
          html:'<div style="background:#ea580c;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${i + 1}</div>',
          iconSize:[32,32],iconAnchor:[16,16],
        })
      }).addTo(map).bindPopup('<b>${(d.nama || d.name || 'Destinasi').replace(/'/g, "\\'")}</b>');
    `).join('\n');

  const centerLat = waypoints.reduce((s, p) => s + p[0], 0) / waypoints.length;
  const centerLng = waypoints.reduce((s, p) => s + p[1], 0) / waypoints.length;

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

    /* Badge status OSRM */
    #status{
      position:absolute;top:10px;left:50%;transform:translateX(-50%);
      background:rgba(13,148,136,0.92);color:#fff;
      padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;
      z-index:999;backdrop-filter:blur(8px);pointer-events:none;
    }
    #status.hidden{display:none}

    /* Turn-by-turn HUD */
    #nav-hud{
      display:none;position:absolute;bottom:0;left:0;right:0;z-index:950;
    }
    #nav-hud.show{display:block}
    #nav-header{
      background:#1d4ed8;padding:7px 14px;
      display:flex;justify-content:space-between;align-items:center;
    }
    #nav-live-dot{
      width:8px;height:8px;background:#60a5fa;border-radius:50%;
      display:inline-block;margin-right:6px;
      animation:pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
    #nav-instruksi{
      background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);
      padding:12px 16px;display:flex;align-items:center;gap:14px;
      border-top:1px solid rgba(0,0,0,0.06);
    }
    #nav-arrow{font-size:40px;min-width:46px;text-align:center;color:#1d4ed8;line-height:1}
    #nav-dest-panel{
      background:rgba(240,249,255,0.97);padding:8px 16px;
      display:flex;justify-content:space-between;align-items:center;
      border-top:1px solid rgba(13,148,136,0.12);
    }
    #nav-badge{
      display:none;position:absolute;top:10px;right:10px;
      background:#16a34a;color:#fff;padding:5px 12px;
      border-radius:12px;font-size:11px;font-weight:700;z-index:999;
    }
    #nav-badge.show{display:block}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="status">Memuat rute...</div>
  <div id="nav-badge">Navigasi Aktif</div>

  <!-- Turn-by-turn HUD -->
  <div id="nav-hud">
    <div id="nav-header">
      <div style="display:flex;align-items:center">
        <span id="nav-live-dot"></span>
        <span style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1.5px">NAVIGASI AKTIF</span>
      </div>
      <div id="nav-jarak-dest" style="color:#fff;font-size:16px;font-weight:800">—</div>
    </div>
    <div id="nav-instruksi">
      <div id="nav-arrow">↑</div>
      <div style="flex:1">
        <p id="nav-instruksi-teks" style="font-weight:700;color:#0f172a;font-size:15px;margin:0">Menuju tujuan...</p>
        <p id="nav-jarak-step" style="color:#64748b;font-size:12px;margin:0"></p>
      </div>
      <div style="text-align:right;min-width:56px">
        <p id="nav-waktu" style="font-weight:800;color:#0d9488;font-size:18px;margin:0">—</p>
        <p style="color:#94a3b8;font-size:10px;margin:0">estimasi</p>
      </div>
    </div>
    <div id="nav-dest-panel">
      <div>
        <p id="nav-nama-dest" style="font-weight:700;color:#0f766e;font-size:13px;margin:0">—</p>
        <p id="nav-stop-info" style="color:#94a3b8;font-size:11px;margin:0">—</p>
      </div>
    </div>
  </div>

  <script>
    const map = L.map('map',{zoomControl:true}).setView([${centerLat},${centerLng}],12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(map);

    // Marker titik awal
    L.marker([${startLat},${startLng}],{
      icon:L.divIcon({
        className:'',
        html:'<div style="background:#0d9488;color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.3);font-size:18px">🏠</div>',
        iconSize:[38,38],iconAnchor:[19,19],
      })
    }).addTo(map).bindPopup('<b>Titik Awal</b>');

    ${markersJs}

    let routeLayer=null;
    let isNavigating=false;
    let userMarker=null,accuracyCircle=null;

    // ── Garis lurus fallback ─────────────────────────────────────
    function gambarGariLurus(){
      if(routeLayer)map.removeLayer(routeLayer);
      routeLayer=L.polyline(${straightLine},{
        color:'#0d9488',weight:4,opacity:.6,dashArray:'8 6'
      }).addTo(map);
      map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
      const s=document.getElementById('status');
      s.textContent='Estimasi rute (offline)';
      setTimeout(()=>s.classList.add('hidden'),2500);
    }

    // ── OSRM rute nyata ──────────────────────────────────────────
    async function muatRute(){
      const s=document.getElementById('status');
      s.textContent='Memuat rute jalan...';
      s.classList.remove('hidden');
      try{
        const ctrl=new AbortController();
        const timer=setTimeout(()=>ctrl.abort(),9000);
        const res=await fetch(
          'https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson',
          {signal:ctrl.signal}
        );
        clearTimeout(timer);
        const data=await res.json();
        if(data.code!=='Ok'||!data.routes?.[0])throw new Error();
        const coords=data.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
        const jarak=(data.routes[0].distance/1000).toFixed(1);
        const menit=Math.round(data.routes[0].duration/60);
        if(routeLayer)map.removeLayer(routeLayer);
        // Outline putih + garis teal (sama seperti web)
        L.polyline(coords,{color:'#fff',weight:8,opacity:.8}).addTo(map);
        routeLayer=L.polyline(coords,{color:'#0d9488',weight:5,opacity:.9}).addTo(map);
        map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
        s.textContent=jarak+' km  ·  ~'+menit+' menit';
        setTimeout(()=>s.classList.add('hidden'),3500);
      }catch(e){
        gambarGariLurus();
      }
    }
    muatRute();

    // ── Panah turn-by-turn ───────────────────────────────────────
    const PANAH={
      'depart':'↑','straight':'↑','arrive':'🏁','merge':'↑',
      'turn-right':'↪','turn-left':'↩','turn-slight right':'↗','turn-slight left':'↖',
      'turn-sharp right':'↪','turn-sharp left':'↩','roundabout':'↻','continue':'↑',
    };
    function getArrow(step){
      const t=step?.maneuver?.type||'',m=step?.maneuver?.modifier||'';
      return PANAH[t+'-'+m]||PANAH[t]||'↑';
    }
    function fmtJarak(m){return m>=1000?(m/1000).toFixed(1)+' km':Math.round(m)+' m';}
    function fmtMenit(s){
      const j=Math.floor(s/3600),m=Math.round((s%3600)/60);
      return j>0?j+'j '+m+'mnt':(m<1?'< 1 mnt':'~'+m+' mnt');
    }

    // ── Live Navigation ──────────────────────────────────────────
    function startNavigation(){
      isNavigating=true;
      document.getElementById('nav-hud').classList.add('show');
      document.getElementById('nav-badge').classList.add('show');
    }
    function stopNavigation(){
      isNavigating=false;
      document.getElementById('nav-hud').classList.remove('show');
      document.getElementById('nav-badge').classList.remove('show');
    }

    let lastFetch=0;
    const THROTTLE=8000;

    async function fetchTurnByTurn(lat,lng){
      const now=Date.now();
      if(now-lastFetch<THROTTLE)return;
      lastFetch=now;
      try{
        const dest='${destinations.length > 0 ? destinations[0].longitude + ',' + destinations[0].latitude : startLng + ',' + startLat}';
        const coords=lng+','+lat+';'+dest;
        const res=await fetch(
          'https://router.project-osrm.org/route/v1/driving/'+coords+'?steps=true&overview=false',
          {signal:AbortSignal.timeout?AbortSignal.timeout(8000):undefined}
        );
        const data=await res.json();
        if(!data.routes?.[0])return;
        const route=data.routes[0];
        const steps=(route.legs[0]?.steps||[]).filter(s=>s.distance>10);
        const step=steps[0]||route.legs[0]?.steps?.[0];
        if(step){
          document.getElementById('nav-arrow').textContent=getArrow(step);
          document.getElementById('nav-instruksi-teks').textContent=step.name||'Lanjut terus';
          document.getElementById('nav-jarak-step').textContent='dalam '+fmtJarak(step.distance||0);
        }
        document.getElementById('nav-jarak-dest').textContent=fmtJarak(route.distance);
        document.getElementById('nav-waktu').textContent=fmtMenit(route.duration);
      }catch(e){}
    }

    function updateUserLocation(lat,lng,accuracy){
      const latlng=[lat,lng];
      if(!userMarker){
        userMarker=L.circleMarker(latlng,{
          radius:10,fillColor:'#1d4ed8',color:'#fff',
          weight:3,opacity:1,fillOpacity:1,
        }).addTo(map).bindPopup('Posisi Anda');
        if(accuracy){
          accuracyCircle=L.circle(latlng,{
            radius:accuracy,color:'#1d4ed8',
            fillColor:'#1d4ed8',fillOpacity:.07,weight:1,
          }).addTo(map);
        }
      }else{
        userMarker.setLatLng(latlng);
        if(accuracyCircle&&accuracy)accuracyCircle.setLatLng(latlng).setRadius(accuracy);
      }
      if(isNavigating){
        map.setView(latlng,Math.max(map.getZoom(),15),{animate:true,duration:.8});
        fetchTurnByTurn(lat,lng);
      }
    }

    // Update info destinasi di HUD
    function setNavDest(nama,stop){
      document.getElementById('nav-nama-dest').textContent=nama||'—';
      document.getElementById('nav-stop-info').textContent=stop||'—';
    }
  </script>
</body>
</html>`;
}
