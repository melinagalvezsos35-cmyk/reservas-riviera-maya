let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaxActual = 0;

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const precioMaximo = document.querySelector("#precioMaximo");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const estado = document.querySelector("#estado");
const divMensajes = document.querySelector("#mensajes");
const totalPersonas = document.querySelector("#totalPersonas");
const btnVaciar = document.querySelector("#btnVaciar");

async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}


function mostrarMensaje(texto) {
  divMensajes.textContent = texto;
  divMensajes.style.display = "block";
  setTimeout(() => divMensajes.style.display = "none", 3000);
}

function obtenerResultados() {
  let resultados = [...experiencias];
  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }
  if (textoBusqueda !== "") {
    resultados = resultados.filter(e => e.nombre.toLowerCase().includes(textoBusqueda));
  }
  if (precioMaxActual > 0) {
    resultados = resultados.filter(e => e.precio <= precioMaxActual);
  }
  if (ordenActual === "ascendente") resultados.sort((a,b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a,b) => b.precio - a.precio);
  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();
  if (resultados.length === 0) {
    catalogo.innerHTML = '<p class="sin-resultados">No se encontraron experiencias bajo esos criterios</p>';
    estado.textContent = "0 resultados";
    return;
  }
  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>
  `).join("");
  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const inputCantidad = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(inputCantidad.value);
  
  if (cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje(`Cantidad no válida. El cupo máximo para ${experiencia.nombre} es de ${experiencia.cupo} personas.`); 
    return;
  }
  
  const existente = reservas.find(r => r.experienciaId === id);
  
  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje(`No puedes agregar más. El cupo máximo de ${experiencia.nombre} es ${experiencia.cupo}.`); 
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({ 
      experienciaId: id, 
      nombre: experiencia.nombre,
      precio: experiencia.precio, 
      cantidad: cantidad,
      subtotal: experiencia.precio * cantidad 
    });
  }
  inputCantidad.value = 1; 
  mostrarReservas();
}

function modificarCantidad(id, cambio) {
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  const nuevaCantidad = reserva.cantidad + cambio;
  
  if (nuevaCantidad < 1) {
    eliminarReserva(id);
    return;
  }
  if (nuevaCantidad > experiencia.cupo) {
    mostrarMensaje(`No puedes exceder el cupo máximo de ${experiencia.cupo} para ${experiencia.nombre}`);
    return;
  }
  
  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
}

function mostrarReservas() {
 
  const cajaExistente = document.querySelector("#cajaConfirmacion");
  if (cajaExistente) cajaExistente.remove();

  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN"; 
    totalPersonas.textContent = "0";
    btnVaciar.style.display = "none";
    return;
  }
  
  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <div class="control-cantidad">
          <button class="btn-cantidad btn-restar" data-id="${r.experienciaId}">-</button>
          <span>${r.cantidad} persona(s)</span>
          <button class="btn-cantidad btn-sumar" data-id="${r.experienciaId}">+</button>
        </div>
        <p>Precio unitario: $${r.precio}</p>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong><br>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>
  `).join("");
  
  const totalReserva = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const cantPersonas = reservas.reduce((suma, r) => suma + r.cantidad, 0);
  
  total.textContent = `$${totalReserva} MXN`;
  totalPersonas.textContent = cantPersonas;
  btnVaciar.style.display = "block";
  
  agregarEventosResumen();
}

function agregarEventosResumen() {
 
  document.querySelectorAll("#listaReservas .btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
  });
  
  document.querySelectorAll("#listaReservas .btn-sumar").forEach(boton => {
    boton.addEventListener("click", () => modificarCantidad(Number(boton.dataset.id), 1));
  });
  
  document.querySelectorAll("#listaReservas .btn-restar").forEach(boton => {
    boton.addEventListener("click", () => modificarCantidad(Number(boton.dataset.id), -1));
  });
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarReservas();
}


btnVaciar.addEventListener("click", () => {
  btnVaciar.style.display = "none";
  
  const cajaConfirmacion = document.createElement("div");
  cajaConfirmacion.id = "cajaConfirmacion";
  cajaConfirmacion.style.marginTop = "15px";
  cajaConfirmacion.style.padding = "15px";
  cajaConfirmacion.style.border = "1px solid var(--peligro)";
  cajaConfirmacion.style.borderRadius = "10px";
  cajaConfirmacion.style.textAlign = "center";
  
  cajaConfirmacion.innerHTML = `
    <p style="color: var(--peligro); font-weight: bold; margin-top: 0;">¿Seguro que deseas vaciar toda la reservación?</p>
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button id="btnSiVaciar" style="background-color: var(--peligro); color: white; width: 100%;">Sí, vaciar</button>
      <button id="btnNoVaciar" style="background-color: var(--gris); color: white; width: 100%;">Cancelar</button>
    </div>
  `;
  
  btnVaciar.parentElement.appendChild(cajaConfirmacion);

  document.querySelector("#btnSiVaciar").addEventListener("click", () => {
    reservas = []; 
    cajaConfirmacion.remove(); 
    mostrarReservas(); 
  });

  document.querySelector("#btnNoVaciar").addEventListener("click", () => {
    cajaConfirmacion.remove(); 
    btnVaciar.style.display = "block"; 
  });
});

buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase(); 
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value; 
  actualizarCatalogo();
});

precioMaximo.addEventListener("input", () => {
  precioMaxActual = Number(precioMaximo.value);
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value; 
  actualizarCatalogo();
});

cargarExperiencias();