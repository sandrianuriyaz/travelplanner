// Peta dengan rute jalan nyata via OSRM + live navigation
export function buildMapHtml(startLat, startLng, destinations) {
  // Waypoints: start → dest1 → dest2 → ... → start (tertutup)
  const waypoints = [
    [startLat, startLng],
    ...destinations.map((d) => [d.latitude, d.longitude]),
    [startLat, startLng],
  ];

  // Format koordinat OSRM: lng,lat (dibalik dari Leaflet)
  const osrmCoords = waypoints.map((p) => `${p[1]},${p[0]}`).join(';');

  // Format waypoints untuk fallback garis lurus
  const straightLine = JSON.stringify(waypoints);

  // Marker destinasi
  const markersJs = destinations
    .map((d, i) => `
      L.marker([${d.latitude}, ${d.longitude}], {
        icon: L.divIcon({
          className: '',
          html: \`<div style="background:#FF6F00;color:#fff;border-radius:50%;width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
            border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${i + 1}</div>\`,
          iconSize:[32,32], iconAnchor:[16,16],
        })
      }).addTo(map).bindPopup('<b>${(d.nama || 'Destinasi ' + (i + 1)).replace(/'/g, "\\'")}</b>');
    `)
    .join('\n');

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
    html,body{width:100%;height:100%;overflow:hidden}
    #map{width:100%;height:100%}
    #status{
      position:absolute;top:10px;left:50%;transform:translateX(-50%);
      background:rgba(21,101,192,0.92);color:#fff;
      padding:6px 14px;border-radius:16px;font-size:12px;font-weight:600;
      z-index:999;white-space:nowrap;pointer-events:none;
    }
    #status.hidden{display:none}
    #nav-badge{
      display:none;position:absolute;top:10px;right:10px;
      background:#2E7D32;color:#fff;padding:6px 12px;
      border-radius:14px;font-size:12px;font-weight:700;z-index:999;
    }
    #nav-badge.show{display:block}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="status">Memuat rute...</div>
  <div id="nav-badge">Navigasi Aktif</div>

  <script>
    const map = L.map('map',{zoomControl:true}).setView([${centerLat},${centerLng}],12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap', maxZoom:19
    }).addTo(map);

    // Marker titik awal
    L.marker([${startLat},${startLng}],{
      icon: L.divIcon({
        className:'',
        html:'<div style="background:#1565C0;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px">🏠</div>',
        iconSize:[36,36],iconAnchor:[18,18],
      })
    }).addTo(map).bindPopup('<b>Titik Awal</b>');

    // Marker destinasi bernomor
    ${markersJs}

    let routeLayer = null;

    // ── Gambar rute garis lurus (fallback) ───────────────────────────────
    function gambarGariLurus(){
      if(routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.polyline(${straightLine},{
        color:'#1565C0', weight:4, opacity:0.7, dashArray:'8,6'
      }).addTo(map);
      map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
      document.getElementById('status').textContent='Rute estimasi (offline)';
      setTimeout(()=>document.getElementById('status').classList.add('hidden'),2500);
    }

    // ── Fetch rute nyata dari OSRM ────────────────────────────────────────
    async function muatRuteOSRM(){
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'Memuat rute jalan...';
      statusEl.classList.remove('hidden');

      try{
        const ctrl = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), 8000);

        const res = await fetch(
          'https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson',
          { signal: ctrl.signal }
        );
        clearTimeout(timer);

        if(!res.ok) throw new Error('OSRM error ' + res.status);
        const data = await res.json();

        if(data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Rute tidak ditemukan');

        // Konversi GeoJSON [lng,lat] → Leaflet [lat,lng]
        const coords = data.routes[0].geometry.coordinates.map(c => [c[1],c[0]]);
        const jarak  = (data.routes[0].distance / 1000).toFixed(1);
        const waktu  = Math.round(data.routes[0].duration / 60);

        if(routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(coords,{
          color:'#1565C0', weight:5, opacity:0.85
        }).addTo(map);

        map.fitBounds(routeLayer.getBounds(),{padding:[24,24]});
        statusEl.textContent = jarak + ' km  ·  ~' + waktu + ' menit';
        setTimeout(()=>statusEl.classList.add('hidden'), 3500);

      } catch(e){
        // Jika OSRM gagal, fallback ke garis lurus
        console.warn('OSRM gagal, pakai garis lurus:', e.message);
        gambarGariLurus();
      }
    }

    // Jalankan saat peta siap
    muatRuteOSRM();

    // ── Live Navigation ─────────────────────────────────────────────────────
    let userMarker = null;
    let accuracyCircle = null;
    let isNavigating = false;

    function startNavigation(){
      isNavigating = true;
      document.getElementById('nav-badge').classList.add('show');
    }

    function stopNavigation(){
      isNavigating = false;
      document.getElementById('nav-badge').classList.remove('show');
    }

    function updateUserLocation(lat, lng, accuracy){
      const latlng = [lat, lng];

      if(!userMarker){
        userMarker = L.circleMarker(latlng,{
          radius:10, fillColor:'#4285F4', color:'#fff',
          weight:3, opacity:1, fillOpacity:1,
        }).addTo(map).bindPopup('Posisi Anda');

        if(accuracy){
          accuracyCircle = L.circle(latlng,{
            radius:accuracy, color:'#4285F4',
            fillColor:'#4285F4', fillOpacity:0.08, weight:1,
          }).addTo(map);
        }
      } else {
        userMarker.setLatLng(latlng);
        if(accuracyCircle && accuracy) accuracyCircle.setLatLng(latlng).setRadius(accuracy);
      }

      if(isNavigating){
        map.setView(latlng, Math.max(map.getZoom(),15),{animate:true,duration:0.8});
      }
    }
  </script>
</body>
</html>`;
}
