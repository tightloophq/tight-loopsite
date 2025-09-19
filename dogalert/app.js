
// app.js - Dog Alert LIVE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
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

let map;
let markers = [];
let tempMarker = null;
let userMarker = null;

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.7575, lng: -108.2861 },
    zoom: 13,
  });

  document.getElementById("status-map").innerText = "ready ✅";

  // GPS green dot
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      userMarker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: "You are here",
        icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }
      });
    });
  }

  // Map click → set lat/lng and show blue temp marker
  map.addListener("click", (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    document.getElementById("lat").value = lat.toFixed(6);
    document.getElementById("lng").value = lng.toFixed(6);

    if (tempMarker) tempMarker.setMap(null);
    tempMarker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: "New report location",
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
    });
  });

  // Live Firestore pins
  const reportsRef = collection(db, "reports");
  onSnapshot(reportsRef, (snapshot) => {
    markers.forEach((m) => m.setMap(null));
    markers = [];
    let count = 0;

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.lat && d.lng) {
        const marker = new google.maps.Marker({
          position: { lat: d.lat, lng: d.lng },
          map,
          title: `${d.type} - ${d.breed}`,
        });

        const info = new google.maps.InfoWindow({
          content: `
            <div style="font-size:14px;">
              <b>Type:</b> ${d.type}<br>
              <b>Breed:</b> ${d.breed}<br>
              <b>Desc:</b> ${d.desc || "None"}<br>
              <b>When:</b> ${d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "just now"}
            </div>
          `
        });
        marker.addListener("click", () => info.open(map, marker));

        markers.push(marker);
        count++;
      }
    });

    document.getElementById("status-pins").innerText = count;
    document.getElementById("status-firestore").innerText = "connected ✅";
  });
};

// Report form
const form = document.getElementById("reportForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = document.getElementById("type").value || "Unknown";
    const breed = document.getElementById("breed").value || "Unknown";
    const desc = document.getElementById("desc").value || "";
    const lat = parseFloat(document.getElementById("lat").value) || map.getCenter().lat();
    const lng = parseFloat(document.getElementById("lng").value) || map.getCenter().lng();

    try {
      await addDoc(collection(db, "reports"), {
        type,
        breed,
        desc,
        lat,
        lng,
        createdAt: serverTimestamp(),
      });
      alert("Report submitted!");

      form.reset();
      if (tempMarker) { tempMarker.setMap(null); tempMarker = null; }
    } catch (err) {
      console.error("Error adding report:", err);
      document.getElementById("status-firestore").innerText = "save failed ❌";
    }
  });
}
