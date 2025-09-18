
// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD2VhW6QuHIwEXeP1uB7ARYl-0J3OolOec",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let map;
let markers = [];

// Init map
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13,
  });

  // Click map to fill lat/lng
  map.addListener("click", (e) => {
    document.getElementById("lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("lng").value = e.latLng.lng().toFixed(6);
  });

  loadSightings();
}

// Submit report
document.getElementById("submitReport").addEventListener("click", async () => {
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;
  const desc = document.getElementById("desc").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!lat || !lng) {
    alert("Click the map to select a location.");
    return;
  }

  await db.collection("sightings").add({
    type,
    breed,
    desc,
    lat,
    lng,
    timestamp: new Date()
  });

  alert("Sighting submitted!");
});

// Load sightings live
function loadSightings() {
  db.collection("sightings").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    markers.forEach(m => m.setMap(null));
    markers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const marker = new google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map,
      });

      const info = new google.maps.InfoWindow({
        content: `
          <b>${data.type || "Unknown"} - ${data.breed || "Unknown"}</b><br/>
          ${data.desc || "No description"}<br/>
          <small>${data.timestamp?.toDate ? data.timestamp.toDate() : ""}</small>
        `
      });

      marker.addListener("click", () => info.open(map, marker));
      markers.push(marker);
    });
  });
}
