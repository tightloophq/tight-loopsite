
// dogalert/app.js – Dog Alert LIVE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Globals
let map;
let markers = [];
let tempMarker = null;
let userMarker = null;

// Status helpers
const setStatus = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
  else console.log(`[status:${id}] ${txt}`);
};

// Expose for Google Maps callback
window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.7575, lng: -108.2861 },
    zoom: 13
  });
  setStatus("status-map", "ready ✅");

  // GPS green dot
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      userMarker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: "You are here",
        icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }
      });
    });
  }

  // Click map → fill lat/lng + blue temp marker
  map.addListener("click", (e) => {
    const lat = e.latLng.lat(), lng = e.latLng.lng();
    document.getElementById("lat").value = lat.toFixed(6);
    document.getElementById("lng").value = lng.toFixed(6);
    if (tempMarker) tempMarker.setMap(null);
    tempMarker = new google.maps.Marker({
      position: { lat, lng }, map, title: "New report location",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
    });
  });

  // Live pins from Firestore
  const reportsRef = collection(db, "reports");
  onSnapshot(reportsRef, (snap) => {
    // reset markers
    markers.forEach(m => m.setMap(null)); markers = [];
    let count = 0;

    snap.forEach((doc) => {
      const d = doc.data();
      if (typeof d.lat !== "number" || typeof d.lng !== "number") return;

      const marker = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        title: `${d.type || "Report"} - ${d.breed || "Unknown"}`
      });

      const when = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "just now";
      const info = new google.maps.InfoWindow({
        content: `
          <div style="font-size:14px;min-width:220px">
            <div style="font-weight:800">${d.type || "Report"}</div>
            <div style="color:#98a2b3;font-size:12px;margin:4px 0">${d.breed || "Unknown"} • ${when}</div>
            <div>${(d.desc || "No description").replace(/</g,"&lt;")}</div>
            <div style="color:#98a2b3;font-size:12px;margin-top:6px">(${d.lat.toFixed(5)}, ${d.lng.toFixed(5)})</div>
          </div>`
      });
      marker.addListener("click", () => info.open(map, marker));

      markers.push(marker);
      count++;
    });

    setStatus("status-pins", String(count));
    setStatus("status-firestore", "connected ✅");
  });
};

// Submit form → save to Firestore
const form = document.getElementById("reportForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type  = document.getElementById("type").value || "Unknown";
    const breed = document.getElementById("breed").value || "Unknown";
    const desc  = document.getElementById("desc").value || "";
    const lat = parseFloat(document.getElementById("lat").value) || map.getCenter().lat();
    const lng = parseFloat(document.getElementById("lng").value) || map.getCenter().lng();

    try {
      await addDoc(collection(db, "reports"), {
        type, breed, desc, lat, lng, createdAt: serverTimestamp()
      });
      alert("Report submitted!");
      form.reset();
      if (tempMarker) { tempMarker.setMap(null); tempMarker = null; }
    } catch (err) {
      console.error("Save failed:", err);
      setStatus("status-firestore", "save failed ❌");
    }
  });
}
