// ====== CONFIG (replace with your real Firebase config in Step 4) ======
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ====== APP STATE ======
let map, markers = [];
let db;

// Expose init for Google Maps callback (called from index.html)
window._dogalertInit = async function _dogalertInit() {
  // Firebase
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  // Map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 51.0447, lng: -114.0719 }, // Calgary default
    zoom: 11
  });

  // Autocomplete search
  const input = document.getElementById("search");
  const ac = new google.maps.places.Autocomplete(input, { fields: ["geometry"] });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (place?.geometry?.location) {
      map.panTo(place.geometry.location);
      map.setZoom(13);
    }
  });

  // Click map to fill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  // UI handlers
  document.getElementById("submit").addEventListener("click", submitReport);
  document.getElementById("applyFilters").addEventListener("click", applyFilters);

  // Live pins
  subscribeToPins();
};

// Build query from filters
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
      const marker = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        title: `${d.type} • ${d.breed}`,
      });
      const info = new google.maps.InfoWindow({
        content: `
          <div style="min-width:220px">
            <strong>${escapeHTML(d.type)} • ${escapeHTML(d.breed)}</strong><br/>
            <small>${new Date(d.createdAt?.toDate?.() || d.createdAt).toLocaleString()}</small>
            <p style="margin:.5rem 0 0">${escapeHTML(d.desc || "")}</p>
          </div>
        `,
      });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
      markers.push(marker);
    });
  }, (err) => {
    console.error(err);
    setStatus("Live updates failed. Check Firestore rules and indexes.");
  });
}

function applyFilters() { subscribeToPins(); }

async function submitReport() {
  const type = document.getElementById("type").value.trim();
  const breed = document.getElementById("breed").value.trim();
  const desc = document.getElementById("desc").value.trim();
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!type || !breed || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    setStatus("Please set type, breed, and map location (click the map to fill lat/lng).");
    return;
  }

  try {
    await db.collection("reports").add({
      type, breed, desc, lat, lng,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setStatus("Report submitted. Appears on map instantly.");
    document.getElementById("desc").value = "";
  } catch (e) {
    console.error(e);
    setStatus("Submit failed. Check Firebase config and Firestore rules.");
  }
}

function setStatus(msg){ const el=document.getElementById("status"); if(el) el.textContent=msg; }
function clearMarkers(){ for (const m of markers) m.setMap(null); markers.length = 0; }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
