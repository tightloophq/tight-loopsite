
// ===== FIREBASE CONFIG (yours) =====
const firebaseConfig = {
  apiKey: "AIzaSyDmCfpAPHiPHjsrFnI7Uh_9XcB-FSfRba4",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0",
};

// ===== APP STATE =====
let map, markers = [];
let db;
let unsubscribe = null;

// expose init for Google Maps callback from index.html
window._dogalertInit = async function () {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  } catch (e) {
    console.error("Firebase init error", e);
  }

  // Map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5461, lng: -113.4938 }, // Edmonton default
    zoom: 12,
    mapTypeControl: true,
    streetViewControl: true
  });

  // Click map to fill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  // Try geolocation (green dot)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const you = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      new google.maps.Marker({
        position: you,
        map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: "#29f66f", fillOpacity: 1, strokeWeight: 0 }
      });
      map.setCenter(you);
      map.setZoom(14);
    });
  }

  // Wire UI
  document.getElementById("submit").addEventListener("click", submitReport);
  document.getElementById("apply").addEventListener("click", () => subscribeToPins(true));
  document.getElementById("search").addEventListener("keydown", onSearchEnter);

  // Initial live pins
  subscribeToPins(false);
};

// Build a query based on the ONE set of selects
function pinsQuery() {
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;

  let q = db.collection("reports");
  if (type) q = q.where("type", "==", type);
  if (breed) q = q.where("breed", "==", breed);

  // Avoid composite index requirement when filters are used:
  if (!type && !breed) {
    q = q.orderBy("createdAt", "desc").limit(500);
  } else {
    q = q.limit(500);
  }
  return q;
}

function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

function subscribeToPins(fromButton) {
  try {
    if (unsubscribe) unsubscribe();
    clearMarkers();

    unsubscribe = pinsQuery().onSnapshot(snap => {
      clearMarkers();
      snap.forEach(doc => {
        const d = doc.data();
        if (!d?.lat || !d?.lng) return;
        const m = new google.maps.Marker({
          position: { lat: Number(d.lat), lng: Number(d.lng) },
          map,
          title: `${d.type || "Unknown"} • ${d.breed || "Unknown"}`,
        });
        const info = new google.maps.InfoWindow({
          content: `
            <div style="max-width:220px">
              <b>${d.type || "Unknown"}</b> • ${d.breed || "Unknown"}<br/>
              <small>${d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : ""}</small>
              <p style="margin:6px 0 0">${(d.desc||"").replace(/</g,"&lt;")}</p>
            </div>`
        });
        m.addListener("click", () => info.open({ map, anchor: m }));
        markers.push(m);
      });
      console.log(`[pins] render count=${markers.length}`);
    }, err => {
      console.error("onSnapshot error:", err);
      if (fromButton) alert("Could not load pins (see console).");
    });
  } catch (e) {
    console.error("subscribeToPins failed:", e);
  }
}

async function submitReport() {
  const type  = document.getElementById("type").value || "";
  const breed = document.getElementById("breed").value || "";
  const desc  = document.getElementById("desc").value || "";
  const lat   = parseFloat(document.getElementById("lat").value);
  const lng   = parseFloat(document.getElementById("lng").value);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    alert("Click the map to fill latitude/longitude first.");
    return;
  }

  try {
    await db.collection("reports").add({
      type, breed, desc,
      lat, lng,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("[submit] ok");
    document.getElementById("desc").value = "";
    // keep filters + lat/lng so you can quickly add another at same spot
  } catch (e) {
    console.error("[submit] failed:", e);
    alert("Submit failed (see console).");
  }
}

function onSearchEnter(e) {
  if (e.key !== "Enter") return;
  const q = e.target.value.trim();
  if (!q) return;
  try {
    const svc = new google.maps.places.PlacesService(map);
    const req = { query: q, fields: ["name", "geometry"] };
    // Use Text Search via FindPlaceFromQuery fallback
    // Wrap in geocoder to be safe:
    new google.maps.Geocoder().geocode({ address: q }, (res, status) => {
      if (status === "OK" && res[0]?.geometry?.location) {
        const loc = res[0].geometry.location;
        map.setCenter(loc);
        map.setZoom(13);
      }
    });
  } catch(e) { console.error("search error", e); }
}
