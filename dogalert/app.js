
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
    } catch (err) {
      console.error("Error adding report:", err);
    }
  });
}
