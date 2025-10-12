

    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

    import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

    import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
document.getElementById("MATES-GUAY").textContent = tiendaId; // sigue funcionando tu encabezado :contentReference[oaicite:5]{index=5}

    const productosRef = collection(db, "tiendas", tiendaId, "productos");

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

        error.textContent = "";
      } catch (e) {
        console.error(e);
        error.textContent = "❌ Correo o contraseña incorrectos.";
      }
    };

    // 🔍 DETECCIÓN DE USUARIO LOGUEADO AL CARGAR

    onAuthStateChanged(auth, user => {
      const login = document.getElementById("login-container");
      const panel = document.getElementById("admin-panel");

      const loginManual = sessionStorage.getItem("loginManual");

      if (user && loginManual === "true") {
        login.style.display = "none";
        panel.style.display = "block";
        mostrarProductos();
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
        <select onchange="editar(${inicio + index}, 'categoria', this.value)">
          <option value="Imperial" ${prod.categoria === "Imperial" ? "selected" : ""}>Imperial</option>
          <option value="Torpedo" ${prod.categoria === "Torpedo" ? "selected" : ""}>Torpedo</option>
          <option value="Camionero" ${prod.categoria === "Camionero" ? "selected" : ""}>Camionero</option>
          <option value="Combo" ${prod.categoria === "Combo" ? "selected" : ""}>Combo</option>
          <option value="Oferta" ${prod.categoria === "Oferta" ? "selected" : ""}>Oferta</option>
          <option value="Sin Stock" ${prod.categoria === "Sin Stock" ? "selected" : ""}>Sin Stock</option>          
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

        tbody.appendChild(fila);
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
  return function(lista) {
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
  