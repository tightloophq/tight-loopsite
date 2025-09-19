
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0MJBsX37dCTMP0pj0WMsMHR6__g_Wa-w",
  authDomain: "dog-alert-39ea0.firebaseapp.com",
  projectId: "dog-alert-39ea0",
  storageBucket: "dog-alert-39ea0.firebasestorage.app",
  messagingSenderId: "569616949041",
  appId: "1:569616949041:web:5c9d94b2002ada585fda10",
  measurementId: "G-KHZC80Y5T0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

const statusMap = document.getElementById("statusMap");
const statusDb  = document.getElementById("statusDb");
const statusPins= document.getElementById("statusPins");

const form = document.getElementById("reportForm");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const btnUseCenter = document.getElementById("btnUseCenter");
const btnUseGps = document.getElementById("btnUseGps");

let map, infoWindow;
let markers = new Map();

const ok  = (el, t) => { el.textContent = t; el.style.color = "#9be79b"; };
const bad = (el, t) => { el.textContent = t; el.style.color = "#ff9b9b"; };

function infoHTML(d){
  const when = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "just now";
  return `<div style="min-width:220px">
    <div style="font-weight:800;font-size:14px">${d.type}</div>
    <div style="font-size:12px;color:#9aa6b2;margin:4px 0 8px">${d.breed} • ${when}</div>
    <div style="font-size:14px;line-height:1.4">${(d.desc||"").replace(/</g,"&lt;")}</div>
    <div style="margin-top:8px;font-size:12px;color:#9aa6b2">(${Number(d.lat).toFixed(5)}, ${Number(d.lng).toFixed(5)})</div>
  </div>`;
}

// ✅ Attach globally for Google Maps callback
window.initDogAlert = () => {
  try {
    const defaultCenter = { lat: 51.0486, lng: -114.0708 };
    map = new google.maps.Map(document.getElementById("map"), {
      center: defaultCenter, zoom: 12,
      mapTypeControl:false, streetViewControl:false, fullscreenControl:false, clickableIcons:false
    });
    infoWindow = new google.maps.InfoWindow();
    ok(statusMap, "ready ✅");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos)=>map.setCenter({lat:pos.coords.latitude, lng:pos.coords.longitude}), ()=>{}
      );
    }

    map.addListener("click",(e)=>{
      latInput.value = e.latLng.lat().toFixed(6);
      lngInput.value = e.latLng.lng().toFixed(6);
    });
    btnUseCenter?.addEventListener("click",()=>{
      const c = map.getCenter(); if(!c) return;
      latInput.value = c.lat().toFixed(6);
      lngInput.value = c.lng().toFixed(6);
    });
    btnUseGps?.addEventListener("click",()=>{
      if(!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos)=>{
        latInput.value = pos.coords.latitude.toFixed(6);
        lngInput.value = pos.coords.longitude.toFixed(6);
        map.setCenter({lat:pos.coords.latitude, lng:pos.coords.longitude});
        map.setZoom(15);
      });
    });

    const ac = document.getElementById("placeSearch");
    ac?.addEventListener("gmpx-placechange",()=>{
      const p = ac.getPlace?.();
      if(p?.location){ map.panTo(p.location); map.setZoom(15); }
    });

    livePins();
  } catch (e){
    console.error("Map init failed:", e);
    bad(statusMap, "failed ❌");
  }
};

function livePins(){
  try {
    ok(statusDb, "connecting…");
    const qy = query(collection(db,"reports"), orderBy("createdAt","desc"));
    onSnapshot(qy, {
      next: (snap)=>{
        snap.docChanges().forEach((ch)=>{
          const id = ch.doc.id, d = ch.doc.data();
          if(!d) return;
          if(ch.type === "removed"){
            const f = markers.get(id);
            if(f){ f.marker.setMap(null); markers.delete(id); }
            return;
          }
          const pos = { lat:Number(d.lat), lng:Number(d.lng) };
          if(!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
          const html = infoHTML(d);
          if(!markers.get(id)){
            const marker = new google.maps.Marker({ position: pos, map, title: `${d.type}: ${d.breed}` });
            marker.addListener("click",()=>{ infoWindow.setContent(html); infoWindow.open({map, anchor: marker}); });
            markers.set(id, { marker, data:d });
          } else {
            const f = markers.get(id); f.data = d; f.marker.setPosition(pos);
          }
        });
        statusPins.textContent = String(markers.size);
        ok(statusDb, "connected ✅");
      },
      error: (err)=>{
        console.error("onSnapshot error:", err);
        bad(statusDb, `error ❌ ${err.code||""} ${err.message||""}`.trim());
      }
    });
  } catch (e){
    console.error("Live pins failed:", e);
    bad(statusDb, `failed ❌ ${e.message||e}`);
  }
}

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const type  = (document.getElementById("reportType")?.value || "Report").trim() || "Report";
  const breed = (document.getElementById("reportBreed")?.value || "Unknown").trim() || "Unknown";
  const desc  = document.getElementById("reportDesc")?.value.trim() || "";

  let lat = parseFloat(latInput.value);
  let lng = parseFloat(lngInput.value);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)){
    const c = map.getCenter(); lat = c.lat(); lng = c.lng();
  }

  const data = { type, breed, desc, lat, lng, createdAt: serverTimestamp() };

  const tempMarker = new google.maps.Marker({ position: {lat, lng}, map, title: `${type}: ${breed}` });
  tempMarker.addListener("click",()=>{
    infoWindow.setContent(infoHTML({ ...data, createdAt:{ toDate: ()=>new Date() } }));
    infoWindow.open({ map, anchor: tempMarker });
  });

  try{
    const ref = await addDoc(collection(db,"reports"), data);
    console.log("Report ID:", ref.id);
    form.reset(); latInput.value = ""; lngInput.value = "";
    ok(statusDb, "saved ✅");
  } catch(err){
    console.error("Add report failed:", err);
    bad(statusDb, `write error ❌ ${err.code||""} ${err.message||""}`.trim());
  }
});
