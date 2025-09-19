
// dogalert/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----------------- CONFIG -----------------
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
};

// ----------------- FIREBASE -----------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------------- MAP -----------------
let map;
let markers = [];
let tempMarker = null;

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.7575, lng: -108.2861 },
    zoom: 13,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    ],
  });

  document.getElementById("status-map").innerText = "ready ✅";

  // Click on map → set lat/lng and show a temp marker
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

  // Listen for Firestore changes
  const reportsRef = collection(db, "reports");
  onSnapshot(reportsRef, (snapshot) => {
    markers.forEach((m) => m.setMap(null));
    markers = [];

    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.lat && data.lng) {
        const marker = new google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          map,
          title: `${data.type} - ${data.breed}`,
        });
        markers.push(marker);
        count++;
      }
    });
    document.getElementById("status-pins").innerText = count;
  });

  document.getElementById("status-firestore").innerText = "connected ✅";
};

// ----------------- REPORT FORM -----------------
const form = document.getElementById("reportForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = document.getElementById("type").value;
    const breed = document.getElementById("breed").value;
    const desc = document.getElementById("desc").value;
    const lat = parseFloat(document.getElementById("lat").value) || map.getCenter().lat();
    const lng = parseFloat(document.getElementById("lng").value) || map.getCenter().lng();

    try {
      await addDoc(collection(db, "reports"), {
        type,
        breed,
        desc,
        lat,
        lng,
        createdAt: new Date(),
      });
      alert("Report submitted!");
      form.reset();

      // remove temp marker after submit
      if (tempMarker) {
        tempMarker.setMap(null);
        tempMarker = null;
      }
    } catch (err) {
      console.error("Error adding report:", err);
    }
  });
}
