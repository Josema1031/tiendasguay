

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore, collection, setDoc, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);
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
// 🔐 Permisos/funcionalidades por plan
// ===============================
const FEATURES_BY_PLAN = {
  Basico: {
    maxProductos: 20,
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
      btnSubirProfesional.onclick = () => {
        const numeroWhatsApp = "5492644429646"; // ⚠️ reemplazá con tu número real
        const mensaje = encodeURIComponent(`Hola! Quiero actualizar mi plan ${plan} a Profesional en MultiTiendas Gualeguay.`);
        window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, "_blank");
        modalCambiarPlan.style.display = "none";

        // Mostrar confirmación con animación
        const mensajeConfirmacion = document.getElementById("mensaje-confirmacion-plan");
        if (mensajeConfirmacion) {
          mensajeConfirmacion.style.display = "block";
          // Reinicia la animación por si ya se mostró antes
          mensajeConfirmacion.style.animation = "none";
          void mensajeConfirmacion.offsetWidth; // forzar reflow
          mensajeConfirmacion.style.animation = "fadeInOut 6s ease-in-out forwards";
          setTimeout(() => {
            mensajeConfirmacion.style.display = "none";
          }, 6000);
        }

      };

      // Acción de cambio a Premium
      btnSubirPremium.onclick = () => {
        const numeroWhatsApp = "5492644429649"; // ⚠️ reemplazá con tu número real
        const mensaje = encodeURIComponent(`Hola! Quiero actualizar mi plan ${plan} a Premium en MultiTiendas Gualeguay.`);
        window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, "_blank");
        modalCambiarPlan.style.display = "none";
        // Mostrar confirmación con animación
        const mensajeConfirmacion = document.getElementById("mensaje-confirmacion-plan");
        if (mensajeConfirmacion) {
          mensajeConfirmacion.style.display = "block";
          // Reinicia la animación por si ya se mostró antes
          mensajeConfirmacion.style.animation = "none";
          void mensajeConfirmacion.offsetWidth; // forzar reflow
          mensajeConfirmacion.style.animation = "fadeInOut 6s ease-in-out forwards";
          setTimeout(() => {
            mensajeConfirmacion.style.display = "none";
          }, 6000);
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
        <p style="color:#555;">Actualizá a <strong>Profesional</strong> o <strong>Premium</strong> para personalizar tu tienda.</p>
      </div>
    `;
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


// 🔑 FUNCIÓN LOGIN MANUAL

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("mensaje-error");

  try {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem("loginManual", "true");

    // Ahora que el login fue exitoso, forzamos el cambio visual
    document.getElementById("login-container").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    mostrarProductos();
    await initPlanUI();
    // ✅ Mostrar Configuración de la Tienda solo después del login
    document.getElementById("configuracion-tienda").style.display = "block";



    error.textContent = "";
  } catch (e) {
    console.error(e);
    error.textContent = "❌ Correo o contraseña incorrectos.";
  }
};

// 🔍 DETECCIÓN DE USUARIO LOGUEADO AL CARGAR

onAuthStateChanged(auth, async user => {
  const login = document.getElementById("login-container");
  const panel = document.getElementById("admin-panel");

  const loginManual = sessionStorage.getItem("loginManual");

  if (user && loginManual === "true") {
    login.style.display = "none";
    panel.style.display = "block";
    mostrarProductos();
    await initPlanUI(); // 
  } else {
    login.style.display = "block";
    panel.style.display = "none";
  }
});

//  🚪 FUNCIÓN CERRAR SESIÓN

window.cerrarSesion = function () {
  sessionStorage.removeItem("loginManual");
  signOut(auth);
};

let productos = [];
let productosOriginales = [];
let paginaActual = 1;
const productosPorPagina = 10;
window.productos = productos;

//📦 MOSTRAR PRODUCTOS (CON CACHÉ)

async function mostrarProductos() {
  document.getElementById("loader") // mostrar loader

  // Si hay productos cacheados en sessionStorage, mostralos primero
  const cache = sessionStorage.getItem("productosAdmin");
  if (cache) {
    productos = JSON.parse(cache);
    renderTabla();
    actualizarDashboard();
  }

  try {
    const snapshot = await getDocs(productosRef);
    productos = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    productosOriginales = JSON.parse(JSON.stringify(productos)); // Copia profunda
    sessionStorage.setItem("productosAdmin", JSON.stringify(productos));
    renderTabla();
    actualizarDashboard(); // ← Agregá esta línea
  } catch (error) {
    alert("❌ Error al cargar los productos desde Firebase");
    console.error(error);
  } finally {
    document.getElementById("loader").style.display = "none"; // ocultar loader
  }
}


//  🔎 BÚSQUEDA EN TIEMPO REAL

document.getElementById("buscador-admin").addEventListener("input", function () {
  const texto = this.value.toLowerCase().trim();

  const filtrados = productos.filter(prod =>
    prod.nombre.toLowerCase().includes(texto) ||
    prod.categoria.toLowerCase().includes(texto) ||
    (prod.tipoVenta && prod.tipoVenta.toLowerCase().includes(texto))
  );

  paginaActual = 1; // Reinicia a la primera página
  renderTabla(filtrados, true); // <-- nuevo parámetro
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
import { getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.agregarProducto = async function () {
  try {
    // Obtener el plan de la tienda desde Firestore
    const configRef = doc(db, "tiendas", tiendaId, "config", "datos");
    const configSnap = await getDoc(configRef);
    const plan = configSnap.exists() ? configSnap.data().plan : "Basico";


    // Definir límites según plan
    let limite = 0;
    if (plan === "Basico") limite = 20;
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


// 📋 RENDERIZAR TABLA DE PRODUCTOS

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
    fila.addEventListener("dragstart", dragStart);
    fila.addEventListener("dragover", dragOver);
    fila.addEventListener("drop", drop);

    fila.innerHTML = `
      <td><input type="text" value="${prod.nombre}" onchange="editar(${inicio + index}, 'nombre', this.value)"></td>

      <td><input type="number" value="${prod.precio}" onchange="editar(${inicio + index}, 'precio', this.value)"></td>
      <td><input type="number" value="${prod.precioAnterior ?? ''}" onchange="editar(${inicio + index}, 'precioAnterior', this.value)"></td>
      <td><input type="number" value="${prod.descuento ?? ''}" onchange="editar(${inicio + index}, 'descuento', this.value)"></td>
      <td><input type="number" value="${prod.precioMayorista ?? ''}" onchange="editar(${inicio + index}, 'precioMayorista', this.value)"></td>
      <td><input type="number" value="${prod.unidadesPack ?? ''}" onchange="editar(${inicio + index}, 'unidadesPack', this.value)"></td>
     <td>
  <select id="categoria_${inicio + index}" onchange="editar(${inicio + index}, 'categoria', this.value)">
  </select>
</td>

      <td><!-- Input para la cantidad -->
      <input type="number" 
         value="${prod.cantidad || ''}" 
         onchange="editar(${inicio + index}, 'cantidad', this.value)" 
         style="width: 40px; text-align: center;" 
         min="0" step="0.01">

        <!-- Select para la unidad -->
        <select onchange="editar(${inicio + index}, 'unidad', this.value)" style="width: 70px;">
          <option value="Unidad" ${prod.unidad === "Unidad" ? "selected" : ""}>Unidad</option>
          <option value="Unidades" ${prod.unidad === "Unidades" ? "selected" : ""}>Unidades</option>
           <option value="Sin Stock" ${prod.unidad === "Sin Stock" ? "selected" : ""}>Sin Stock</option>

        </select>
      </td>

      <td>
        <input type="text" value="${prod.imagen}" onchange="editar(${inicio + index}, 'imagen', this.value)" style="width: 90%; margin-top: 5px; text-align: center;">
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
    if (prod.stock !== undefined && prod.stock < 5) {
      fila.classList.add("low-stock"); // resalta si queda menos de 5
    }

    // === Ajustar categoría según el producto ===
const selectCategoria = fila.querySelector(`#categoria_${inicio + index}`);
if (selectCategoria) {
  (window.categoriasGlobales || []).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    selectCategoria.appendChild(opt);
  });
  // 🟢 Asignar la categoría guardada del producto
  selectCategoria.value = prod.categoria || "";
}


    tbody.appendChild(fila);
    actualizarSelectsCategoria(window.categoriasGlobales || []);

  });
  // Ordenar productos por el campo 'orden'
  productos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  // Solo actualizar productosOriginales y sessionStorage si no es filtrado
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
      renderTabla();
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

function dragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

async function drop(e) {
  e.preventDefault();
  if (dragSrcEl === this) return;

  const tbody = this.parentNode;
  const draggedIndexLocal = Array.from(tbody.children).indexOf(dragSrcEl);
  const targetIndexLocal = Array.from(tbody.children).indexOf(this);

  // 🔧 Calculamos el índice real en el array global
  const inicio = (paginaActual - 1) * productosPorPagina;
  const draggedIndexGlobal = inicio + draggedIndexLocal;
  const targetIndexGlobal = inicio + targetIndexLocal;

  const movedItem = productos.splice(draggedIndexGlobal, 1)[0];
  productos.splice(targetIndexGlobal, 0, movedItem);

  // Reasignar orden y actualizar Firestore
  const updates = productos.map((producto, i) => {
    producto.orden = i;
    if (producto.id) {
      const ref = doc(productosRef, producto.id);
      return updateDoc(ref, { orden: i });
    }
  });

  await Promise.all(updates);

  renderTabla();
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
      logo: logoUrl
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
  const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");
  const catSnap = await getDoc(catRef);

  let categorias = [];
  if (catSnap.exists()) {
    categorias = catSnap.data().lista || [];
  } else {
    categorias = ["Imperial", "Camionero", "Combo", "Ofertas"];
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
          await setDoc(catRef, { lista });
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
    categorias.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    // Restaurar valor previo si aún existe
    if (categorias.includes(valorActual)) {
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

// 🔄 Cargar al inicio
cargarCategorias();






document.getElementById("btnGuardarConfig").addEventListener("click", guardarConfigTienda);

// Cargar datos al iniciar
cargarConfigTienda();

