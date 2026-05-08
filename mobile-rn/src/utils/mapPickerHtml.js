export function buildMapPickerHtml(initialLat = -7.3274, initialLng = 108.2207) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; overflow:hidden; }
    #map { width:100%; height:100%; }

    #info {
      position:absolute; bottom:0; left:0; right:0; z-index:999;
      background:#fff; padding:14px 16px 20px;
      border-top-left-radius:16px; border-top-right-radius:16px;
      box-shadow:0 -4px 20px rgba(0,0,0,0.15);
    }
    #coords {
      font-size:13px; color:#546E7A; text-align:center;
      margin-bottom:12px; font-weight:500;
    }
    #hint {
      font-size:12px; color:#90A4AE; text-align:center;
      margin-bottom:10px;
    }
    #btn {
      width:100%; padding:14px; border:none; border-radius:12px;
      background:#1565C0; color:#fff; font-size:15px;
      font-weight:700; cursor:pointer; display:none;
    }
    #btn.visible { display:block; }

    .crosshair {
      position:absolute; top:50%; left:50%; z-index:998;
      transform:translate(-50%, -50%);
      width:40px; height:40px; pointer-events:none;
    }
    .crosshair::before, .crosshair::after {
      content:''; position:absolute; background:#1565C0;
    }
    .crosshair::before { width:2px; height:100%; left:50%; transform:translateX(-50%); }
    .crosshair::after  { height:2px; width:100%; top:50%; transform:translateY(-50%); }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="crosshair" id="crosshair"></div>
  <div id="info">
    <div id="hint">Tap pada peta untuk memilih titik awal</div>
    <div id="coords"></div>
    <button id="btn" onclick="pilihLokasi()">Gunakan Lokasi Ini</button>
  </div>

  <script>
    let selectedLat = null;
    let selectedLng = null;
    let marker = null;

    const map = L.map('map', { zoomControl: true }).setView([${initialLat}, ${initialLng}], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: '',
      html: '<div style="background:#1565C0;color:white;border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:14px;">A</div></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    map.on('click', function(e) {
      selectedLat = e.latlng.lat.toFixed(6);
      selectedLng = e.latlng.lng.toFixed(6);

      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng, { icon: markerIcon }).addTo(map);
      }

      document.getElementById('coords').textContent =
        'Lat: ' + selectedLat + '   Lng: ' + selectedLng;
      document.getElementById('btn').classList.add('visible');
      document.getElementById('hint').style.display = 'none';
    });

    function pilihLokasi() {
      if (!selectedLat || !selectedLng) return;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ lat: selectedLat, lng: selectedLng })
      );
    }
  </script>
</body>
</html>`;
}
