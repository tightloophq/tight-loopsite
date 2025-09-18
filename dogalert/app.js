
// ---------- Firebase (compat) ----------
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.firebasestorage.app",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------- Globals ----------
let map;
let userMarker;
const markers = new Map(); // id -> marker

// ---------- Map init (Google callback) ----------
window.initMap = function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13,
    mapId: "c7b0c8f9d1a72f3e" // fine if you have one; otherwise ignored
  });

  // User geolocation (green dot)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userMarker = new google.maps.Marker({
          position: loc,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#00ff00",
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "#000"
          },
          title: "You are here"
        });
        map.setCenter(loc);
      },
      () => console.warn("Geolocation blocked")
    );
  }

  // Click map to fill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  // Simple search (press Enter)
  const search = document.getElementById("search");
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && search.value.trim()) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: search.value.trim() }, (results, status) => {
        if (status === "OK" && results[0]) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(13);
        }
      });
    }
  });

  // Load pins live
  subscribeToPins();
};

// ---------- Firestore live pins ----------
function makeInfoHtml(data) {
  const when = data.timestamp ? new Date(data.timestamp).toLocaleString() : "";
  const desc = (data.desc || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return `
    <div style="color:#000;font-size:14px;line-height:1.35;">
      <b>${data.type || "Unknown"}</b> – ${data.breed || "Unknown"}<br/>
      ${desc}<br/>
      <small>${when}</small>
    </div>
  `;
}

function subscribeToPins() {
  db.collection("sightings").orderBy("timestamp","desc").onSnapshot((snap) => {
    snap.docChanges().forEach((chg) => {
      const id = chg.doc.id;
      const data = chg.doc.data();

      if (chg.type === "removed") {
        const m = markers.get(id);
        if (m) { m.setMap(null); markers.delete(id); }
        return;
      }

      if (chg.type === "added" || chg.type === "modified") {
        // Create/update marker
        let marker = markers.get(id);
        const pos = { lat: data.lat, lng: data.lng };
        if (!marker) {
          marker = new google.maps.Marker({
            position: pos,
            map,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 4,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: "#000"
            },
            title: `${data.type || ""} - ${data.breed || ""}`
          });
          markers.set(id, marker);
        } else {
          marker.setPosition(pos);
        }

        const iw = new google.maps.InfoWindow({ content: makeInfoHtml(data) });
        marker.addListener("click", () => iw.open(map, marker));
      }
    });
  });
}

// ---------- Submit report ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("report").addEventListener("click", async () => {
    const desc  = document.getElementById("desc").value.trim();
    const type  = document.getElementById("type").value || "Loose";
    const breed = document.getElementById("breed").value || "Other";
    const lat   = parseFloat(document.getElementById("lat").value);
    const lng   = parseFloat(document.getElementById("lng").value);

    if (!lat || !lng) { alert("Click the map to set location first."); return; }

    await db.collection("sightings").add({
      desc, type, breed, lat, lng, timestamp: Date.now()
    });

    alert("Report submitted!");
    document.getElementById("desc").value = "";
  });

  // (Optional) filter button stub – wire your query if you want to filter markers
  document.getElementById("filterPins").addEventListener("click", () => {
    alert("Pins are live. Advanced filtering can be added later.");
  });
});
