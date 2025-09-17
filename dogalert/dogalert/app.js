// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDmCfpAPHiPHjsrFnI7Uh_9XcB-FSfRba4",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.appspot.com",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

// ===== APP STATE =====
let map, markers = [];
let db;

// Init Google Map
window._dogalertInit = async function () {
  // Firebase
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  // Map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5461, lng: -113.4938 }, // Edmonton default
    zoom: 12,
    styles: [{ elementType: "geometry", stylers: [{ color: "#212121" }] }]
  });

  // Try geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setCenter(userLoc);
        new google.maps.Marker({
          position: userLoc,
          map,
          title: "You are here",
          icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
        });
      },
      () => console.warn("Geolocation blocked")
    );
  }

  // UI handlers
  document.getElementById("submit").addEventListener("click", submitReport);
  document.getElementById("applyFilters").addEventListener("click", applyFilters);

  // Live pins
  subscribeToPins();
};

// Build query
function pinsQuery() {
  let q = db.collection("reports").orderBy("createdAt", "desc").limit(500);
  const type = document.getElementById("filterType").value;
  const breed = document.getElementById("filterBreed").value;
  if (type) q = q.where("type", "==", type);
  if (breed) q = q.where("breed", "==", breed);
  return q;
}

let unsubscribe = null;
function subscribeToPins() {
  if (unsubscribe) unsubscribe();
  clearMarkers();

  unsubscribe = pinsQuery().onSnapshot(snap => {
    clearMarkers();
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.lat || !d.lng) return;
      const marker = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        title: `${d.type} - ${d.breed}`
      });
      const infowindow = new google.maps.InfoWindow({
        content: `<b>${d.type}</b><br>${d.breed}<br>${d.description || ""}`
      });
      marker.addListener("click", () => infowindow.open(map, marker));
      markers.push(marker);
    });
  });
}

function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

// Submit report
async function submitReport() {
  const type = document.getElementById("type").value;
  const breed = document.getElementById("breed").value;
  const description = document.getElementById("description").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!lat || !lng) {
    alert("Please click the map to set a location.");
    return;
  }

  await db.collection("reports").add({
    type, breed, description, lat, lng,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Report submitted!");
}
