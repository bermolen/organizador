
const invitadosLista = document.getElementById("invitados-lista");
const mesasGrid = document.getElementById("mesas-grid");
const agregarMesaBtn = document.getElementById("agregarMesa");
const grupos = document.querySelectorAll(".grupo");
let invitados = [];
let seleccionados = new Set();
let mesaId = 1;
//crearMesa(mesaId++); // Mesa principal


function crearInvitado(nombre) {
  const li = document.createElement("li");
  li.className = "invitado";
  li.textContent = nombre;
  li.draggable = true;
  li.dataset.nombre = nombre;
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
}

function crearMesa(id) {
  const mesa = document.createElement("div");
  mesa.className = "mesa";
  if (id === 1) mesa.classList.add("mesa-principal");
  mesa.dataset.id = id;
  const numero = document.createElement("div");
  numero.className = "mesa-numero";
  numero.textContent = id;
  mesa.appendChild(numero);
  mesa.addEventListener("dragover", e => e.preventDefault());
  mesa.addEventListener("drop", e => {
    e.preventDefault();
    const data = e.dataTransfer.getData("multi");
    const nombres = data ? JSON.parse(data) : [e.dataTransfer.getData("text/plain")];
    nombres.forEach(nombre => {
      const invitado = invitados.find(i => i.dataset.nombre === nombre);
      if (invitado) {
        const clone = invitado.cloneNode(true);
        clone.style.outline = "";
        mesa.appendChild(clone);
        invitadosLista.removeChild(invitado);
        seleccionados.delete(invitado);
        actualizarPosiciones(mesa);
      }
    });
  });
  mesasGrid.appendChild(mesa);
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

agregarMesaBtn.addEventListener("click", () => {
  crearMesa(mesaId++);
});

grupos.forEach(grupo => {
  grupo.addEventListener("click", () => {
    const color = grupo.dataset.color;
    seleccionados.forEach(inv => {
      inv.style.backgroundColor = color;
	  inv.style.outline = ""; // Quita el borde de selección
    });
	seleccionados.clear(); // Vacía el conjunto de seleccionados
  });
});

document.getElementById("csvInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split(/\r?\n/);
    lines.forEach(line => {
      if (line.trim()) crearInvitado(line.trim());
    });
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

// Inicial
//crearMesa(mesaId);
