
// app.js — Dog Alert (using Firestore `sightings` collection)

// ✅ Firebase config (your project)
const firebaseConfig = {
  apiKey: "AIzaSyD2VhW6QuHIwEXeP1uB7ARYl-0J3OolOec",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.firebasestorage.app",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

// ✅ Init Firebase + Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ✅ Global vars
let map;
let markers = [];

// Init map
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 51.0447, lng: -114.0719 }, // Calgary default
    zoom: 12,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
      { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ]
  });

  // ✅ Geolocation (green dot)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        new google.maps.Marker({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          map,
          title: "You are here",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "lime",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
        });
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => console.warn("Geolocation failed")
    );
  }

  // ✅ Click map to autofill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  // ✅ Real-time pin stream
  firebase.firestore().collection("sightings").onSnapshot((snapshot) => {
    markers.forEach((m) => m.setMap(null));
    markers = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.lat || !data.lng) return;

      const marker = new google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map,
        title: `${data.type} - ${data.breed}`,
      });

      const info = new google.maps.InfoWindow({
        content: `
          <strong>Type:</strong> ${data.type}<br>
          <strong>Breed:</strong> ${data.breed}<br>
          <strong>Description:</strong> ${data.desc || "None"}<br>
          <small>${data.lat}, ${data.lng}</small>
        `,
      });

      marker.addListener("click", () => info.open(map, marker));
      markers.push(marker);
    });
  });
}

// ✅ Submit form → Firestore
document.getElementById("submit").addEventListener("click", async () => {
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;
  const desc = document.getElementById("desc").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!lat || !lng) {
    alert("Click on the map to select a location first.");
    return;
  }

  try {
    await firebase.firestore().collection("sightings").add({
      type,
      breed,
      desc,
      lat,
      lng,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    alert("✅ Report submitted!");
    document.getElementById("desc").value = "";
    document.getElementById("lat").value = "";
    document.getElementById("lng").value = "";
  } catch (err) {
    console.error("Error adding report:", err);
    alert("❌ Failed to submit. Check console.");
  }
});

// ✅ Search box
document.getElementById("search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: e.target.value }, (results, status) => {
      if (status === "OK") {
        map.setCenter(results[0].geometry.location);
        map.setZoom(13);
      } else {
        alert("Geocode failed: " + status);
      }
    });
  }
});
