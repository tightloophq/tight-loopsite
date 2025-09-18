
// ---- Firebase (modular) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config (your working project)
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

const form = document.getElementById("reportForm");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const btnUseCenter = document.getElementById("btnUseCenter");
const btnUseGps = document.getElementById("btnUseGps");

// ---- Map state ----
let map;
let infoWindow;
let markers = new Map(); // docId -> { marker, data }

function updateStatus(el, text, ok = true) { el.textContent = text; el.style.color = ok ? "#9be79b" : "#ff9b9b"; }

function createInfoHtml(d) {
  const when = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "just now";
  return `
    <div style="min-width:220px">
      <div style="font-weight:800; font-size:14px; margin-bottom:2px;">${d.type || "Report"}</div>
      <div style="font-size:12px; color:#9aa6b2; margin-bottom:8px;">${d.breed || "Unknown"} • ${when}</div>
      <div style="font-size:14px; line-height:1.4">${(d.desc || "").replace(/</g,"&lt;")}</div>
      <div style="margin-top:8px; font-size:12px; color:#9aa6b2;">(${Number(d.lat).toFixed(5)}, ${Number(d.lng).toFixed(5)})</div>
    </div>
  `;
}

// ---- Map init (called by Google via callback) ----
window.initDogAlert = function initDogAlert() {
  try {
    const defaultCenter = { lat: 51.0486, lng: -114.0708 }; // Calgary fallback
    map = new google.maps.Map(document.getElementById("map"), {
      center: defaultCenter, zoom: 12,
      mapTypeControl:false, streetViewControl:false, fullscreenControl:false, clickableIcons:false,
    });
    infoWindow = new google.maps.InfoWindow();
    updateStatus(statusMap, "ready ✅");

    // Geolocate (best-effort)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }

    // Optional helpers
    map.addListener("click", (e) => {
      latInput.value = e.latLng.lat().toFixed(6);
      lngInput.value = e.latLng.lng().toFixed(6);
    });
    btnUseCenter.addEventListener("click", () => {
      const c = map.getCenter(); if (!c) return;
      latInput.value = c.lat().toFixed(6);
      lngInput.value = c.lng().toFixed(6);
    });
    btnUseGps.addEventListener("click", () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        latInput.value = pos.coords.latitude.toFixed(6);
        lngInput.value = pos.coords.longitude.toFixed(6);
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(15);
      });
    });

    // NEW: PlaceAutocompleteElement
    const placeSearchEl = document.getElementById("placeSearch");
    if (placeSearchEl) {
      placeSearchEl.addEventListener("gmpx-placechange", () => {
        const selected = placeSearchEl.getPlace?.();
        if (selected?.location) {
          map.panTo(selected.location);
          map.setZoom(15);
        }
      });
    }

    // Start Firestore live pins
    livePins();
  } catch (err) {
    console.error("Map init failed:", err);
    updateStatus(statusMap, "failed ❌", false);
  }
};

// ---- Firestore live pins ----
function livePins() {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      let visibleCount = 0;
      snap.docChanges().forEach((ch) => {
        const id = ch.doc.id;
        const d = ch.doc.data();
        if (!d) return;

        if (ch.type === "removed") {
          const found = markers.get(id);
          if (found) { found.marker.setMap(null); markers.delete(id); }
          return;
        }

        const pos = { lat: Number(d.lat), lng: Number(d.lng) };
        if (Number.isNaN(pos.lat) || Number.isNaN(pos.lng)) return;

        const html = createInfoHtml(d);

        if (ch.type === "added" || !markers.get(id)) {
          const marker = new google.maps.Marker({
            position: pos, map, title: `${d.type || "Report"}: ${d.breed || "Unknown"}`
          });
          marker.addListener("click", () => { infoWindow.setContent(html); infoWindow.open({ map, anchor: marker }); });
          markers.set(id, { marker, data: d });
        } else {
          const found = markers.get(id);
          if (found) { found.data = d; found.marker.setPosition(pos); }
        }
      });

      // recount visible
      markers.forEach(() => { visibleCount++; });
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

// ---- Submit report (no map click required) ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("reportType").value.trim();
  const breed = document.getElementById("reportBreed").value.trim();
  const desc = document.getElementById("reportDesc").value.trim();

  // Get lat/lng from inputs OR map center
  let lat = parseFloat(latInput.value);
  let lng = parseFloat(lngInput.value);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const c = map.getCenter();
    lat = c.lat(); lng = c.lng();
  }

  if (!type || !breed) {
    alert("Please pick Type and Breed.");
    return;
  }

  const docData = { type, breed, desc, lat, lng, createdAt: serverTimestamp() };

  try {
    // Optimistic marker so you see it immediately
    const tempMarker = new google.maps.Marker({ position: { lat, lng }, map, title: `${type}: ${breed}` });
    tempMarker.addListener("click", () => {
      infoWindow.setContent(createInfoHtml({ ...docData, createdAt: { toDate: () => new Date() } }));
      infoWindow.open({ map, anchor: tempMarker });
    });

    await addDoc(collection(db, "reports"), docData);
    form.reset();
    // Keep coords empty to default to map center next time
    latInput.value = ""; lngInput.value = "";
  } catch (err) {
    console.error("Add report failed:", err);
    alert("Could not post report. Check console for details.");
  }
});
