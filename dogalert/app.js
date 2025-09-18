
// -------- Firebase (already working project) --------
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// -------- Globals --------
let map, places, markers = [], openInfo;

// Make initMap global so Google can call it
window.initMap = function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13,
    styles: [{ featureType:"poi", stylers:[{visibility:"off"}]}]
  });

  // Places search
  const input = document.getElementById("searchBox");
  places = new google.maps.places.SearchBox(input);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const results = places.getPlaces?.() || [];
      if (results.length) map.fitBounds(results[0].geometry.viewport || new google.maps.LatLngBounds(results[0].geometry.location));
    }
  });

  // Click to set lat/lng
  map.addListener("click", (e) => {
    document.getElementById("latitude").value  = e.latLng.lat().toFixed(6);
    document.getElementById("longitude").value = e.latLng.lng().toFixed(6);
  });

  // UI hooks
  document.getElementById("filterBtn").addEventListener("click", renderPins);
  document.getElementById("submitReport").addEventListener("click", submitReport);

  // Live pins
  db.collection("sightings").orderBy("timestamp","desc").onSnapshot(() => renderPins());
  renderPins();
};

// -------- Submit a report --------
async function submitReport() {
  const description = document.getElementById("description").value.trim();
  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);
  const type  = document.getElementById("typeFilter").value || "Unknown";
  const breed = document.getElementById("breedFilter").value || "Unknown";

  if (!description || isNaN(lat) || isNaN(lng)) {
    alert("Add a description and click the map to set a location."); return;
  }

  await db.collection("sightings").add({
    description, type, breed, lat, lng,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("description").value = "";
  document.getElementById("latitude").value = "";
  document.getElementById("longitude").value = "";
  alert("Report submitted!");
}

// -------- Render pins with filters --------
async function renderPins() {
  const type  = document.getElementById("typeFilter").value;
  const breed = document.getElementById("breedFilter").value;

  markers.forEach(m => m.setMap(null));
  markers = [];

  let q = db.collection("sightings").orderBy("timestamp","desc").limit(300);
  const snap = await q.get();

  snap.forEach(doc => {
    const d = doc.data();
    if (type && d.type !== type) return;
    if (breed && d.breed !== breed) return;

    const marker = new google.maps.Marker({
      position: { lat: d.lat, lng: d.lng },
      map,
      title: `${d.type} - ${d.breed}`
    });

    const html = `
      <div class="iw">
        <b>${escapeHtml(d.type)} — ${escapeHtml(d.breed)}</b><br/>
        ${escapeHtml(d.description || "")}<br/>
        <span style="color:#555">${d.timestamp ? d.timestamp.toDate().toLocaleString() : ""}</span>
      </div>
    `;
    const iw = new google.maps.InfoWindow({ content: html });
    marker.addListener("click", () => {
      if (openInfo) openInfo.close();
      iw.open(map, marker);
      openInfo = iw;
    });

    markers.push(marker);
  });
}

// -------- Utilities --------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}
