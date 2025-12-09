
// === Organizador de Mesas - Persistencia LocalStorage ===
const invitadosLista = document.getElementById("invitados-lista");
const mesasGrid = document.getElementById("mesas-grid");
const agregarMesaBtn = document.getElementById("agregarMesa");
const grupos = document.querySelectorAll(".grupo");
let invitados = [];
let seleccionados = new Set();
let mesaId = 1;

// === Persistencia LocalStorage ===
const STORAGE_KEY = "estadoOrganizadorMesas";

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function getComputedBgColor(el) {
  return el.style.backgroundColor || getComputedStyle(el).backgroundColor || "";
}

const scheduleSave = debounce(() => saveState(), 300);

function serializeState() {
  const invitadosEnLista = Array.from(invitadosLista?.querySelectorAll(".invitado") || []).map(inv => ({
    nombre: inv.dataset.nombre,
    color: getComputedBgColor(inv)
  }));

  const mesas = Array.from(document.querySelectorAll(".mesa")).map(mesa => {
    const id = parseInt(mesa.dataset.id, 10);
    const capacidad = parseInt(mesa.dataset.capacidad, 10);
    const invitadosMesa = Array.from(mesa.querySelectorAll(".invitado")).map(inv => ({
      nombre: inv.dataset.nombre,
      color: getComputedBgColor(inv)
    }));
    const principal = mesa.classList.contains("mesa-principal");
    return { id, capacidad, principal, invitados: invitadosMesa };
  });

  return {
    mesaIdActual: mesaId,
    mesas,
    invitadosEnLista
  };
}

function saveState() {
  try {
    const estado = serializeState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch (err) {
    console.error("No se pudo guardar el estado:", err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("No se pudo cargar el estado:", err);
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function restoreState(estado) {
  if (!estado) return;

  // Limpiar UI actual
  invitados = [];
  seleccionados.clear();
  if (mesasGrid) mesasGrid.innerHTML = "";
  if (invitadosLista) invitadosLista.innerHTML = "";

  // Crear mesas según el estado
  mesaId = 1;
  const idsOrdenados = estado.mesas.map(m => m.id).sort((a,b) => a-b);

  idsOrdenados.forEach(id => {
    const oldMesaId = mesaId;
    mesaId = id;
    crearMesa(id);
    mesaId = oldMesaId;
  });

  // Setear capacidades y principal; agregar invitados
  estado.mesas.forEach(m => {
    const mesaDOM = document.querySelector(`.mesa[data-id="${m.id}"]`);
    if (!mesaDOM) return;
    mesaDOM.dataset.capacidad = m.capacidad;
    if (m.principal) mesaDOM.classList.add("mesa-principal");

    m.invitados.forEach(({ nombre, color }) => {
      let inv = Array.from(document.querySelectorAll(".invitado")).find(el => el.dataset.nombre === nombre);
      if (!inv) {
        inv = document.createElement("li");
        inv.className = "invitado";
        inv.textContent = nombre;
        inv.draggable = true;
        inv.dataset.nombre = nombre;
        if (color) inv.style.backgroundColor = color;
        configurarInvitado(inv);
      }
      mesaDOM.appendChild(inv);
    });

    actualizarContador(mesaDOM);
    actualizarPosiciones(mesaDOM);
  });

  // Invitados en la lista de espera
  estado.invitadosEnLista.forEach(({ nombre, color }) => {
    let inv = Array.from(document.querySelectorAll(".invitado")).find(el => el.dataset.nombre === nombre);
    if (!inv) {
      inv = document.createElement("li");
      inv.className = "invitado";
      inv.textContent = nombre;
      inv.draggable = true;
      inv.dataset.nombre = nombre;
      configurarInvitado(inv);
    }
    if (color) inv.style.backgroundColor = color;
    invitadosLista.appendChild(inv);
    if (!invitados.includes(inv)) invitados.push(inv);
  });

  // Ajustar mesaId para futuras mesas nuevas
  mesaId = Math.max(estado.mesaIdActual || 1, ...idsOrdenados, mesaId);
}

// === Código original con enganches de guardado ===
function configurarInvitado(invitado) {
  invitado.onclick = () => {
    if (seleccionados.has(invitado)) {
      seleccionados.delete(invitado);
      invitado.style.outline = "";
    } else {
      seleccionados.add(invitado);
      invitado.style.outline = "2px solid black";
    }
  };
  invitado.ondragstart = e => {
    e.dataTransfer.setData("text/plain", invitado.dataset.nombre);
    e.dataTransfer.setData("multi", JSON.stringify([...seleccionados].map(el => el.dataset.nombre)));
  };
}

function crearElementoInvitado(nombre, color = "") {
  if (invitados.find(i => i.dataset.nombre === nombre)) return;
  const li = document.createElement("li");
  li.className = "invitado";
  li.textContent = nombre;
  li.draggable = true;
  li.dataset.nombre = nombre;
  if (color) li.style.backgroundColor = color;
  li.addEventListener("dblclick", () => {
    li.setAttribute("contenteditable", "true");
    li.classList.add("editable");
    li.focus();
  });
  li.addEventListener("blur", () => {
    const nuevoNombre = li.textContent.trim();
    if (nuevoNombre && nuevoNombre !== li.dataset.nombre) {
      li.dataset.nombre = nuevoNombre;
    }
    li.removeAttribute("contenteditable");
    li.classList.remove("editable");
    scheduleSave();
  });
  configurarInvitado(li);
  invitadosLista.appendChild(li);
  invitados.push(li);
  scheduleSave();
}

function crearInvitado(nombre) {
  if (invitados.find(i => i.dataset.nombre === nombre)) return; // Evita duplicados
  const li = document.createElement("li");
  li.className = "invitado";
  li.textContent = nombre;
  li.draggable = true;
  li.dataset.nombre = nombre;
  configurarInvitado(li);
  li.addEventListener("click", () => {
    if (seleccionados.has(li)) {
      seleccionados.delete(li);
      li.style.outline = "";
    } else {
      seleccionados.add(li);
      li.style.outline = "2px solid black";
    }
  });
  li.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", nombre);
    e.dataTransfer.setData("multi", JSON.stringify([...seleccionados].map(el => el.dataset.nombre)));
  });
  invitadosLista.appendChild(li);
  invitados.push(li);
  scheduleSave();
}

function actualizarContador(mesa) {
  const contador = mesa.querySelector(".mesa-contador");
  const capacidad = parseInt(mesa.dataset.capacidad, 10);
  const ocupados = mesa.querySelectorAll(".invitado").length;
  if (contador) {
    contador.textContent = `${ocupados}/${capacidad}`;
    const porcentaje = ocupados / capacidad;
    if (porcentaje >= 1) {
      contador.style.color = "red";
      mesa.style.border = "3px solid red";
    } else if (porcentaje >= 0.75) {
      contador.style.color = "orange";
      mesa.style.border = "3px solid orange";
    } else {
      contador.style.color = "black";
      mesa.style.border = "3px solid transparent"; // o un color neutro
    }
  }
}

function crearMesa(id) {
  const mesa = document.createElement("div");
  mesa.className = "mesa";
  mesa.dataset.id = id;
  // Leer capacidad desde el input
  let capacidad = parseInt(document.getElementById("capacidadMesa")?.value, 10) || 8;
  if (id === 1) {
    mesa.classList.add("mesa-principal");
    capacidad = 4;
  }
  mesa.dataset.capacidad = capacidad;
  const numero = document.createElement("div");
  numero.className = "mesa-numero";
  numero.textContent = id;
  mesa.appendChild(numero);
  const contador = document.createElement("div");
  contador.className = "mesa-contador";
  contador.textContent = `0/${capacidad}`;
  mesa.appendChild(contador);
  mesa.addEventListener("dragover", e => e.preventDefault());
  mesa.addEventListener("drop", e => {
    e.preventDefault();
    const data = e.dataTransfer.getData("multi");
    const nombres = data ? JSON.parse(data) : [e.dataTransfer.getData("text/plain")];
    const invitadosActuales = mesa.querySelectorAll(".invitado").length;
    const capacidadMaxima = parseInt(mesa.dataset.capacidad, 10);
    if (invitadosActuales + nombres.length > capacidadMaxima) {
      alert(`Esta mesa solo permite ${capacidadMaxima} invitados.`);
      return;
    }
    nombres.forEach(nombre => {
      let invitado = invitados.find(i => i.dataset.nombre === nombre);
      let mesaOrigen = null;
      document.querySelectorAll(".mesa").forEach(m => {
        const encontrado = Array.from(m.querySelectorAll(".invitado")).find(i => i.dataset.nombre === nombre);
        if (encontrado) {
          invitado = encontrado;
          mesaOrigen = m;
        }
      });
      if (mesaOrigen && mesaOrigen !== mesa) {
        mesaOrigen.removeChild(invitado);
        actualizarContador(mesaOrigen);
      }
      if (!invitado) {
        const todasLasMesas = document.querySelectorAll(".mesa");
        todasLasMesas.forEach(m => {
          const encontrado = Array.from(m.querySelectorAll(".invitado")).find(i => i.dataset.nombre === nombre);
          if (encontrado) invitado = encontrado;
        });
      }
      if (invitado) {
        invitado.style.outline = "";
        mesa.appendChild(invitado);
        configurarInvitado(invitado);
        seleccionados.delete(invitado);
        actualizarContador(mesa);
        actualizarPosiciones(mesa);
      }
    });
    scheduleSave();
  });
  mesasGrid.appendChild(mesa);
  // Si es la mesa principal, agregamos el salto de línea después
  if (id === 1) {
    const salto = document.createElement("div");
    salto.className = "salto-linea";
    mesasGrid.appendChild(salto);
  }
  scheduleSave();
}

function actualizarPosiciones(mesa) {
  const invitados = mesa.querySelectorAll(".invitado");
  const total = invitados.length;
  const radio = 90;
  invitados.forEach((inv, i) => {
    const angle = (2 * Math.PI * i) / total;
    const x = 100 + radio * Math.cos(angle) - 25;
    const y = 100 + radio * Math.sin(angle) - 25;
    inv.style.left = x + "px";
    inv.style.top = y + "px";
  });
}

agregarMesaBtn?.addEventListener("click", () => {
  crearMesa(mesaId++);
  scheduleSave();
});

grupos.forEach(grupo => {
  grupo.addEventListener("click", () => {
    const color = grupo.dataset.color;
    seleccionados.forEach(inv => {
      inv.style.backgroundColor = color;
      inv.style.outline = ""; // Quita el borde de selección
    });
    seleccionados.clear(); // Vacía el conjunto de seleccionados
    scheduleSave();
  });
});

document.getElementById("csvInput")?.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split(/\r?\n/);
    lines.forEach(line => {
      if (line.trim()) crearElementoInvitado(line.trim());
    });
    scheduleSave();
  };
  reader.readAsText(file);
});

grupos.forEach(grupo => {
  grupo.addEventListener("blur", () => {
    if (grupo.textContent.trim() === "") {
      grupo.textContent = "Grupo sin nombre";
    }
  });
});

invitadosLista?.addEventListener("dragover", e => e.preventDefault());
invitadosLista?.addEventListener("drop", e => {
  e.preventDefault();
  const data = e.dataTransfer.getData("multi");
  const nombres = data ? JSON.parse(data) : [e.dataTransfer.getData("text/plain")];
  nombres.forEach(nombre => {
    let invitadoEnMesa = null;
    // Buscar y remover el invitado de cualquier mesa
    document.querySelectorAll(".mesa").forEach(mesa => {
      const encontrado = Array.from(mesa.querySelectorAll(".invitado")).find(i => i.dataset.nombre === nombre);
      if (encontrado) {
        mesa.removeChild(encontrado);
        actualizarContador(mesa);
        invitadoEnMesa = encontrado;
      }
    });
    if (invitadoEnMesa) {
      invitadoEnMesa.style.position = "static";
      invitadoEnMesa.style.left = "";
      invitadoEnMesa.style.top = "";
      invitadoEnMesa.style.outline = "";
      configurarInvitado(invitadoEnMesa);
      invitadosLista.appendChild(invitadoEnMesa);
      // Asegurarse de que esté en el array `invitados`
      if (!invitados.includes(invitadoEnMesa)) {
        invitados.push(invitadoEnMesa);
      }
    }
  });
  seleccionados.clear();
  scheduleSave();
});

document.getElementById("agregarInvitado")?.addEventListener("click", () => {
  const input = document.getElementById("nuevoInvitado");
  const nombre = input?.value.trim();
  if (nombre) {
    crearElementoInvitado(nombre);
    if (input) input.value = ""; // Limpiar el campo
    scheduleSave();
  }
});

document.getElementById("nuevoInvitado")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = e.target;
    const nombre = input.value.trim();
    if (nombre) {
      crearElementoInvitado(nombre);
      input.value = "";
      scheduleSave();
    }
    input.focus(); // vuelve a enfocar el input
  }
});

// === Carga inicial desde LocalStorage o mesa base ===
document.addEventListener("DOMContentLoaded", () => {
  const estado = loadState();
  if (estado) {
    restoreState(estado);
  } else {
    crearMesa(mesaId);
    mesaId++;
  }
});
