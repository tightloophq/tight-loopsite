
// app.js - Dog Alert

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----------------------
// Firebase config
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyD2VhW6QuHIwEXeP1uB7ARYl-0J3OolOec",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------------------
// Map setup
// ----------------------
let map;
let markers = [];

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.7575, lng: -108.2861 }, // North Battleford default
    zoom: 13,
    mapId: "4504f8b37365c3d0",
  });

  // Firestore listener for live pins
  const reportsRef = collection(db, "reports");
  onSnapshot(
    reportsRef,
    (snapshot) => {
      clearMarkers();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lat && data.lng) {
          addMarker(data);
        }
      });

      updateStatus("firestore", "connected ✅");
      updateStatus("pins", snapshot.size);
    },
    (error) => {
      console.error("Error fetching reports:", error);
      updateStatus("firestore", "error ❌");
    }
  );
};

// ----------------------
// Marker helpers
// ----------------------
function addMarker(data) {
  const marker = new google.maps.Marker({
    position: { lat: data.lat, lng: data.lng },
    map,
    title: `${data.type || "Dog"} - ${data.breed || ""}`,
  });

  const info = new google.maps.InfoWindow({
    content: `
      <div style="font-size:14px;">
        <b>Type:</b> ${data.type || "N/A"}<br>
        <b>Breed:</b> ${data.breed || "N/A"}<br>
        <b>Desc:</b> ${data.desc || "None"}
      </div>
    `,
  });

  marker.addListener("click", () => {
    info.open(map, marker);
  });

  markers.push(marker);
}

function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}

// ----------------------
// Report form
// ----------------------
document
  .getElementById("reportForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = document.getElementById("type").value;
    const breed = document.getElementById("breed").value;
    const desc = document.getElementById("desc").value;
    const lat = parseFloat(document.getElementById("lat").value) || map.getCenter().lat();
    const lng = parseFloat(document.getElementById("lng").value) || map.getCenter().lng();

    try {
      const docRef = await addDoc(collection(db, "reports"), {
        type,
        breed,
        desc,
        lat,
        lng,
        createdAt: serverTimestamp(),
      });
      console.log("✅ Report saved:", docRef.id);
      updateStatus("firestore", "report saved ✅");
    } catch (error) {
      console.error("❌ Error saving report:", error);
      updateStatus("firestore", "save failed ❌");
    }
  });

// ----------------------
// Status helpers
// ----------------------
function updateStatus(id, text) {
  const el = document.getElementById("status-" + id);
  if (el) {
    el.innerText = text;
  } else {
    console.log(`[STATUS] ${id}: ${text}`);
  }
}
