

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  initializeFirestore,
  enableIndexedDbPersistence,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA36uwBk0FBDc6rI16BAsqUNe_AXLpv62Q",
  authDomain: "carniceriadonjose-48638.firebaseapp.com",
  projectId: "carniceriadonjose-48638",
  storageBucket: "carniceriadonjose-48638.appspot.com",
  messagingSenderId: "322531750471",
  appId: "1:322531750471:web:78e290c9c81eecc7be3762"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {});

enableIndexedDbPersistence(db).catch(err => {
  console.warn("⚠️ Persistencia offline no disponible:", err.code);
});

const storage = getStorage(app);



function getTiendaId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("tienda");
  if (fromUrl) {
    sessionStorage.setItem("tiendaId", fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem("tiendaId") || "MATES-GUAY";
}
const tiendaId = getTiendaId();
const el = (id) => document.getElementById(id);
document.getElementById("MATES-GUAY").textContent = tiendaId; // sigue funcionando tu encabezado :contentReference[oaicite:5]{index=5}

const productosRef = collection(db, "tiendas", tiendaId, "productos");
// ===============================
// ⚖️ Unidades por rubro de tienda
// ===============================
const UNIDADES_POR_RUBRO = {
  ropa: ["XS", "S", "M", "L", "XL", "XXL"],
  carniceria: ["Kg", "Grs", "Docena", "Unidad", "Porción"],
  verduleria: ["Kg", "Grs", "Bolsa", "Docena", "Unidad"],
  panaderia: ["Kg", "Grs", "Bolsa", "Docena", "Unidad"],
  rostiseria: ["Kg", "Grs", "Porcion", "Docena", "Unidad"],
  polleria: ["Kg", "Grs", "Unidad", "Pack"],
  kiosko: ["Unidad", "Kg", "Grs", "Pack", "Caja"],
  mates: ["Unidad", "Combo", "Set"],
  default: ["Unidad", "Kg", "Grs"]
};




// ===============================
// 🔐 Permisos/funcionalidades por plan
// ===============================
const FEATURES_BY_PLAN = {
  Basico: {
    maxProductos: 40,
    permitirPersonalizacion: false,   // Colores y título
    permitirEstadisticas: false,      // KPIs avanzadas / gráficos
    permitirDominioPropio: false
  },
  Profesional: {
    maxProductos: 100,
    permitirPersonalizacion: true,
    permitirEstadisticas: true,
    permitirDominioPropio: false
  },
  Premium: {
    maxProductos: Infinity,
    permitirPersonalizacion: true,
    permitirEstadisticas: true,
    permitirDominioPropio: true
  }
};

// Aplica UI/UX según plan
async function initPlanUI() {
  try {
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    const plan = configSnap.exists() ? (configSnap.data().plan || "Basico") : "Basico";
    const f = FEATURES_BY_PLAN[plan] || FEATURES_BY_PLAN.Basico;
    // 🟢 Mostrar panel de ventas si el plan es Premium
    if (plan === "Premium") {
      document.getElementById("btnRegistroClientes").style.display = "inline-block";
      await initVentasPremium(plan);
    } else {
      document.getElementById("btnRegistroClientes").style.display = "none";
      const panelVentas = document.getElementById("panel-ventas");
      if (panelVentas) panelVentas.style.display = "none";
    }


    // ===============================
    // 💼 Botón / Modal para cambiar plan
    // ===============================
    const btnContainer = document.getElementById("boton-cambiar-plan");
    const btnCambiar = document.getElementById("btnCambiarPlan");
    const modalCambiarPlan = document.getElementById("modalCambiarPlan");
    const btnSubirProfesional = document.getElementById("btnSubirProfesional");
    const btnSubirPremium = document.getElementById("btnSubirPremium");
    const btnCerrarModal = document.getElementById("btnCerrarModal");

    if (btnContainer && btnCambiar) {
      // Mostrar el botón solo si NO es Premium
      if (plan === "Basico" || plan === "Profesional") {
        btnContainer.style.display = "block";
      } else {
        btnContainer.style.display = "none";
      }

      // Abrir modal
      btnCambiar.onclick = () => {
        modalCambiarPlan.style.display = "block";
      };

      // Cerrar modal
      btnCerrarModal.onclick = () => {
        modalCambiarPlan.style.display = "none";
      };





      // Acción de cambio a Profesional
      btnSubirProfesional.onclick = async () => {
        const numeroWhatsApp = "5492644429646";
        const mensaje = encodeURIComponent(`Hola! Quiero actualizar mi plan ${plan} a Profesional en Vidriera Virtual.`);
        window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, "_blank");
        modalCambiarPlan.style.display = "none";

        // 📩 Registrar solicitud de cambio de plan
        const solicitudesRef = collection(db, "solicitudesCambioPlan");
        await addDoc(solicitudesRef, {
          tiendaId,
          planActual: plan,
          planSolicitado: "Profesional",
          fecha: new Date().toLocaleString("es-AR"),
          estado: "pendiente"
        });

        const mensajeConfirmacion = document.getElementById("mensaje-confirmacion-plan");
        if (mensajeConfirmacion) {
          mensajeConfirmacion.style.display = "block";
          mensajeConfirmacion.textContent = "✅ Solicitud enviada al SuperAdmin. Esperá su aprobación.";
          setTimeout(() => (mensajeConfirmacion.style.display = "none"), 6000);
        }
      };



      // Acción de cambio a Premium
      btnSubirPremium.onclick = async () => {
        const numeroWhatsApp = "5492644429649";
        const mensaje = encodeURIComponent(`Hola! Quiero actualizar mi plan ${plan} a Premium en Vidriera Virtual.`);
        window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, "_blank");
        modalCambiarPlan.style.display = "none";

        // 📩 Registrar solicitud de cambio de plan
        const solicitudesRef = collection(db, "solicitudesCambioPlan");
        await addDoc(solicitudesRef, {
          tiendaId,
          planActual: plan,
          planSolicitado: "Premium",
          fecha: new Date().toLocaleString("es-AR"),
          estado: "pendiente"
        });

        const mensajeConfirmacion = document.getElementById("mensaje-confirmacion-plan");
        if (mensajeConfirmacion) {
          mensajeConfirmacion.style.display = "block";
          mensajeConfirmacion.textContent = "✅ Solicitud enviada al SuperAdmin. Esperá su aprobación.";
          setTimeout(() => (mensajeConfirmacion.style.display = "none"), 6000);
        }
      };


    }


    // Header informativo
    const $plan = document.getElementById("plan-actual");
    const $beneficios = document.getElementById("plan-beneficios");
    if ($plan) $plan.textContent = `🪙 Plan actual: ${plan}`;
    // Mostrar/ocultar panel de estadísticas
    const panelEst = document.getElementById("panel-estadisticas");
    if (panelEst) {
      panelEst.style.display = f.permitirEstadisticas ? "block" : "none";
      if (f.permitirEstadisticas && typeof renderGraficoCategorias === "function") {
        // Renderizar gráfico después de cargar productos
        setTimeout(() => renderGraficoCategorias(window.productos || []), 1500);
      }
    }

    if ($beneficios) {
      $beneficios.innerHTML = [
        `• Límite de productos: ${f.maxProductos === Infinity ? "Ilimitado" : f.maxProductos}`,
        `• Personalización: ${f.permitirPersonalizacion ? "Habilitada" : "Bloqueada"}`,
        `• Estadísticas: ${f.permitirEstadisticas ? "Habilitadas" : "No incluidas"}`
      ].join(" — ");
    }

    // Bloquear/permitir campos de Configuración de tienda (admin.html)
    const idsPersonalizacion = [
      "tituloTienda", "colorHeaderTienda", "colorFooterTienda",
      "colorTituloTienda", "colorCarritoTienda", "colorTextoTienda"
    ];
    idsPersonalizacion.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !f.permitirPersonalizacion;
    });
    const btnGuardar = document.getElementById("btnGuardarConfig");
    if (btnGuardar) {
      btnGuardar.disabled = !f.permitirPersonalizacion;
      btnGuardar.title = f.permitirPersonalizacion
        ? ""
        : "Función disponible desde el plan Profesional";
    }
   const seccionConfig = document.getElementById("configuracion-tienda");
if (seccionConfig) {
  if (plan === "Basico") {
    seccionConfig.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <h3 style="color:#0b5ed7;">🔒 Función no disponible en el plan Básico</h3>
        <p style="color:#555;">Actualizá a Profesional o Premium para personalizar tu tienda.</p>
      </div>
    `;
  } else {
    seccionConfig.style.display = "block";  // 👉 ESTA ES LA LÍNEA QUE RESUELVE TU PROBLEMA
  }
}




    // Mensaje visual de límite (si querés reforzar)
    const msg = document.getElementById("mensaje-limite");
    if (msg) {
      msg.textContent = (f.maxProductos === Infinity)
        ? "✅ Tu catálogo es ilimitado."
        : `ℹ️ Tu plan permite hasta ${f.maxProductos} productos.`;
    }
  } catch (err) {
    console.warn("No se pudo inicializar UI por plan:", err);
  }
}

// 🚀 Sincronizar productos adicionales al cambiar de plan
// 🚀 Sincronizar productos según el plan (agregar o eliminar automáticamente)
async function sincronizarProductosPorPlan() {
  try {
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) return;

    const { plan, rubro } = configSnap.data();
    if (!rubro) {
      console.warn("⚠️ No se encontró rubro en la configuración de la tienda.");
      return;
    }

    // Obtener productos actuales
    const productosSnap = await getDocs(collection(db, "tiendas", tiendaId, "productos"));
    const productosExistentes = productosSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    const cantidadActual = productosExistentes.length;

    // Definir límite según plan
    let limite = 0;
    if (plan === "Basico") limite = 40;
    else if (plan === "Profesional") limite = 100;
    else if (plan === "Premium") limite = Infinity;

    // 🔍 Determinar la ruta correcta del JSON (según el archivo HTML actual)
    const basePath = window.location.pathname.includes("superadmin")
      ? "../plantillas"
      : "plantillas";
    const urlJson = `${basePath}/${rubro.toLowerCase()}.json`;

    // Cargar productos base desde la plantilla del rubro
    const response = await fetch(urlJson);
    if (!response.ok) {
      console.error("❌ No se pudo cargar la plantilla:", urlJson);
      return;
    }
    const productosBase = await response.json();

    // Loader visual
    const loader = document.createElement("div");
    loader.textContent = `⏳ Sincronizando productos según tu plan (${plan})...`;
    loader.style.cssText = `
      text-align:center;
      padding:20px;
      font-weight:bold;
      color:#0b5ed7;
      background:#eef5ff;
      border-radius:8px;
      margin:15px;
    `;
    document.body.appendChild(loader);

    // Comparar productos existentes vs plantilla
    const nombresExistentes = productosExistentes.map(p => p.nombre?.toLowerCase());
    let nuevosProductos = productosBase.filter(
      p => !nombresExistentes.includes(p.nombre.toLowerCase())
    );

    const productosRef = collection(db, "tiendas", tiendaId, "productos");

    // 🟢 Si el plan sube (menos productos actuales que el límite) → agregar faltantes
    if (cantidadActual < limite) {
      const disponibles = limite === Infinity ? nuevosProductos.length : limite - cantidadActual;
      const productosAgregar = nuevosProductos.slice(0, disponibles);

      for (const p of productosAgregar) {
        await addDoc(productosRef, p);
      }

      if (productosAgregar.length > 0) {
        console.log(`✅ Se agregaron ${productosAgregar.length} productos nuevos (${plan}).`);
        alert(`✅ Se agregaron ${productosAgregar.length} productos nuevos según tu plan ${plan}.`);
      } else {
        console.log("ℹ️ No había productos nuevos para agregar.");
      }
    }

    // 🔴 Si el plan baja (más productos de los permitidos) → eliminar sobrantes
    else if (cantidadActual > limite && limite !== Infinity) {
      const productosOrdenados = productosExistentes.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      const sobrantes = productosOrdenados.slice(limite); // los que sobran

      for (const prod of sobrantes) {
        await deleteDoc(doc(productosRef, prod.id));
      }

      console.log(`⚠️ Se eliminaron ${sobrantes.length} productos por cambio a plan ${plan}.`);
      alert(`⚠️ Tu plan ${plan} permite ${limite} productos. Se eliminaron ${sobrantes.length} productos sobrantes.`);
    }

    loader.remove();
    await mostrarProductos();

  } catch (error) {
    console.error("❌ Error al sincronizar productos por cambio de plan:", error);
    alert("❌ Error al sincronizar productos por cambio de plan. Revisá la consola.");
  }
}





// 🔑 FUNCIÓN LOGIN MANUAL
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("mensaje-error");

  try {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    const user = credencial.user;

    // 🔍 Validar si pertenece a esta tienda
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      error.textContent = "❌ Tu cuenta no está configurada correctamente.";
      signOut(auth);
      return;
    }

    const userData = userSnap.data();

    if (userData.tiendaId !== tiendaId) {
      error.textContent = "❌ No tenés permiso para ingresar a esta tienda.";
      signOut(auth);
      return;
    }

    // 🔓 Si todo OK, mostrar panel
    sessionStorage.setItem("loginManual", "true");
    document.getElementById("login-container").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";

    await cargarRubroTienda();
    await cargarCategorias();
    mostrarProductos();
    await initPlanUI();

    error.textContent = "";

  } catch (e) {
    console.error(e);
    error.textContent = "❌ Correo o contraseña incorrectos.";
  }
};

async function verificarPrimerAdmin() {
  try {
    const usuariosSnap = await getDocs(
      query(collection(db, "usuarios"), where("tiendaId", "==", tiendaId))
    );

    const yaHayAdmin = usuariosSnap.size > 0;

    const btnCrearCuenta = document.getElementById("btnCrearCuenta");

    if (btnCrearCuenta) {
      btnCrearCuenta.style.display = yaHayAdmin ? "none" : "block";
    }

  } catch (err) {
    console.error("Error verificando admins:", err);
  }
}



// 🔍 DETECCIÓN DE USUARIO LOGUEADO AL CARGAR

onAuthStateChanged(auth, async user => {
  const login = document.getElementById("login-container");
  const panel = document.getElementById("admin-panel");

  const loginManual = sessionStorage.getItem("loginManual");

  if (user && loginManual === "true") {
    login.style.display = "none";
    panel.style.display = "block";
    await cargarRubroTienda();
    await cargarCategorias(); // 🟢 AGREGAR AQUÍ TAMBIÉN
    mostrarProductos();
    await initPlanUI();



 } else {
  login.style.display = "block";
  panel.style.display = "none";
  verificarPrimerAdmin();   // 👈 AGREGADO
}

});

//  🚪 FUNCIÓN CERRAR SESIÓN

window.cerrarSesion = function () {
  sessionStorage.removeItem("loginManual");
  signOut(auth);
};

// 🔐 REGISTRO DE USUARIO CON TIENDA + FIRESTORE + ROL
window.registrarUsuario = async function () {
  const email = prompt("Ingresá un correo electrónico para el nuevo usuario:");
  const password = prompt("Ingresá una contraseña (mínimo 6 caracteres):");

  if (!email || !password) {
    alert("⚠ Debés poner un correo y contraseña.");
    return;
  }

  try {
    // 1️⃣ Crear usuario en Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // 2️⃣ Crear registro en Firestore
    const userRef = doc(db, "usuarios", uid);
    await setDoc(userRef, {
      email,
      tiendaId: tiendaId,   // 🟢 se guarda la tienda automáticamente
      rol: "admin",         // podés cambiar a "empleado"
      fechaRegistro: new Date().toISOString()
    });

    alert(`✅ Cuenta creada correctamente para:\n${email}\n\n📌 Asociada a la tienda: ${tiendaId}`);

  } catch (e) {
    console.error(e);
    alert("❌ Error al crear cuenta. " + e.message);
  }
};


let productos = [];
let productosOriginales = [];
let paginaActual = 1;
const productosPorPagina = 10;
window.productos = productos;



// 🏷️ Cargar rubro actual de la tienda
let rubroActual = "default";

async function cargarRubroTienda() {
  try {
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const data = configSnap.data();
      rubroActual = (data.rubro || "default").toLowerCase();
      console.log("🛍️ Rubro detectado:", rubroActual);
    } else {
      console.warn("⚠️ No se encontró config para esta tienda");
    }
  } catch (error) {
    console.error("❌ Error al cargar rubro:", error);
  }
}

//📦 MOSTRAR PRODUCTOS (CON CACHÉ)

async function mostrarProductos() {
  const l = document.getElementById("loader");
  if (l) l.style.display = "block";


  // Si hay productos cacheados en sessionStorage, mostralos primero
  const cache = sessionStorage.getItem("productosAdmin");
  if (cache) {
    productos = JSON.parse(cache);
    renderTabla();
    actualizarDashboard();
  }

  try {
    const productosSnap = await getDocs(collection(db, "tiendas", tiendaId, "productos"));
    productos = productosSnap.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      // 🔢 Ordenar los productos según el campo "orden" guardado en Firestore
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));



    productosOriginales = JSON.parse(JSON.stringify(productos));
    sessionStorage.setItem("productosAdmin", JSON.stringify(productos));
    renderTabla();
    actualizarDashboard();
  } catch (error) {
    alert("❌ Error al cargar los productos desde Firebase");
    console.error(error);
  } finally {
    document.getElementById("loader").style.display = "none";
  }

}


//  🔎 BÚSQUEDA EN TIEMPO REAL

document.getElementById("buscador-admin").addEventListener("input", function () {
  const texto = this.value.toLowerCase().trim();

  // 🧹 Limpia la tabla antes de volver a renderizar
  const tbody = document.querySelector("#tabla-productos tbody");
  if (tbody) tbody.innerHTML = "";

  // 🧩 Filtra evitando duplicados por nombre
  const filtrados = productos.filter((prod, index, self) =>
    (
      (prod.nombre || "").toLowerCase().includes(texto) ||
      (prod.categoria || "").toLowerCase().includes(texto) ||
      (prod.tipoVenta && prod.tipoVenta.toLowerCase().includes(texto))
    ) &&
    // evita mostrar el mismo producto dos veces si hay duplicado en el array
    index === self.findIndex(
      p => p.nombre && p.nombre.toLowerCase() === (prod.nombre || "").toLowerCase()
    )
  );

  // 🔁 Reinicia la paginación y muestra los resultados filtrados
  paginaActual = 1;
  renderTabla(filtrados, true);
});



// ✏️ EDITAR PRODUCTO

window.editar = function (index, campo, valor) {
  if (campo === 'precio' || campo === 'precioAnterior' || campo === 'descuento') {
    productos[index][campo] = valor === "" ? null : parseFloat(valor);

    const precio = parseFloat(productos[index].precio);
    const precioAnterior = parseFloat(productos[index].precioAnterior);
    const descuento = parseFloat(productos[index].descuento);

    const filas = document.querySelectorAll("#tabla-productos tbody tr");
    const fila = filas[index % 10]; // Solo para la página actual

    // Si escribís el descuento, calcular precioAnterior
    if (campo === 'descuento' && !isNaN(descuento) && !isNaN(precio) && descuento > 0 && descuento < 100) {
      const nuevoPrecioAnterior = Math.round(precio / (1 - descuento / 100));
      productos[index].precioAnterior = nuevoPrecioAnterior;

      // Actualizar visualmente el input de precioAnterior
      if (fila) {
        const inputPrecioAnterior = fila.querySelectorAll("td input")[2]; // índice 2 = precioAnterior
        if (inputPrecioAnterior) inputPrecioAnterior.value = nuevoPrecioAnterior;
      }
    }

    // Si escribís el precioAnterior, calcular descuento
    if (campo === 'precioAnterior' && !isNaN(precio) && !isNaN(precioAnterior) && precioAnterior > precio) {
      const nuevoDescuento = Math.round((1 - precio / precioAnterior) * 100);
      productos[index].descuento = nuevoDescuento;

      // Actualizar visualmente el input de descuento
      if (fila) {
        const inputDescuento = fila.querySelectorAll("td input")[3]; // índice 3 = descuento
        if (inputDescuento) inputDescuento.value = nuevoDescuento;
      }
    }

  } else {
    productos[index][campo] = valor;
  }
};

//    ➕ AGREGAR / GUARDAR PRODUCTO

// 🧩 CONTROL DE LÍMITE SEGÚN PLAN


window.agregarProducto = async function () {
  try {
    // Obtener el plan de la tienda desde Firestore
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    const plan = configSnap.exists() ? configSnap.data().plan : "Basico";


    // Definir límites según plan
    let limite = 0;
    if (plan === "Basico") limite = 40;
    else if (plan === "Profesional") limite = 100;
    else if (plan === "Premium") limite = Infinity;

    // Contar productos actuales
    const totalProductos = productos.length;

    // Validar límite
    if (totalProductos >= limite && limite !== Infinity) {
      alert(`🚫 Tu plan (${plan}) permite un máximo de ${limite} productos.\nActualizá tu plan para continuar.`);
      return;
    }

    // Si está dentro del límite, agregar producto normalmente
    productos.unshift({
      nombre: "",
      precio: 0,
      imagen: "",
      categoria: "Arroz",
      tipoVenta: "kg",
      id: null
    });
    renderTabla();

    // Mostrar contador visual (opcional)
    const contador = document.getElementById("total-productos");
    if (contador) contador.textContent = `${totalProductos + 1}`;
  } catch (error) {
    console.error("❌ Error al verificar el plan:", error);
    alert("No se pudo verificar el plan. Intentá nuevamente.");
  }
};


// 📋 RENDERIZAR TABLA DE PRODUCTOS (CORREGIDA Y OPTIMIZADA)
function renderTabla(lista = productos, filtrado = false) {
  const tbody = document.querySelector("#tabla-productos tbody");
  tbody.innerHTML = "";

  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = lista.slice(inicio, fin);

  productosPagina.forEach((prod, index) => {
    const fila = document.createElement("tr");
    fila.setAttribute("draggable", "true");
    fila.setAttribute("data-id", prod.id);
    fila.setAttribute("data-index-real", inicio + index);
    fila.addEventListener("dragstart", dragStart);
    fila.addEventListener("dragover", dragOver);
    fila.addEventListener("drop", drop);

    fila.innerHTML = `
      <td><input type="text" value="${prod.nombre || ''}" onchange="editar(${inicio + index}, 'nombre', this.value)"></td>

      <td><input type="number" value="${prod.precio ?? ''}" onchange="editar(${inicio + index}, 'precio', this.value)"></td>
      <td><input type="number" value="${prod.precioAnterior ?? ''}" onchange="editar(${inicio + index}, 'precioAnterior', this.value)"></td>
      <td><input type="number" value="${prod.descuento ?? ''}" onchange="editar(${inicio + index}, 'descuento', this.value)"></td>
      <td><input type="number" value="${prod.precioMayorista ?? ''}" onchange="editar(${inicio + index}, 'precioMayorista', this.value)"></td>
      <td><input type="number" value="${prod.unidadesPack ?? ''}" onchange="editar(${inicio + index}, 'unidadesPack', this.value)"></td>

      <td>
        <select id="categoria_${inicio + index}" onchange="editar(${inicio + index}, 'categoria', this.value)">
        </select>
      </td>

      <td>
        <!-- Cantidad -->
        <input type="number"
               value="${prod.cantidad || ''}"
               onchange="editar(${inicio + index}, 'cantidad', this.value)"
               style="width: 40px; text-align: center;"
               min="0" step="0.01">
      </td>

      <td>
        <!-- Tipo de venta (dinámico por rubro) -->
        <select onchange="editar(${inicio + index}, 'tipoVenta', this.value)" style="width: 80px;">
          ${((UNIDADES_POR_RUBRO[rubroActual] || UNIDADES_POR_RUBRO.default)
        .map(u => `<option value="${u}" ${prod.tipoVenta === u ? "selected" : ""}>${u}</option>`)
        .join(''))}
        </select>
      </td>

      <td>
        <!-- Imagen del producto -->
        <input type="text" value="${prod.imagen || ''}" onchange="editar(${inicio + index}, 'imagen', this.value)" style="width: 90%; margin-top: 5px; text-align: center;">
        <div style="text-align: center; margin-top: 5px;">
          ${prod.imagen
        ? `<a href="${prod.imagen}" target="_blank">
                 <img src="${prod.imagen}" style="max-width: 100px; border-radius:6px; cursor:pointer;">
               </a>`
        : '❌ Sin imagen'}
        </div>
      </td>

      <td><button onclick="eliminarProducto('${prod.id}', ${inicio + index})">🗑️ Eliminar</button></td>
      <td><input type="number" value="${prod.stock ?? 0}" onchange="editar(${inicio + index}, 'stock', this.value)"></td>
    `;

    // 🔸 Resaltar si el producto está bajo de stock
    if (prod.stock !== undefined && prod.stock < 5) {
      fila.classList.add("low-stock");
    }

    // 🟢 Cargar categorías disponibles
    // Dentro de renderTabla(), al llenar el select por fila:
    const selectCategoria = fila.querySelector(`#categoria_${inicio + index}`);
    if (selectCategoria) {
      (window.categoriasGlobales || [])
        .filter(cat => cat !== "Todos") // 👈 evitar “Todos” en selects
        .forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat;
          opt.textContent = cat;
          selectCategoria.appendChild(opt);
        });

      // Asignar la categoría guardada (si existe)
      if (prod.categoria) {
        // Si no existe en la lista, agregarla temporalmente para no perderla
        if (![...selectCategoria.options].some(o => o.value === prod.categoria)) {
          const opt = document.createElement("option");
          opt.value = prod.categoria;
          opt.textContent = prod.categoria;
          selectCategoria.appendChild(opt);
        }
        selectCategoria.value = prod.categoria;
      }
    }


    tbody.appendChild(fila);
  });


  // 🔸 Actualizar caché solo si no es filtrado
  if (!filtrado) {
    productosOriginales = JSON.parse(JSON.stringify(productos));
    sessionStorage.setItem("productosAdmin", JSON.stringify(productos));
  }

  renderPaginacion(lista);
}


// 📄 FUNCION DASHBOARD
function actualizarDashboard() {
  const total = productos.length;
  const bajoStock = productos.filter(p => p.stock !== undefined && p.stock > 0 && p.stock < 5).length;
  const sinStock = productos.filter(p => !p.stock || p.stock <= 0).length;

  document.getElementById("total-productos").textContent = total;
  document.getElementById("productos-bajo-stock").textContent = bajoStock;
  document.getElementById("productos-sin-stock").textContent = sinStock;
}

// Llamalo siempre que renderices la tabla
renderTabla = ((originalRenderTabla) => {
  return function (lista) {
    originalRenderTabla(lista);
    actualizarDashboard();
  };
})(renderTabla);

// 📄 RENDERIZAR PAGINACIÓN

function renderPaginacion(lista) {
  const totalPaginas = Math.ceil(lista.length / productosPorPagina);
  const contenedor = document.getElementById("paginacion");
  contenedor.innerHTML = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.style.margin = "5px";
    btn.style.backgroundColor = i === paginaActual ? "#4CAF50" : "#e0e0e0";
    btn.style.color = i === paginaActual ? "white" : "black";
    btn.onclick = () => {
      paginaActual = i;
      renderTabla(productos);
    };

    contenedor.appendChild(btn);
  }
}

// 🗑️ ELIMINAR PRODUCTO

window.eliminarProducto = async function (id) {
  if (confirm("¿Estás seguro de eliminar este producto?")) {
    await deleteDoc(doc(productosRef, id));
    await mostrarProductos();
  }
};

//➕ GUARDAR PRODUCTO

window.guardarProductos = async function () {
  sessionStorage.removeItem("productosAdmin");

  try {
    const operaciones = [];

    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      // 🚨 Validaciones antes de guardar
      if (!producto.nombre || producto.nombre.trim() === "") {
        alert(`❌ El producto #${i + 1} no tiene nombre.`);
        return;
      }
      if (!producto.precio || producto.precio <= 0) {
        alert(`❌ El producto "${producto.nombre}" debe tener un precio válido.`);
        return;
      }
      if (!producto.imagen || producto.imagen.trim() === "") {
        alert(`❌ El producto "${producto.nombre}" no tiene imagen.`);
        return;
      }


      // 🔹 Crear tipoVenta solo por compatibilidad
      let tipoVentaGenerado = "";
      if (producto.cantidad && producto.unidad) {
        tipoVentaGenerado = `${producto.cantidad} ${producto.unidad}`;
      }

      const data = {
        nombre: producto.nombre,
        precio: producto.precio,
        precioAnterior: producto.precioAnterior ?? null,
        descuento: producto.descuento ?? null,
        imagen: producto.imagen,
        categoria: producto.categoria,

        // 🔹 Guardar nuevos campos
        cantidad: producto.cantidad ?? null,
        unidad: producto.unidad ?? "",

        // 🔹 Mantener compatibilidad temporal
        tipoVenta: tipoVentaGenerado || null,

        precioMayorista: producto.precioMayorista ?? null,
        precioUnitario: producto.precioUnitario ?? null,
        unidadesPack: producto.unidadesPack ?? null,
        stock: producto.stock ?? 0,
        orden: i
      };

      if (!producto.id) {
        const docRef = await addDoc(productosRef, data);
        producto.id = docRef.id;
      } else {
        const original = productosOriginales.find(p => p.id === producto.id);
        if (
          !original ||
          original.nombre !== producto.nombre ||
          original.precio !== producto.precio ||
          original.precioAnterior !== producto.precioAnterior ||
          original.descuento !== producto.descuento ||
          original.imagen !== producto.imagen ||
          original.categoria !== producto.categoria ||
          original.cantidad !== producto.cantidad ||
          original.unidad !== producto.unidad ||
          original.precioUnitario !== producto.precioUnitario ||
          original.precioMayorista !== producto.precioMayorista ||
          original.unidadesPack !== producto.unidadesPack ||
          original.unidadesPack !== producto.unidadesPack ||
          original.stock !== producto.stock
        ) {
          const ref = doc(productosRef, producto.id);
          operaciones.push(updateDoc(ref, data));
        }
      }
    }
    if (operaciones.length === 0) {
      alert("No hay cambios para guardar.");
      return;
    }

    await Promise.all(operaciones);

    productosOriginales = JSON.parse(JSON.stringify(productos));

    alert("✅ Productos guardados correctamente.");
    localStorage.setItem("productosActualizados", Date.now());
    renderTabla();

  } catch (error) {
    console.error("❌ Error al guardar productos:", error);
    alert("❌ Error al guardar productos.");
  }
};


document.getElementById("MATES-GUAY").textContent = tiendaId; //cambiar para nuevas tiendas
let dragSrcEl = null;

//  🎯 DRAG & DROP PARA REORDENAR PRODUCTOS

// ===============================
// 🧩 DRAG & DROP — REORDENAMIENTO REAL
// ===============================
// ===============================
// 🧩 DRAG & DROP — FUNCIONES BASE
// ===============================
let dragIndex = null;

// Cuando empieza a arrastrar
function dragStart(e) {
  const fila = e.target.closest("tr");
  dragIndex = parseInt(fila.getAttribute("data-index-real"));
  fila.style.opacity = "0.5";
  e.dataTransfer.effectAllowed = "move";
}

// Cuando está arrastrando sobre otra fila
function dragOver(e) {
  e.preventDefault();

  const fila = e.target.closest("tr");
  if (!fila) return;

  fila.style.borderTop = "3px solid #007bff";

  setTimeout(() => {
    fila.style.borderTop = "none";
  }, 120);
}

// Cuando suelta encima de una fila
async function drop(e) {
  e.preventDefault();

  const filaDestino = e.target.closest("tr");
  if (!filaDestino) return;

  const indexDestino = parseInt(filaDestino.getAttribute("data-index-real"));

  // Reordenar array
  const productoMovido = productos.splice(dragIndex, 1)[0];
  productos.splice(indexDestino, 0, productoMovido);

  // Recalcular orden
  productos.forEach((p, i) => (p.orden = i));

  // Guardar en Firebase
  const batch = [];
  for (const p of productos) {
    if (!p.id) continue;
    const refProd = doc(db, "tiendas", tiendaId, "productos", p.id);
    batch.push(updateDoc(refProd, { orden: p.orden }));
  }

  await Promise.all(batch);

  sessionStorage.setItem("productosAdmin", JSON.stringify(productos));
  renderTabla();

  alert("Orden guardado correctamente");
}





// 👁️ MOSTRAR / OCULTAR CONTRASEÑA
function togglePassword() {
  const input = document.getElementById("password");
  input.type = input.type === "password" ? "text" : "password";
}
// ===============================
// ⚙️ CONFIGURACIÓN DE TIENDA
// ===============================


// Cargar configuración existente
async function cargarConfigTienda() {
  try {
    const refConfig = doc(db, "tiendas", tiendaId, "config", "datos");
    const snap = await getDoc(refConfig);
    if (!snap.exists()) return;
    const data = snap.data();

    // 🟦 Datos básicos
    document.getElementById("nombreTienda").value = data.nombre || "";
    document.getElementById("whatsappTienda").value = data.whatsapp || "";
    document.getElementById("direccionTienda").value = data.direccion || "";
    document.getElementById("horariosTienda").value = data.horarios || "";
    document.getElementById("colorHeaderTienda").value = data.colorHeader || "#007bff";
    document.getElementById("colorFooterTienda").value = data.colorFooter || "#222";
    document.getElementById("logoPreview").src = data.logo || "https://via.placeholder.com/150";

    // 🟢 NUEVOS CAMPOS
    document.getElementById("tituloTienda").value = data.titulo || "";
    document.getElementById("colorCarritoTienda").value = data.colorCarrito || "#ff6b00";
    document.getElementById("colorTextoTienda").value = data.colorTexto || "#333333";
    document.getElementById("colorTituloTienda").value = data.colorTitulo || "#000000";
    document.getElementById("mostrarCarritoTienda").checked = data.mostrarCarrito !== false;
    document.getElementById("estadoCarritoLabel").textContent = data.mostrarCarrito !== false ? "Activo" : "Oculto";


  } catch (error) {
    console.error("❌ Error al cargar la configuración:", error);
  }
}


// Guardar cambios
async function guardarConfigTienda() {
  try {
    const refConfig = doc(db, "tiendas", tiendaId, "config", "datos");

    // 🟦 Campos existentes
    const nombre = document.getElementById("nombreTienda").value.trim();
    const whatsapp = document.getElementById("whatsappTienda").value.trim();
    const direccion = document.getElementById("direccionTienda").value.trim();
    const horarios = document.getElementById("horariosTienda").value.trim();
    const colorHeader = document.getElementById("colorHeaderTienda").value;
    const colorFooter = document.getElementById("colorFooterTienda").value;
    const mostrarCarrito = document.getElementById("mostrarCarritoTienda").checked;


    // 🟢 NUEVOS CAMPOS
    const titulo = document.getElementById("tituloTienda").value.trim();
    const colorCarrito = document.getElementById("colorCarritoTienda").value;
    const colorTexto = document.getElementById("colorTextoTienda").value;
    const colorTitulo = document.getElementById("colorTituloTienda").value;


    // 🟦 Logo actual / nuevo / URL
    let logoUrl = document.getElementById("logoPreview").src;
    const logoUrlManual = document.getElementById("logoUrlTienda").value.trim();

    if (logoUrlManual) {
      try {
        new URL(logoUrlManual);
        if (
          !logoUrlManual.endsWith(".png") &&
          !logoUrlManual.endsWith(".jpg") &&
          !logoUrlManual.endsWith(".jpeg") &&
          !logoUrlManual.endsWith(".webp")
        ) {
          alert("⚠️ La URL del logo debe ser un enlace directo a una imagen (.png, .jpg, .jpeg o .webp)");
          return;
        }
        logoUrl = logoUrlManual;
      } catch {
        alert("❌ La URL del logo no es válida. Asegurate de que comience con https://");
        return;
      }
    } else {
      const logoFile = document.getElementById("logoTienda").files[0];
      if (logoFile) {
        const logoRef = ref(storage, `logos/${tiendaId}/${logoFile.name}`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }
    }

    // 🟩 Guardar todo en Firestore (incluye nuevos campos)
    await setDoc(refConfig, {
      nombre,
      whatsapp,
      direccion,
      horarios,
      colorHeader,
      colorFooter,
      colorCarrito,
      colorTexto,
      colorTitulo,
      titulo,
      logo: logoUrl,
      mostrarCarrito
    }, { merge: true });


    alert("✅ Configuración actualizada correctamente");
    document.getElementById("logoPreview").src = logoUrl;

  } catch (e) {
    console.error("Error al guardar configuración:", e);
    alert("⚠️ Error al guardar la configuración");
  }
}
// ===============================
// 📊 FUNCIÓN DE GRÁFICO (solo Profesional / Premium)
// ===============================
function renderGraficoCategorias(productos) {
  const contenedor = document.getElementById("panel-estadisticas");
  if (!contenedor) return;
  const canvas = document.getElementById("grafico-categorias");

  // Agrupar productos por categoría
  const categorias = {};
  productos.forEach(p => {
    const cat = p.categoria || "Sin categoría";
    categorias[cat] = (categorias[cat] || 0) + 1;
  });

  const labels = Object.keys(categorias);
  const data = Object.values(categorias);

  // Destruir gráfico previo si existe
  if (window.chartCategorias) {
    window.chartCategorias.destroy();
  }

  window.chartCategorias = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Cantidad de productos",
        data,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// ===============================
// 🏷️ GESTIÓN DE CATEGORÍAS SINCRONIZADA
// ===============================
async function cargarCategorias() {
  // 🏷️ Categorías predeterminadas por rubro
  const CATEGORIAS_POR_RUBRO = {
    carniceria: ["Todos", "Carne", "Cerdo", "Pollo", "Embutidos", "Achuras", "Ofertas"],
    verduleria: ["Todos", "Frutas", "Verduras", "Hortalizas", "Hierbas", "Ofertas"],
    panaderia: ["Todos", "Panes", "Facturas", "Bizcochos / Galletas", "Tartas", "Masas Finas", "Masas Secas", "Especiales", "Salados", "Ofertas"],
    rostiseria: ["Todos", "Rotisería", "Minutas", "Pastas", "Empanadas", "Guarniciones", "Pizzas", "Bebidas", "Ofertas"],
    polleria: ["Todos", "Pollo", "Preparados", "Menudencias", "Congelado", "Ofertas"],
    kiosko: ["Todos", "Golosinas", "Bebidas", "Snacks", "Cigarrillos", "Lácteos", "Almacen", "Limpieza", "Ofertas"],
    ropa: ["Todos", "Hombre", "Mujer", "Niños", "Accesorios", "Ofertas"],
    mates: ["Todos", "Mates", "Bombillas", "Termos", "Combos", "Ofertas"]
  };

  const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");
  const catSnap = await getDoc(catRef);

  let categorias = [];
  if (catSnap.exists()) {
    categorias = catSnap.data().lista || [];
  } else {
    // 🔹 Si no existen categorías en Firestore, intentar usar el rubro de la tienda
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    const rubro = configSnap.exists() ? configSnap.data().rubro : "";

    if (rubro && CATEGORIAS_POR_RUBRO[rubro]) {
      categorias = CATEGORIAS_POR_RUBRO[rubro];
    } else {
      categorias = ["Todos", "General"];
    }

    await setDoc(catRef, { lista: categorias });
  }


  window.categoriasGlobales = categorias; // ✅ agregado
  renderCategorias(categorias);
  actualizarSelectsCategoria(categorias);
}


function renderCategorias(categorias) {
  const cont = document.getElementById("lista-categorias");
  cont.innerHTML = "";

  categorias.forEach(cat => {
    const span = document.createElement("span");
    span.textContent = cat;
    span.style.background = "#e0e7ff";
    span.style.padding = "6px 10px";
    span.style.borderRadius = "8px";
    span.style.cursor = "pointer";
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.gap = "6px";

    // ✏️ Renombrar categoría con doble clic
    span.ondblclick = async () => {
      const nuevoNombre = prompt("✏️ Nuevo nombre para la categoría:", cat);
      if (nuevoNombre && nuevoNombre.trim() !== "") {
        const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");
        const catSnap = await getDoc(catRef);
        if (catSnap.exists()) {
          const lista = catSnap.data().lista.map(c => (c === cat ? nuevoNombre.trim() : c));
          await setDoc(catRef, { lista }); // Actualiza lista visible (chips + selects)

          // 🔁 MIGRAR productos que tenían la categoría vieja -> nueva
          const q = await getDocs(
            query(collection(db, "tiendas", tiendaId, "productos"), where("categoria", "==", cat))
          );
          const updates = [];
          q.forEach(d => {
            updates.push(updateDoc(doc(db, "tiendas", tiendaId, "productos", d.id), {
              categoria: nuevoNombre.trim()
            }));
          });
          await Promise.all(updates);

          renderCategorias(lista);
          actualizarSelectsCategoria(lista);
          mostrarConfirmacionCategorias();
        }
      }
    };

    // ❌ Eliminar
    const btnDel = document.createElement("button");
    btnDel.textContent = "✖";
    btnDel.style.border = "none";
    btnDel.style.background = "transparent";
    btnDel.style.cursor = "pointer";
    btnDel.onclick = async () => {
      if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return;
      const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");
      const catSnap = await getDoc(catRef);
      if (catSnap.exists()) {
        const lista = catSnap.data().lista.filter(c => c !== cat);
        await setDoc(catRef, { lista });

        // 🔁 REASIGNAR productos que tenían la categoría eliminada
        const q = await getDocs(
          query(collection(db, "tiendas", tiendaId, "productos"), where("categoria", "==", cat))
        );
        const updates = [];
        q.forEach(d => {
          updates.push(updateDoc(doc(db, "tiendas", tiendaId, "productos", d.id), {
            categoria: "Sin categoría"
          }));
        });
        await Promise.all(updates);

        renderCategorias(lista);
        actualizarSelectsCategoria(lista);
        mostrarConfirmacionCategorias();
      }
    };


    span.appendChild(btnDel);
    cont.appendChild(span);
  });
}

document.getElementById("btnAgregarCategoria").addEventListener("click", async () => {
  const input = document.getElementById("nuevaCategoria");
  const nueva = input.value.trim();
  if (!nueva) return;

  const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");
  const catSnap = await getDoc(catRef);
  let lista = catSnap.exists() ? catSnap.data().lista || [] : [];

  if (!lista.includes(nueva)) {
    lista.push(nueva);
    await setDoc(catRef, { lista });
    renderCategorias(lista);
    actualizarSelectsCategoria(lista);
    mostrarConfirmacionCategorias();
  } else {
    alert("⚠️ Esa categoría ya existe.");
  }
  input.value = "";
});

// ✅ Actualizar todos los <select> de categoría en la tabla
function actualizarSelectsCategoria(categorias) {
  const selects = document.querySelectorAll('select[id^="categoria_"]');
  selects.forEach(select => {
    const valorActual = select.value;
    select.innerHTML = ""; // limpiar

    // 🚫 Excluir "Todos" de los selects de producto
    const opciones = categorias.filter(c => c !== "Todos");

    // Si el producto tenía una categoría que ya no está (p.ej. renombrando),
    // la agregamos temporalmente para no dejar el select vacío.
    const debeIncluirActual = valorActual && !opciones.includes(valorActual);
    const listaParaSelect = debeIncluirActual ? [...opciones, valorActual] : opciones;

    listaParaSelect.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    // Restaurar el valor previo si existe; si no, dejar primera opción
    if (valorActual && listaParaSelect.includes(valorActual)) {
      select.value = valorActual;
    }
  });
}


// ✅ Mostrar mensaje animado de confirmación
function mostrarConfirmacionCategorias() {
  const msg = document.getElementById("mensaje-confirmacion-categorias");
  if (!msg) return;
  msg.style.display = "block";
  msg.style.animation = "none";
  void msg.offsetWidth; // reiniciar animación
  msg.style.animation = "fadeInOut 3s ease-in-out forwards";
  setTimeout(() => (msg.style.display = "none"), 3000);
}


document.getElementById("btnGuardarConfig").addEventListener("click", guardarConfigTienda);

// Cargar datos al iniciar
cargarConfigTienda();

// 🧠 Sincronización automática si se abre con ?sync=1
window.addEventListener("load", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("sync") === "1") {
    console.log("⚙️ Modo sincronización automática detectado...");
    await sincronizarProductosPorPlan();
  }
});


// 🎯 Desplazar hacia la sección "Configuración de la Tienda"
document.getElementById("btnConfigTienda").addEventListener("click", () => {
  const seccion = document.getElementById("configuracion-tienda");
  if (seccion) {
    seccion.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// =========================================================
// 💵 REGISTRO DE VENTAS Y CIERRE DE CAJA (solo Plan Premium)
// =========================================================
async function initVentasPremium(plan) {
  const panelVentas = document.getElementById("panel-ventas");
  if (!panelVentas) return;

  if (plan !== "Premium") {
    panelVentas.style.display = "none";
    return;
  }

  panelVentas.style.display = "block";

  const ventasRef = collection(db, "tiendas", tiendaId, "ventas");
  const cierresRef = collection(db, "tiendas", tiendaId, "cierresCaja");
  const cuerpoTabla = document.querySelector("#tablaVentas tbody");
  const totalCaja = document.getElementById("totalCaja");
  const inputProducto = document.getElementById("productoVendido");
  const inputMonto = document.getElementById("montoVenta");
  let totalDia = 0;

  // ===============================
  // 🔹 Cargar lista de productos del catálogo (autocompletado)
  // ===============================
  const listaProductos = document.getElementById("listaProductos");
  const productosSnap = await getDocs(collection(db, "tiendas", tiendaId, "productos"));
  const productosCatalogo = [];
  productosSnap.forEach(doc => {
    const data = doc.data();
    if (data.nombre && data.precio) {
      productosCatalogo.push({ id: doc.id, nombre: data.nombre, precio: data.precio });
    }
  });

  listaProductos.innerHTML = productosCatalogo.map(p => `<option value="${p.nombre}"></option>`).join("");
  inputProducto.addEventListener("change", () => {
    const seleccionado = productosCatalogo.find(p => p.nombre === inputProducto.value);
    if (seleccionado) {
      inputMonto.value = seleccionado.precio;
    }
  });



// ===============================
// 📅 Filtrar SOLO ventas del día actual
// ===============================
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

const inicioDia = hoy;
const finDia = new Date();
finDia.setHours(23, 59, 59, 999);

const qHoy = query(
  ventasRef,
  where("timestamp", ">=", inicioDia),
  where("timestamp", "<=", finDia)
);

const ventasSnap = await getDocs(qHoy);

cuerpoTabla.innerHTML = "";
totalDia = 0;

ventasSnap.forEach(v => {
  const data = v.data();
  totalDia += data.monto;
  agregarFilaVenta(v.id, data.producto, data.monto, data.fecha);
});

totalCaja.textContent = `Total del día: $${totalDia.toFixed(2)}`;



  // ===============================
  // ➕ Registrar nueva venta
  // ===============================
  document.getElementById("btnRegistrarVenta").onclick = async () => {
    const producto = inputProducto.value.trim();
    const monto = parseFloat(inputMonto.value);

    if (!producto || isNaN(monto) || monto <= 0) {
      alert("Por favor completá los datos correctamente.");
      return;
    }

    const docRef = await addDoc(ventasRef, {
      producto,
      monto,
      fecha: new Date().toLocaleString("es-AR"),
      timestamp: serverTimestamp()
    });

    totalDia += monto;
    totalCaja.textContent = `Total del día: $${totalDia.toFixed(2)}`;
    agregarFilaVenta(docRef.id, producto, monto, new Date().toLocaleDateString());

    inputProducto.value = "";
    inputMonto.value = "";
  };

  // ===============================
  // 🗑️ Eliminar venta (y actualizar total)
  // ===============================
  function agregarFilaVenta(id, producto, monto, fecha) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${fecha}</td>
      <td>${producto}</td>
      <td>$${monto}</td>
      <td>
        <button style="background:#dc3545;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;"
          onclick="eliminarVenta('${id}', ${monto})">🗑️</button>
      </td>
    `;
    cuerpoTabla.appendChild(fila);
  }

  // ✅ Función global para eliminar
  window.eliminarVenta = async (id, monto) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    await deleteDoc(doc(ventasRef, id));
    totalDia -= monto;
    if (totalDia < 0) totalDia = 0;
    totalCaja.textContent = `Total del día: $${totalDia.toFixed(2)}`;
    cuerpoTabla.innerHTML = ""; // limpiar y recargar
    initVentasPremium(plan);
  };

  

  // ===============================
  // 📦 Cierre de caja profesional con PDF completo
  // ===============================
  document.getElementById("btnCierreCaja").onclick = async () => {
    if (!confirm("¿Confirmás el cierre de caja? Se guardará el total y se generará un PDF profesional.")) return;

    // 🧾 Guardar cierre en Firestore
    await addDoc(cierresRef, {
      totalDia,
      fecha: new Date().toLocaleString("es-AR"),
      timestamp: serverTimestamp()
    });

    const egresos = parseFloat(prompt("💸 Ingresá el total de egresos (si no hay, poné 0):", "0")) || 0;
    const observaciones = prompt("📝 Observaciones del día (opcional):", "") || "";
    const saldoFinal = totalDia - egresos;


    // 🧠 Generar PDF profesional
    try {
      const { jsPDF } = window.jspdf;
      const docPDF = new jsPDF("p", "mm", "a4");

      const nombreTienda = tiendaId || "Mi Tienda";
      const fechaCierre = new Date().toLocaleString("es-AR");
      const cajero = auth.currentUser?.email || "Administrador";

      // ===============================
      // 🎨 ESTILO Y CONFIGURACIÓN
      // ===============================
      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(40, 40, 40);
      const azulSuave = [0, 102, 204];
      const grisSuave = [150, 150, 150];

      // ===============================
      // 🏷️ ENCABEZADO
      // ===============================
      docPDF.setFontSize(20);
      docPDF.setFont("helvetica", "bold");
      docPDF.setTextColor(...azulSuave);
      docPDF.text(`Cierre de Caja — ${nombreTienda}`, 105, 20, { align: "center" });

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(12);
      docPDF.setTextColor(60, 60, 60);
      docPDF.text(`Fecha: ${fechaCierre}`, 105, 28, { align: "center" });
      docPDF.text(`Cajero: ${cajero}`, 105, 34, { align: "center" });

      docPDF.setDrawColor(...grisSuave);
      docPDF.line(14, 40, 196, 40);

      // ===============================
      // 💵 DETALLE DE VENTAS
      // ===============================
      let y = 50;
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(13);
      docPDF.setTextColor(...azulSuave);
      docPDF.text("Detalle de Ventas", 14, y);
      y += 6;

      docPDF.setTextColor(40, 40, 40);
      docPDF.setFontSize(11);
      docPDF.text("Producto", 14, y);
      docPDF.text("Monto ($)", 180, y, { align: "right" });
      docPDF.line(14, y + 2, 196, y + 2);
      y += 8;

      const filas = document.querySelectorAll("#tablaVentas tbody tr");
      docPDF.setFont("helvetica", "normal");
      filas.forEach(fila => {
        const cols = fila.querySelectorAll("td");
        if (cols.length >= 3) {
          const producto = cols[1].textContent.trim();
          const monto = cols[2].textContent.trim();
          docPDF.text(producto.substring(0, 50), 14, y);
          docPDF.text(monto, 180, y, { align: "right" });
          y += 7;
          if (y > 260) {
            docPDF.addPage();
            y = 20;
          }
        }
      });

      docPDF.setDrawColor(...grisSuave);
      docPDF.line(14, y, 196, y);
      y += 10;

      // ===============================
      // 📊 RESUMEN DEL DÍA
      // ===============================
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(13);
      docPDF.setTextColor(...azulSuave);
      docPDF.text("Resumen del Día", 14, y);
      y += 8;

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(11);
      docPDF.setTextColor(40, 40, 40);
      docPDF.text(`Ingresos (ventas):  $${totalDia.toLocaleString("es-AR")}`, 14, y);
      y += 6;
      docPDF.text(`Egresos:              $${egresos.toLocaleString("es-AR")}`, 14, y);
      y += 6;
      docPDF.setFont("helvetica", "bold");
      docPDF.text(`Saldo final en caja:  $${(totalDia - egresos).toLocaleString("es-AR")}`, 14, y);
      y += 10;

      // ===============================
      // ✍️ OBSERVACIONES (ajuste automático)
      // ===============================
      if (observaciones) {
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(12);
        docPDF.setTextColor(...azulSuave);
        docPDF.text("Observaciones:", 14, y);
        y += 6;

        docPDF.setFont("helvetica", "normal");
        docPDF.setTextColor(40, 40, 40);
        const maxAncho = 180;
        const lineas = docPDF.splitTextToSize(observaciones, maxAncho);
        docPDF.text(lineas, 14, y);
        y += lineas.length * 6 + 4;
      }

      // ===============================
      // ✒️ BLOQUE DE FIRMAS
      // ===============================
      docPDF.setDrawColor(...grisSuave);
      docPDF.line(14, y + 20, 90, y + 20);
      docPDF.line(120, y + 20, 196, y + 20);
      docPDF.setFont("helvetica", "italic");
      docPDF.setFontSize(10);
      docPDF.text("Firma del Cajero", 14, y + 25);
      docPDF.text("Firma del Supervisor", 140, y + 25);

      // ===============================
      // 📄 PIE DE PÁGINA
      // ===============================
      docPDF.setFont("helvetica", "italic");
      docPDF.setFontSize(9);
      docPDF.setTextColor(120, 120, 120);
      docPDF.text("Documento generado automáticamente por Vidriera Virtual", 105, 285, { align: "center" });

      // 💾 Guardar PDF
      const nombreArchivo = `CierreCaja_${nombreTienda}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.pdf`;
      docPDF.save(nombreArchivo);
    } catch (error) {
      console.error("❌ Error al generar PDF:", error);
      alert("⚠️ El cierre se guardó, pero hubo un error al generar el PDF.");
    }

// ===============================
// 🧹 Eliminar SOLO ventas del día tras el cierre
// ===============================
const snapDia = await getDocs(qHoy); // usamos el filtro del día actual

for (const docu of snapDia.docs) {
  await deleteDoc(doc(ventasRef, docu.id));
}

console.log("Ventas del día eliminadas correctamente.");



    // 🔁 Reiniciar datos
    alert(`✅ Cierre de caja registrado correctamente ($${totalDia.toFixed(2)}).`);
    totalDia = 0;
    totalCaja.textContent = "Total del día: $0";
    cuerpoTabla.innerHTML = "";
  };


}
// =====================================
// 🧾 GENERADOR DE FOLLETO PDF — AJUSTABLE MANUALMENTE
// =====================================
document.getElementById("btnGenerarFolleto").addEventListener("click", async () => {
  try {
    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const anchoPagina = docPDF.internal.pageSize.getWidth();
    const altoPagina = docPDF.internal.pageSize.getHeight();

    // ===========================
    // 📐 CONFIGURACIÓN VISUAL — 4 filas x 3 columnas (bajada del contenido)
    // ===========================
    const margenX = 12;        // margen lateral
    const margenY = 22;        // 🔹 antes 14 → aumenta = baja toda la grilla
    const cols = 3;
    const filas = 4;
    const espacio = 8;

    const altoDisponible = altoPagina - margenY * 2 - 5; // 🔹 antes -15 → reduce margen inferior
    const altoItem = (altoDisponible - (filas - 1) * espacio) / filas * 0.88;
    const anchoItem = (anchoPagina - margenX * 2 - (cols - 1) * espacio) / cols;




    const nombreTienda = document.getElementById("MATES-GUAY").textContent || "Mi Tienda";
    const fecha = new Date().toLocaleDateString("es-AR");

    // ===========================
    // ENCABEZADO
    // ===========================
    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(18);
    docPDF.setTextColor(0, 150, 0);
    docPDF.text(nombreTienda, anchoPagina / 2, 12, { align: "center" });
    docPDF.setFontSize(10);
    docPDF.setTextColor(100);
    docPDF.text(`Catálogo de productos — ${fecha}`, margenX, 18);
    docPDF.setDrawColor(180);
    docPDF.line(10, 20, anchoPagina - 10, 20);

    // ===========================
    // CUADRÍCULA DE PRODUCTOS
    // ===========================
    let x = margenX;
    let y = margenY + 5;
    let contador = 0;

    for (const p of productos) {
      if (!p.nombre || !p.precio) continue;

      // IMAGEN DEL PRODUCTO
      if (p.imagen) {
        try {
          const img = await fetch(p.imagen);
          const blob = await img.blob();
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = () => {
              // 👇 Cambiá el último número para ajustar el alto de la imagen (ej. 35 → 40 o 25)
              docPDF.addImage(reader.result, "JPEG", x + 5, y, anchoItem - 10, 35, "", "FAST");
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.log("⚠️ Imagen no cargada:", e);
        }
      }

      // NOMBRE DEL PRODUCTO
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(10.5);
      docPDF.setTextColor(0);
      const nombreCorto = docPDF.splitTextToSize(p.nombre, anchoItem - 10);
      docPDF.text(nombreCorto, x + 5, y + 40);

      // 🧮 Calcular automáticamente la posición Y según la cantidad de líneas
      const alturaTexto = nombreCorto.length * 5; // cada línea ocupa aprox 5mm
      let posY = y + 40 + alturaTexto; // 🔹 el precio se acomoda debajo del texto

      // PRECIO PRINCIPAL
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(11);
      docPDF.setTextColor(0);
      docPDF.text(`$${p.precio}`, x + 5, posY + 6);



      // PRECIO MAYORISTA (opcional)
      if (p.precioMayorista) {
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(9.5);
        docPDF.setTextColor(0, 102, 204);
        docPDF.text(`Mayorista: $${p.precioMayorista}`, x + 5, posY + 10);
      }

      // DESCUENTO VISUAL (precio anterior arriba del precio actual)
      if (p.descuento && p.precioAnterior) {
        // 🔴 Etiqueta roja de descuento (proporcional)
        const etiquetaX = x + 6;
        const etiquetaY = y + 4;
        const etiquetaW = 10;
        const etiquetaH = 6;

        docPDF.setFillColor(255, 0, 0);
        docPDF.roundedRect(etiquetaX, etiquetaY, etiquetaW, etiquetaH, 1, 1, "F");

        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(7.5);
        docPDF.setTextColor(255, 255, 255);
        docPDF.text(`-${p.descuento}%`, etiquetaX + 1.8, etiquetaY + 4.5);

        /// 💲 Precio anterior tachado (encima del precio verde)
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(9);
        docPDF.setTextColor(150);
        const yAnterior = posY + 1.5; // 🔹 sube 1.5mm sobre el precio verde

        // Texto completo
        docPDF.text(`Precio anterior:$${p.precioAnterior}`, x + 5, yAnterior);

        // Línea de tachado (solo sobre el número, no sobre "Precio anterior:")
        const anchoEtiqueta = docPDF.getTextWidth("Precio anterior:"); // mide solo la palabra
        const anchoNumero = docPDF.getTextWidth(`$${p.precioAnterior}`);
        const inicioLinea = x + 5 + anchoEtiqueta + 1.5; // arranca después de "Precio anterior:"
        docPDF.setDrawColor(150);
        docPDF.line(inicioLinea, yAnterior - 1.5, inicioLinea + anchoNumero, yAnterior - 1.5);

      }

      // POSICIONAMIENTO EN GRILLA
      contador++;
      if (contador % cols === 0) {
        x = margenX;
        y += altoItem + espacio;
      } else {
        x += anchoItem + espacio;
      }

      // NUEVA PÁGINA SI SE LLENA
      if (y + altoItem > altoPagina - 15) {
        docPDF.addPage();
        y = margenY + 5;
        x = margenX;
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(18);
        docPDF.setTextColor(0, 150, 0);
        docPDF.text(nombreTienda, margenX, 12);
        docPDF.setFontSize(10);
        docPDF.setTextColor(100);
        docPDF.text(`Catálogo de productos — ${fecha}`, margenX, 18);
        docPDF.line(10, 20, anchoPagina - 10, 20);
      }
    }

    // PIE DE PÁGINA
    docPDF.setFontSize(9);
    docPDF.setTextColor(150);
    docPDF.text(`Generado automáticamente por MultiTiendas Gualeguay`, 10, altoPagina - 5);

    docPDF.save(`Catalogo-${nombreTienda}.pdf`);
  } catch (error) {
    console.error("Error generando PDF:", error);
    alert("⚠️ Error al generar el PDF.");
  }
});

// ==========================================================
// 📇 REGISTRO DE CLIENTES / PROVEEDORES (CRUD COMPLETO)
// ==========================================================

let registroEditandoId = null;

// Abrir modal
document.getElementById("btnRegistroClientes").onclick = async () => {
  document.getElementById("modalRegistroClientes").style.display = "block";
  cargarRegistros();
};

// Cerrar modal
window.cerrarModalRegistro = function () {
  document.getElementById("modalRegistroClientes").style.display = "none";
  limpiarFormularioRegistro();
};

// LIMPIAR CAMPOS
function limpiarFormularioRegistro() {
  registroEditandoId = null;
  document.getElementById("nombreRegistro").value = "";
  document.getElementById("telefonoRegistro").value = "";
  document.getElementById("tipoRegistro").value = "Cliente";
  document.getElementById("notaRegistro").value = "";
}

// GUARDAR / ACTUALIZAR
window.agregarRegistro = async function () {
  const nombre = document.getElementById("nombreRegistro").value.trim();
  const tel = document.getElementById("telefonoRegistro").value.trim();
  const tipo = document.getElementById("tipoRegistro").value;
  const nota = document.getElementById("notaRegistro").value.trim();

  if (!nombre) return alert("Ingresá un nombre.");

  if (registroEditandoId) {
    // 🔵 Actualizar
    await updateDoc(doc(db, "tiendas", tiendaId, "registrosCP", registroEditandoId), {
      nombre,
      telefono: tel,
      tipo,
      nota
    });
    alert("Registro actualizado correctamente.");
  } else {
    // 🟢 Crear nuevo
    await addDoc(collection(db, "tiendas", tiendaId, "registrosCP"), {
      nombre,
      telefono: tel,
      tipo,
      nota,
      fecha: serverTimestamp()
    });
    alert("Registro guardado correctamente.");
  }

  limpiarFormularioRegistro();
  cargarRegistros();
};

// CARGAR TABLA
async function cargarRegistros() {
  const tbody = document.querySelector("#tablaRegistros tbody");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "tiendas", tiendaId, "registrosCP"));

  snap.forEach(docu => {
    const r = docu.data();
    const id = docu.id;

    tbody.innerHTML += `
      <tr>
        <td style="padding:8px;">${r.nombre}</td>
        <td style="padding:8px;">${r.telefono || ""}</td>
        <td style="padding:8px;">${r.tipo}</td>
        <td style="padding:8px;">${r.nota || ""}</td>
        <td style="padding:8px;">

          <button onclick="editarRegistro('${id}', '${r.nombre}', '${r.telefono || ""}', '${r.tipo}', \`${r.nota || ""}\`)"title="Editar"
          style="background:none;border:none;cursor:pointer;font-size:18px;margin-right:8px;">✏️ </button>

          <button onclick="eliminarRegistro('${id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;font-size:18px;color:#dc3545;">🗑️</button>


        </td>
      </tr>
    `;
  });
}

// EDITAR
window.editarRegistro = function (id, nombre, tel, tipo, nota) {
  registroEditandoId = id;

  document.getElementById("nombreRegistro").value = nombre;
  document.getElementById("telefonoRegistro").value = tel;
  document.getElementById("tipoRegistro").value = tipo;
  document.getElementById("notaRegistro").value = nota;

  alert("Modo edición activado. Modificá los datos y guardá.");
};

// ELIMINAR
window.eliminarRegistro = async function (id) {
  if (!confirm("¿Eliminar este registro?")) return;

  await deleteDoc(doc(db, "tiendas", tiendaId, "registrosCP", id));

  alert("Registro eliminado correctamente.");
  cargarRegistros();
};


// ==========================================================
// 🧾 GENERAR PDF DE CLIENTES / PROVEEDORES (VERSIÓN PREMIUM)
// ==========================================================
window.imprimirRegistros = async function () {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const marginX = 15;     // margen izquierdo
  let y = 20;             // inicio del contenido en Y

  // ===========================
  // 🖼️ LOGO CENTRADO
  // ===========================
  const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
  const configSnap = await getDoc(configRef);

  if (configSnap.exists() && configSnap.data().logo) {
    try {
      const logoUrl = configSnap.data().logo;
      const imgData = await fetch(logoUrl)
        .then(res => res.blob())
        .then(blob => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }));

      // logo centrado
      pdf.addImage(imgData, "PNG", 90 - 15, y, 40, 40);
      y += 45;
    } catch (e) {
      console.warn("⚠ No se pudo cargar el logo en el PDF.");
    }
  }

  // ===========================
  // 📝 TÍTULO (CENTRADO)
  // ===========================
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Registro de Clientes / Proveedores", 105, y, { align: "center" });

  y += 12;

  // ===========================
  // 📅 SUBTÍTULOS
  // ===========================
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  pdf.text(`Tienda: ${tiendaId}`, marginX, y);
  y += 6;
  pdf.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, marginX, y);

  y += 12;

  // ===========================
  // 📋 ENCABEZADOS DE TABLA
  // ===========================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text("Nombre", marginX, y);
  pdf.text("Teléfono", marginX + 55, y);
  pdf.text("Tipo", marginX + 105, y);
  pdf.text("Notas", marginX + 135, y);

  y += 2;
  pdf.line(marginX, y, 200, y);

  y += 8;

  // ===========================
  // 📄 DATOS
  // ===========================
  const registrosSnap = await getDocs(collection(db, "tiendas", tiendaId, "registrosCP"));

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  registrosSnap.forEach(docu => {
    const r = docu.data();

    // Salto de página automático
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(r.nombre || "", marginX, y);
    pdf.text(r.telefono || "", marginX + 55, y);
    pdf.text(r.tipo || "", marginX + 105, y);

    // notas (recortadas)
    const nota = r.nota ? r.nota.substring(0, 45) : "";
    pdf.text(nota, marginX + 135, y);

    y += 8;
  });

  pdf.save(`Registro_Clientes_Proveedores_${tiendaId}.pdf`);
};


// ===============================================
// 📘 TÉRMINOS Y CONDICIONES – SISTEMA PROFESIONAL
// ===============================================

// 🔹 Texto de Términos y Condiciones (convertido desde DOCX)
const textoTyC = `
:contentReference[oaicite:3]{index=3}
`;

// 🔹 Cargar contenido en el modal
window.mostrarTyC = function () {
  document.getElementById("contenidoTyC").innerHTML =
    textoTyC.replace(/\n/g, "<br>");
  document.getElementById("modalTyC").style.display = "block";
};

// 🔹 Consultar si el usuario ya aceptó
async function usuarioAceptoTyC(userId) {
  const ref = doc(db, "usuarios", userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data().aceptoTyC === true;
  }

  return false;
}

// 🔹 Guardar aceptación
async function guardarAceptacionTyC(userId) {
  const ref = doc(db, "usuarios", userId);

  await setDoc(ref, { aceptoTyC: true }, { merge: true });

  // Guardar localmente por si recarga
  localStorage.setItem("aceptoTyC_" + tiendaId, "true");
}

// =======================================================
// 📌 VERIFICACIÓN AUTOMÁTICA DESPUÉS DEL LOGIN
// =======================================================
onAuthStateChanged(auth, async user => {
  if (user) {
    const aceptoLocal = localStorage.getItem("aceptoTyC_" + tiendaId);
    const aceptoDB = await usuarioAceptoTyC(user.uid);

    // SI NO ACEPTÓ → bloquear panel y mostrar modal
    if (!aceptoLocal && !aceptoDB) {
      mostrarTyC();
      document.getElementById("admin-panel").style.display = "none";
    } else {
      document.getElementById("admin-panel").style.display = "block";
    }
  }
});

// =======================================================
// 📌 BOTÓN "ACEPTO"
// =======================================================
document.getElementById("btnAceptarTyC").onclick = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await guardarAceptacionTyC(user.uid);

  // Cerrar modal y permitir acceso
  document.getElementById("modalTyC").style.display = "none";
  document.getElementById("admin-panel").style.display = "block";
};
