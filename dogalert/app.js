
// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDmCfpAPHiPHjsrFnI7Uh_9XcB-FSfRba4",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

// ===== APP STATE =====
let map, markers = [];
let db;

// Expose init for Google Maps callback
window._dogalertInit = async function () {
  // Firebase
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  // Map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5461, lng: -113.4938 }, // Edmonton default
    zoom: 12
  });

  // Click map to fill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  // UI events
  document.getElementById("submit").addEventListener("click", submitReport);
  document.getElementById("applyFilters").addEventListener("click", subscribeToPins);

  // Live pins
  subscribeToPins();

  // Geolocation (add "You are here" dot)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(c);
      map.setZoom(13);

      new google.maps.Marker({
        position: c,
        map,
        title: "You are here",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "lime",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "white"
        }
      });
    }, () => {});
  }
};

// ===== FIRESTORE QUERIES =====
function pinsQuery() {
  let q = db.collection("reports").orderBy("createdAt", "desc").limit(500);
  const type = document.getElementById("filterType").value;
  const breed = document.getElementById("filterBreed").value;
  if (type) q = q.where("type", "==", type);
  if (breed) q = q.where("breed", "==", breed);
  return q;
}

let unsubscribe = null;
function subscribeToPins() {
  if (unsubscribe) unsubscribe();
  clearMarkers();
  unsubscribe = pinsQuery().onSnapshot((snap) => {
    clearMarkers();
    snap.forEach((doc) => {
      const d = doc.data();
      if (!d?.lat || !d?.lng) return;
      const m = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        title: `${d.type} • ${d.breed}`
      });
      const info = new google.maps.InfoWindow({
        content: `<div><b>${escapeHTML(d.type)} • ${escapeHTML(d.breed)}</b><br>${escapeHTML(d.description||d.desc||"")}</div>`
      });
      m.addListener("click", () => info.open({ anchor: m, map }));
      markers.push(m);
    });
  }, console.error);
}

function clearMarkers() {
  for (const m of markers) m.setMap(null);
  markers.length = 0;
}

// ===== SUBMIT REPORT =====
async function submitReport() {
  const type = document.getElementById("type").value.trim();
  const breed = document.getElementById("breed").value.trim();
  const desc = (document.getElementById("desc") || document.getElementById("description"))?.value?.trim() || "";
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!type || !breed || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    alert("Pick type + breed and click the map to set location.");
    return;
  }

  await db.collection("reports").add({
    type,
    breed,
    desc,
    description: desc,
    lat,
    lng,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  alert("Report submitted.");
}

// ===== UTILS =====
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}
