
// app.js – Dog Alert LIVE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====================
// Firebase Config
// ====================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====================
// Google Maps
// ====================
let map;

window.initDogAlert = function initDogAlert() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.7575, lng: -108.2861 },
    zoom: 13,
    mapId: "da4c6e8b0c4a5f77",
  });

  // Live pins from Firestore
  const reportsRef = collection(db, "reports");
  onSnapshot(reportsRef, (snapshot) => {
    document.getElementById("livePins").innerText = snapshot.size;

    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();

        // Use AdvancedMarkerElement instead of Marker
        const pin = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: data.lat, lng: data.lng },
          map,
          title: `${data.type} - ${data.breed}`,
        });

        // Optional click info
        pin.addListener("click", () => {
          alert(
            `Type: ${data.type}\nBreed: ${data.breed}\nDesc: ${data.desc || "N/A"}`
          );
        });
      }
    });
  });
};

// ====================
// Submit Report
// ====================
document
  .getElementById("reportForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = document.getElementById("type").value || "Unknown";
    const breed = document.getElementById("breed").value || "Unknown";
    const desc = document.getElementById("desc").value || "";
    const lat =
      parseFloat(document.getElementById("lat").value) ||
      map.getCenter().lat();
    const lng =
      parseFloat(document.getElementById("lng").value) ||
      map.getCenter().lng();

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
      alert("Report submitted successfully!");
    } catch (error) {
      console.error("❌ Error saving report:", error);
      alert("Error submitting report. Check console.");
    }
  });
