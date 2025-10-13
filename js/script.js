// ============================================
// 🔧 CONFIGURACIÓN DE FIREBASE
// Inicializa el proyecto y la conexión con la base de datos
// ============================================
// ✅ Importaciones unificadas (versión 10.12.2)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";



// Configuración de Firebase del proyecto actual
const firebaseConfig = {
  apiKey: "AIzaSyA36uwBk0FBDc6rI16BAsqUNe_AXLpv62Q",
  authDomain: "carniceriadonjose-48638.firebaseapp.com",
  projectId: "carniceriadonjose-48638",
  storageBucket: "carniceriadonjose-48638.appspot.com",
  messagingSenderId: "322531750471",
  appId: "1:322531750471:web:78e290c9c81eecc7be3762"
};

// Inicialización de Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===========================================
// 👀 CONTADOR DE VISITAS (crear/actualizar y mostrar)
// ===========================================
async function registrarVisita() {
  const visitasRef = doc(db, "tiendas", tiendaId, "config", "visitas");
  try {
    await updateDoc(visitasRef, { total: increment(1) });
  } catch (err) {
    // Si el doc no existe, lo creamos con total=1
    await setDoc(visitasRef, { total: 1 });
  }
}

async function mostrarVisitas() {
  const el = document.getElementById("contador-visitas-numero");
  if (!el) return; // evita error si el elemento no existe en el HTML
  const visitasRef = doc(db, "tiendas", tiendaId, "config", "visitas");
  const snap = await getDoc(visitasRef);
  el.textContent = snap.exists() ? (snap.data().total || 0) : "0";
}


// ============================================
// 🏪 FUNCIÓN: obtener el ID de la tienda desde la URL
// Lee el parámetro ?tienda= del enlace o desde localStorage
// ============================================
function getTiendaId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("tienda");
  if (fromUrl) {
    localStorage.setItem("tiendaId", fromUrl);
    return fromUrl;
  }
  return localStorage.getItem("tiendaId") || null;
}
const tiendaId = getTiendaId();

// ============================================
// 🏷️ CARGAR CATEGORÍAS EN TIEMPO REAL DESDE FIRESTORE
// ============================================
function cargarCategoriasEnTiempoReal() {
  const catRef = doc(db, "tiendas", tiendaId, "config", "categorias");

  // 👇 Escucha cambios en tiempo real
  onSnapshot(catRef, (docSnap) => {
    if (docSnap.exists()) {
      const categorias = docSnap.data().lista || [];
      renderBotonesCategorias(categorias);
    } else {
      renderBotonesCategorias(["Todos"]);
    }
  }, (error) => {
    console.error("Error escuchando categorías:", error);
  });
}

function renderBotonesCategorias(categorias) {
  const cont = document.getElementById("menu-categorias");
  cont.innerHTML = "";

  // 🟢 Siempre agregar "Todos" primero
  const btnTodos = document.createElement("button");
  btnTodos.textContent = "Todos";
  btnTodos.onclick = () => filtrarCategoria("Todos");
  cont.appendChild(btnTodos);

  categorias.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.onclick = () => filtrarCategoria(cat);
    cont.appendChild(btn);
  });
}

// 🚀 Llamar al iniciar la tienda
cargarCategoriasEnTiempoReal();




// ============================================
// ⚙️ FUNCIÓN: cargar configuración de la tienda
// Obtiene desde Firestore la información de “config/datos”
// (nombre, logo, WhatsApp, colores, etc.)
// ============================================
async function cargarConfig() {
  try {
    const ref = doc(db, "tiendas", tiendaId, "config", "datos");
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    return null;
  }
}



// Referencia a la colección de productos de la tienda actual
const productosRef = collection(db, "tiendas", tiendaId, "productos");
// ============================================
// 🚫 VERIFICAR SI LA TIENDA ESTÁ SUSPENDIDA
// Antes de cargar los productos, se consulta el campo "activo" en Firestore
// Si es false, se detiene la ejecución y muestra un aviso visual
// ============================================
(async () => {
  const tiendaRef = doc(db, "tiendas", tiendaId);
  const tiendaSnap = await getDoc(tiendaRef);

  if (tiendaSnap.exists() && tiendaSnap.data().activo === false) {
    document.body.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        flex-direction:column;
        text-align:center;
        background:#f9fafb;
        color:#333;
        font-family:sans-serif;
      ">
        <img src="https://cdn-icons-png.flaticon.com/512/726/726476.png" width="120" alt="Suspendida">
        <h2 style="margin:20px 0 10px;">Tienda temporalmente suspendida</h2>
        <p>Contactá al administrador para más información.</p>
      </div>
    `;
    throw new Error("Tienda suspendida");
  }
})();


// ============================================
// 🛒 VARIABLES GLOBALES
// Define el carrito, los productos cargados y el control de paginación
// ============================================
localStorage.removeItem("carrito");
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let productosCargados = [];
let productosMostrados = 0;
const cantidadPorCarga = 8;

// ============================================
// 📦 FUNCIÓN: cargar productos desde Firestore
// Trae todos los productos y los ordena por campo “orden”
// ============================================
async function cargarProductos() {
  document.getElementById("loader").style.display = "block";
  try {
    const snapshot = await getDocs(productosRef);
    productosCargados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    mostrarProductos(productosCargados);
  } catch (error) {
    console.error("Error cargando productos:", error);
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

// ============================================
// 🔍 EVENTO: buscador de productos
// Filtra en tiempo real los productos por nombre
// ============================================
document.getElementById("buscador").addEventListener("input", e => {
  const texto = e.target.value.toLowerCase();
  const filtrados = productosCargados.filter(p => p.nombre.toLowerCase().includes(texto));
  mostrarProductos(filtrados);
});

// ============================================
// 💾 FUNCIÓN: guardar carrito en localStorage
// ============================================
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

// ============================================
// 🧾 FUNCIÓN: mostrar los productos del carrito
// Muestra cada producto, precio, cantidad y botones de control
// ============================================
function mostrarCarrito() {
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";
  carrito.forEach((prod, index) => {
    prod.cantidad = Number(prod.cantidad) || 0;
    prod.precio = Number(prod.precio) || 0;
    prod.unidadesPack = Number(prod.unidadesPack) || 10;
    const tipo = prod.cantidad >= prod.unidadesPack ? "Mayorista" : "Unitario";
    prod.precio = (tipo === "Mayorista") ? prod.precioMayorista : prod.precioUnitario;
    const subtotal = prod.precio * prod.cantidad;
    const li = document.createElement("li");

    // Campo de cantidad editable
    const inputCantidad = document.createElement("input");
    inputCantidad.type = "number";
    inputCantidad.min = "1";
    inputCantidad.max = prod.stock ?? "";
    inputCantidad.value = prod.cantidad;
    inputCantidad.style.width = "45px";
    inputCantidad.style.margin = "0 8px";

    // Texto del producto
    li.innerHTML = `${prod.nombre} (${tipo}) - $${prod.precio} x `;
    li.appendChild(inputCantidad);
    li.appendChild(document.createTextNode(" = "));
    const strong = document.createElement("strong");
    strong.textContent = `$${subtotal.toFixed(2)}`;
    li.appendChild(strong);

    // Info de stock
    const stockInfo = document.createElement("span");
    stockInfo.style.fontSize = "12px";
    stockInfo.style.color = "gray";
    stockInfo.style.marginLeft = "8px";
    if (prod.stock !== undefined) stockInfo.textContent = `(Máx: ${prod.stock})`;
    li.appendChild(stockInfo);

    // Botones ➖ ➕ ❌
    const btnMenos = document.createElement("button");
    btnMenos.textContent = "➖";
    btnMenos.addEventListener("click", e => { e.stopPropagation(); disminuirCantidad(index); });

    const btnMas = document.createElement("button");
    btnMas.textContent = "➕";
    btnMas.addEventListener("click", e => { e.stopPropagation(); aumentarCantidad(index); });

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "❌";
    btnEliminar.addEventListener("click", e => { e.stopPropagation(); eliminarDelCarrito(index); });

    li.appendChild(btnMenos);
    li.appendChild(btnMas);
    li.appendChild(btnEliminar);
    lista.appendChild(li);
  });

  // Muestra el total final del carrito
  const total = carrito.reduce((acc, p) => acc + (Number(p.precio) || 0) * (Number(p.cantidad) || 0), 0);
  document.getElementById("total").textContent = `Total: $${total.toFixed(2)}`;
}

// ============================================
// 🔁 FUNCIÓN: actualizar carrito
// Guarda, actualiza el contenido y el contador
// ============================================
function actualizarCarrito() {
  guardarCarrito();
  mostrarCarrito();
  actualizarContadorCarrito();
}

// ============================================
// 🔢 FUNCIÓN: actualizar contador del carrito
// Muestra el total de unidades en el icono del carrito
// ============================================
function actualizarContadorCarrito() {
  const contador = document.getElementById("contador-carrito");
  const totalUnidades = carrito.reduce((acc, p) => acc + (p.cantidad || 0), 0);
  contador.textContent = totalUnidades;
}

// ============================================
// 🛍️ FUNCIÓN: agregar producto al carrito
// Verifica stock y actualiza precio según unidad o pack
// ============================================
function agregarAlCarrito(id, nombre, precioBase) {
  const producto = productosCargados.find(p => p.id === id);
  if (!producto) return;
  const index = carrito.findIndex(p => p.id === id);
  const stockDisponible = producto.stock ?? Infinity;
  if (index !== -1) {
    if (carrito[index].cantidad < stockDisponible) carrito[index].cantidad += 1;
    else alert(`⚠️ No hay más stock disponible para ${producto.nombre}`);
  } else {
    if (stockDisponible > 0) {
      const precioInicial = producto.precioUnitario || producto.precio || precioBase;
      carrito.push({ id, nombre, cantidad: 1, precio: precioInicial, precioUnitario: producto.precioUnitario || producto.precio, precioMayorista: producto.precioMayorista || producto.precio, unidadesPack: producto.unidadesPack || 10 });
    } else alert(`⚠️ ${producto.nombre} está sin stock`);
  }
  actualizarPreciosPorCantidad();
  actualizarCarrito();
}

// ============================================
// 💰 FUNCIÓN: actualizar precios por cantidad
// Cambia el precio a mayorista si se supera el pack mínimo
// ============================================
function actualizarPreciosPorCantidad() {
  carrito = carrito.map(p => {
    const umbral = p.unidadesPack || 10;
    const nuevoPrecio = (p.cantidad >= umbral) ? p.precioMayorista : p.precioUnitario;
    return { ...p, precio: nuevoPrecio };
  });
}

// ============================================
// 🔺 FUNCIÓN: aumentar cantidad de producto
// ============================================
function aumentarCantidad(index) {
  const producto = productosCargados.find(p => p.id === carrito[index].id);
  const stockDisponible = producto?.stock ?? Infinity;
  if (carrito[index].cantidad < stockDisponible) {
    carrito[index].cantidad += 1;
    actualizarPreciosPorCantidad();
    actualizarCarrito();
  } else alert(`⚠️ No podés agregar más, stock máximo alcanzado (${stockDisponible} unidades).`);
}

// ============================================
// 🔻 FUNCIÓN: disminuir cantidad o eliminar producto
// Si llega a 0, lo elimina del carrito
// ============================================
function disminuirCantidad(index) {
  if (carrito[index].cantidad > 1) carrito[index].cantidad -= 1;
  else carrito.splice(index, 1);
  actualizarPreciosPorCantidad();
  actualizarCarrito();
}

// ============================================
// ❌ FUNCIÓN: eliminar producto del carrito
// ============================================
function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

// ============================================
// 🧹 EVENTO: vaciar carrito completo
// Pregunta confirmación antes de eliminar todo
// ============================================
document.getElementById("btn-vaciar").addEventListener("click", () => {
  if (confirm("¿Estás seguro que querés vaciar el carrito?")) {
    carrito = [];
    actualizarCarrito();
  }
});

// ============================================
// 💬 EVENTO: enviar pedido por WhatsApp
// Arma el mensaje con los productos y abre la conversación
// ============================================
document.getElementById("btn-enviar").addEventListener("click", async () => {
  if (carrito.length === 0) return alert("El carrito está vacío");
  const cfg = await cargarConfig() || {};
  const nombreTienda = cfg.nombre || "Tu Tienda";
  const numero = cfg.whatsapp || "5493454012723";
  const mensajeProductos = carrito.map((p, i) => `${i + 1}. ${p.nombre} - $${p.precio} x ${p.cantidad}`).join("\n");
  const total = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const mensajeCompleto = `${mensajeProductos}\n\nTotal del pedido: $${total}`;
  const url = `https://wa.me/${numero}?text=Hola ${encodeURIComponent(nombreTienda)}, quiero hacer el siguiente pedido:%0A${encodeURIComponent(mensajeCompleto)}`;
  window.open(url, "_blank");
  carrito = [];
  actualizarCarrito();
  window.location.href = "gracias.html";
});

// ============================================
// 🎴 FUNCIÓN: mostrar productos en pantalla
// Carga y muestra las tarjetas de productos
// ============================================
function mostrarProductos(lista) {
  const contenedor = document.getElementById("contenedor-productos");
  contenedor.innerHTML = "";
  productosMostrados = 0;
  cargarMasProductos(lista);
  const btn = document.getElementById("btn-mostrar-mas");
  if (lista.length > cantidadPorCarga) {
    btn.style.display = "inline-block";
    btn.onclick = () => cargarMasProductos(lista);
  } else btn.style.display = "none";
}

// ============================================
// 📄 FUNCIÓN: cargar más productos
// Muestra los siguientes productos en grupos de 8
// ============================================
function cargarMasProductos(lista) {
  const contenedor = document.getElementById("contenedor-productos");
  const fin = productosMostrados + cantidadPorCarga;
  const fragmento = lista.slice(productosMostrados, fin);
  fragmento.forEach(prod => {
    if (!prod.id || !prod.nombre || !prod.precio) return;
    const div = document.createElement("div");
    div.className = "card";
    let descuento = prod.descuento;
    if (!descuento && prod.precioAnterior && prod.precioAnterior > prod.precio)
      descuento = Math.round(100 - (prod.precio * 100) / prod.precioAnterior);
    div.innerHTML = `
    <div class="card-contenido">
      ${descuento ? `<span class="etiqueta-descuento">-${descuento}%</span>` : ""}
      <img src="${prod.imagen}" alt="${prod.nombre}" style="cursor:pointer;" onclick="abrirModal('${prod.id}')">
      <h3>${prod.nombre}</h3>
      <p>${prod.cantidad && prod.unidad ? `${prod.cantidad} ${prod.unidad}` : ""}</p>
      <p class="precio">
        ${prod.precioAnterior && prod.precioAnterior > prod.precio ? `<span class="precio-anterior">$${prod.precioAnterior}</span>` : ""}
        <span class="precio-actual">$${prod.precio}</span>
      </p>
      ${prod.precioMayorista ? `<p><strong>Precio Mayorista:</strong> $${prod.precioMayorista}</p>` : ""}
      ${prod.unidadesPack ? `<p><strong>Unidades por pack:</strong> ${prod.unidadesPack}</p>` : ""}
      ${prod.stock && prod.stock > 0 ? `<button onclick="agregarAlCarrito('${prod.id}', '${prod.nombre.replaceAll("'", "\\'")}', ${prod.precio})">Agregar</button>` : `<button disabled style="background:gray;cursor:not-allowed;">Sin stock</button>`}
    </div>`;
    contenedor.appendChild(div);
  });
  productosMostrados += fragmento.length;
  const btn = document.getElementById("btn-mostrar-mas");
  if (productosMostrados >= lista.length) btn.style.display = "none";
}

// ============================================
// 🔍 FUNCIÓN: abrir modal de detalle del producto
// Muestra información completa del producto seleccionado
// ============================================
function abrirModal(id) {
  const producto = productosCargados.find(p => p.id === id);
  if (!producto) return;
  document.getElementById("modal-imagen").src = producto.imagen;
  document.getElementById("modal-nombre").textContent = producto.nombre;
  document.getElementById("modal-precio").textContent = "$" + producto.precio;
  document.getElementById("modal-descripcion").textContent = producto.descripcion || "";
  document.getElementById("modal-producto").classList.remove("oculto");
  document.getElementById("modal-agregar").onclick = () => {
    agregarAlCarrito(producto.id, producto.nombre, producto.precio);
    cerrarModal();
  };
}

// ============================================
// ❌ FUNCIÓN: cerrar modal del producto
// ============================================
function cerrarModal() {
  document.getElementById("modal-producto").classList.add("oculto");
}

// ============================================
// 🧺 EVENTO: mostrar u ocultar el carrito lateral
// ============================================
document.getElementById("toggle-carrito").addEventListener("click", () => {
  document.getElementById("carrito-contenido").classList.toggle("oculto");
});

// ============================================
// 📦 EVENTO: cerrar carrito si se hace click fuera de él
// ============================================
document.addEventListener("click", e => {
  const carritoContenido = document.getElementById("carrito-contenido");
  if (!carritoContenido.classList.contains("oculto") && !carritoContenido.contains(e.target) && e.target.id !== "toggle-carrito")
    carritoContenido.classList.add("oculto");
});

// ============================================
// 🏷️ FUNCIÓN: filtrar productos por categoría
// Muestra solo productos de la categoría seleccionada
// ============================================
function filtrarCategoria(categoria) {
  if (categoria === 'todo') mostrarProductos(productosCargados);
  else {
    const filtrados = productosCargados.filter(p => p.categoria === categoria);
    mostrarProductos(filtrados);
  }
}

// ============================================
// 🔗 EXPONE FUNCIONES AL ÁMBITO GLOBAL
// Para que puedan ser llamadas desde el HTML
// ============================================
window.filtrarCategoria = filtrarCategoria;
window.agregarAlCarrito = agregarAlCarrito;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;

// ============================================
// 🔄 EVENTO: recargar productos si se actualizan en otra pestaña
// ============================================
window.addEventListener("storage", e => {
  if (e.key === "productosActualizados") cargarProductos();
});

// ============================================
// 🎨 PERSONALIZACIÓN VISUAL DE LA TIENDA
// ============================================
(async () => {
  const config = await cargarConfig();
  if (!config) return;

  // 🛒 Cambiar color del botón flotante del carrito
  if (config.colorCarrito) {
    const botonCarrito = document.getElementById("toggle-carrito");
    if (botonCarrito) {
      botonCarrito.style.backgroundColor = config.colorCarrito;
      botonCarrito.style.borderColor = config.colorCarrito;

      // Detectar brillo para elegir color de texto (blanco o negro)
      const rgb = parseInt(config.colorCarrito.replace("#", ""), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      const brillo = (r * 299 + g * 587 + b * 114) / 1000;
      botonCarrito.style.color = brillo < 140 ? "#fff" : "#000";
    }
  }

  // ✏️ Cambiar color del texto de las descripciones
  if (config.colorTexto) {
    // Selecciona los textos de dirección, horario y WhatsApp
    document.querySelectorAll("#infoTienda, .info-tienda, .descripcion-tienda, .datos-tienda, p.descripcion-local").forEach(el => {
      el.style.color = config.colorTexto;
    });
  }

  // 🎨 También aplicamos header/footer si aún no estaban
  if (config.colorHeader) {
    const header = document.querySelector("header");
    if (header) header.style.backgroundColor = config.colorHeader;
  }
  if (config.colorFooter) {
    const footer = document.querySelector("footer");
    if (footer) footer.style.backgroundColor = config.colorFooter;
  }
})();


// ============================================
// 🚀 INICIALIZACIÓN AUTOMÁTICA
// Carga los productos y muestra el carrito al abrir la tienda
// ============================================
(async () => {
  await cargarProductos();
  mostrarCarrito();
})();
// ============================================
// 📴 MODO SIN CONEXIÓN
// Muestra un aviso cuando el usuario pierde Internet
// y otro cuando se restablece la conexión
// ============================================

// Crear elemento del aviso
const avisoConexion = document.createElement("div");
avisoConexion.id = "avisoConexion";
avisoConexion.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: #ff5252;
  color: white;
  text-align: center;
  padding: 10px;
  font-weight: bold;
  font-family: system-ui, sans-serif;
  z-index: 2000;
  display: none;
  transition: all 0.4s ease;
`;
avisoConexion.textContent = "⚠️ Conexión perdida. Esperando reconexión...";
document.body.appendChild(avisoConexion);

// Detectar pérdida de conexión
window.addEventListener("offline", () => {
  avisoConexion.style.display = "block";
});

// Detectar reconexión
window.addEventListener("online", () => {
  avisoConexion.style.background = "#4CAF50";
  avisoConexion.textContent = "✅ Conexión restaurada.";
  setTimeout(() => {
    avisoConexion.style.display = "none";
    avisoConexion.style.background = "#ff5252";
    avisoConexion.textContent = "⚠️ Conexión perdida. Esperando reconexión...";
  }, 3000);
});

// Ejecutar cuando el DOM esté listo (seguro)
window.addEventListener("DOMContentLoaded", async () => {
  await registrarVisita();
  await mostrarVisitas();
});
