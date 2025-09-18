
// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
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

// ✅ Global initMap so Google callback works
window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.757, lng: -108.286 },
    zoom: 13,
    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
  });

  // click to set lat/lng
  map.addListener("click", (e) => {
    document.getElementById("latitude").value = e.latLng.lat().toFixed(6);
    document.getElementById("longitude").value = e.latLng.lng().toFixed(6);
  });

  loadPins();
};

// Submit report
document.getElementById("submitReport").addEventListener("click", async () => {
  const description = document.getElementById("description").value;
  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);
  const type = document.getElementById("typeFilter").value || "Unknown";
  const breed = document.getElementById("breedFilter").value || "Unknown";

  if (!description || isNaN(lat) || isNaN(lng)) {
    alert("Please add a description and click map to set location.");
    return;
  }

  await db.collection("sightings").add({
    description,
    type,
    breed,
    lat,
    lng,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Report submitted!");
  document.getElementById("description").value = "";
  document.getElementById("latitude").value = "";
  document.getElementById("longitude").value = "";
});

// Load pins
function loadPins() {
  db.collection("sightings").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      markers.forEach(m => m.setMap(null));
      markers = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const marker = new google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          map,
          title: `${data.type} - ${data.breed}`
        });

        const info = new google.maps.InfoWindow({
          content: `
            <div style="color:black;font-size:14px">
              <b>${data.type} - ${data.breed}</b><br>
              ${data.description}<br>
              ${data.timestamp ? data.timestamp.toDate().toLocaleString() : ""}
            </div>
          `
        });

        marker.addListener("click", () => {
          info.open(map, marker);
        });

        markers.push(marker);
      });
    });
}
