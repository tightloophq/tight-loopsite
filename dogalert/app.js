
// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2VhW6QuHIwEXeP1uB7ARYl-0J3OolOec",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let map;
let markers = [];
let userLocationMarker = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13
  });

  // Show user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      userLocationMarker = new google.maps.Marker({
        position: userPos,
        map,
        title: "You are here",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "green",
          fillOpacity: 1,
          strokeWeight: 1,
        },
      });
      map.setCenter(userPos);
    });
  }

  loadSightings();
}

function loadSightings() {
  db.collection("sightings").onSnapshot((snapshot) => {
    // Clear old markers
    markers.forEach(m => m.setMap(null));
    markers = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.lat && data.lng) {
        const marker = new google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          map,
          title: `${data.type} - ${data.breed}`
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="min-width:150px">
              <b>${data.type || "Unknown"} - ${data.breed || "Unknown"}</b><br>
              ${data.desc || ""}<br>
              <small>${new Date(data.timestamp?.seconds * 1000).toLocaleString()}</small>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        markers.push(marker);
      }
    });
  });
}

// Handle report form
document.getElementById("reportForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;
  const desc = document.getElementById("desc").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  db.collection("sightings").add({
    type,
    breed,
    desc,
    lat,
    lng,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  }).then(() => {
    alert("Sighting submitted!");
    document.getElementById("reportForm").reset();
  }).catch((err) => {
    console.error("Error adding sighting:", err);
  });
});
