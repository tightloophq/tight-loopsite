
// Firestore init (already set up in your project)
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

let map;

window.initMap = function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#212121" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "road", stylers: [{ color: "#383838" }] },
      { featureType: "water", stylers: [{ color: "#000000" }] }
    ]
  });

  // Click to set lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  loadPins();
};

// Load pins from Firestore in real time
function loadPins() {
  db.collection("sightings").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const marker = new google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          map: map,
          title: data.type + " - " + data.breed
        });
        const info = new google.maps.InfoWindow({
          content: `
            <div style="color:#000; font-size:14px;">
              <b>${data.type}</b> – ${data.breed}<br>
              ${data.desc || ""}<br>
              <small>${new Date(data.timestamp).toLocaleString()}</small>
            </div>`
        });
        marker.addListener("click", () => info.open(map, marker));
      }
    });
  });
}

// Report handler
document.getElementById("report").addEventListener("click", async () => {
  const desc = document.getElementById("desc").value;
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!lat || !lng) {
    alert("Click the map to set location");
    return;
  }

  await db.collection("sightings").add({
    desc,
    type,
    breed,
    lat,
    lng,
    timestamp: Date.now()
  });

  alert("Report submitted!");
});
