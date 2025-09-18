
// ---- Firebase (modular) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Eric's config (from your working project)
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.firebasestorage.app",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- DOM ----
const statusMap = document.getElementById("statusMap");
const statusDb = document.getElementById("statusDb");
const statusPins = document.getElementById("statusPins");

const placeSearch = document.getElementById("placeSearch");
const typeFilter = document.getElementById("typeFilter");
const breedFilter = document.getElementById("breedFilter");

const form = document.getElementById("reportForm");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");

// ---- Map state ----
let map;
let infoWindow;
let markers = new Map(); // docId -> marker

// ---- Utilities ----
function updateStatus(el, text, ok = true) {
  el.textContent = text;
  el.style.color = ok ? "#9be79b" : "#ff9b9b";
}

function applyFilters(docData) {
  const t = typeFilter.value;
  const b = breedFilter.value;
  if (t && docData.type !== t) return false;
  if (b && docData.breed !== b) return false;
  return true;
}

function createInfoHtml(d) {
  const when = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "just now";
  return `
    <div style="min-width:220px">
      <div style="font-weight:800; font-size:14px; margin-bottom:2px;">${d.type || "Report"}</div>
      <div style="font-size:12px; color:#9aa6b2; margin-bottom:8px;">${d.breed || "Unknown"} • ${when}</div>
      <div style="font-size:14px; line-height:1.4">${(d.desc || "").replace(/</g,"&lt;")}</div>
      <div style="margin-top:8px; font-size:12px; color:#9aa6b2;">(${d.lat?.toFixed?.(5)}, ${d.lng?.toFixed?.(5)})</div>
    </div>
  `;
}

// ---- Map init ----
window.initDogAlert = async function initDogAlert() {
  try {
    const defaultCenter = { lat: 51.0486, lng: -114.0708 }; // Calgary fallback
    map = new google.maps.Map(document.getElementById("map"), {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    infoWindow = new google.maps.InfoWindow();
    updateStatus(statusMap, "ready ✅");

    // Geolocate user (best-effort)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // ignore errors silently
      );
    }

    // Place click -> populate lat/lng
    map.addListener("click", (e) => {
      latInput.value = e.latLng.lat().toFixed(6);
      lngInput.value = e.latLng.lng().toFixed(6);
    });

    // Places Autocomplete
    const ac = new google.maps.places.Autocomplete(placeSearch, {
      fields: ["geometry", "name", "formatted_address"]
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place?.geometry?.location) {
        map.panTo(place.geometry.location);
        map.setZoom(15);
      }
    });
  } catch (err) {
    console.error("Map init failed:", err);
    updateStatus(statusMap, "failed ❌", false);
  }
};

// Bind filters to redraw
[typeFilter, breedFilter].forEach(el => {
  el.addEventListener("change", () => {
    // Just toggle visibility of existing markers
    let visibleCount = 0;
    markers.forEach(({ data, marker }) => {
      const show = applyFilters(data);
      marker.setMap(show ? map : null);
      if (show) visibleCount++;
    });
    statusPins.textContent = String(visibleCount);
  });
});

// ---- Firestore live pins ----
async function livePins() {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      let visibleCount = 0;
      snap.docChanges().forEach((ch) => {
        const id = ch.doc.id;
        const d = ch.doc.data();
        if (ch.type === "removed") {
          const found = markers.get(id);
          if (found) {
            found.marker.setMap(null);
            markers.delete(id);
          }
          return;
        }
        // added or modified
        const pos = { lat: d.lat, lng: d.lng };
        if (!pos.lat || !pos.lng) return;

        const show = applyFilters(d);
        const html = createInfoHtml(d);

        if (ch.type === "added" || !markers.get(id)) {
          const marker = new google.maps.Marker({
            position: pos, map: show ? map : null,
            title: `${d.type || "Report"}: ${d.breed || "Unknown"}`
          });
          marker.addListener("click", () => {
            infoWindow.setContent(html);
            infoWindow.open({ map, anchor: marker });
          });
          markers.set(id, { marker, data: d });
        } else if (ch.type === "modified") {
          const found = markers.get(id);
          if (found) {
            found.data = d;
            found.marker.setPosition(pos);
          }
        }
      });

      // recount visible
      markers.forEach(({ data, marker }) => {
        const show = applyFilters(data);
        marker.setMap(show ? map : null);
        if (show) visibleCount++;
      });
      statusPins.textContent = String(visibleCount);
      updateStatus(statusDb, "connected ✅");
    }, (err) => {
      console.error("onSnapshot error:", err);
      updateStatus(statusDb, "error ❌", false);
    });
  } catch (err) {
    console.error("Live pins failed:", err);
    updateStatus(statusDb, "failed ❌", false);
  }
}

// ---- Submit report ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("reportType").value.trim();
  const breed = document.getElementById("reportBreed").value.trim();
  const desc = document.getElementById("reportDesc").value.trim();
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (!type || !breed || Number.isNaN(lat) || Number.isNaN(lng)) {
    alert("Please fill Type, Breed, and click the map to set a location.");
    return;
  }

  try {
    await addDoc(collection(db, "reports"), {
      type, breed, desc, lat, lng, createdAt: serverTimestamp()
    });
    form.reset();
  } catch (err) {
    console.error("Add report failed:", err);
    alert("Could not post report. Check console for details.");
  }
});

// ---- Boot ----
(function waitForMapsThenInit() {
  const check = () => {
    if (window.google && window.google.maps) {
      window.initDogAlert();
      livePins();
    } else {
      setTimeout(check, 100);
    }
  };
  check();
})();
