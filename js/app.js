$(document).ready(function () {
  let elementos = [];
  let experimentos = [];
  let seleccion = [];
  let descubiertos = [];
  let ultimosColores = [];
  let numeroPrueba = 0;
  let conResultado = 0;
  let sinResultado = 0;
  let mezclando = false;
  let vasoUsado = false;
  let filtroActual = "todos";
  let timerAviso;

  function cargarElementos() {
    $.ajax({
      url: "datos/elementos.json",
      type: "GET",
      dataType: "json",

      success: function (datos) {
        elementos = datos;
        $("#gridElementos").empty();

        elementos.forEach(function (el) {
          $("#gridElementos").append(`
            <div class="elemento" data-id="${el.id}">
              <div class="frasco"><div class="frasco-liquido" style="background:${el.color}"></div></div>
              <b>${el.formula}</b>
              <span>${el.nombre}</span>
            </div>
          `);
        });

        $(".elemento").draggable({
          helper: "clone",
          revert: "invalid",
          zIndex: 100
        });

        cargarExperimentos();
      },

      error: function () {
        $("#estadoCarga").text("Error al cargar JSON");
        $("#gridElementos").html('<p class="error">No se pudieron cargar los elementos. Abre el proyecto con Live Server.</p>');
      }
    });
  }

  function cargarExperimentos() {
    $.ajax({
      url: "datos/experimentos.json",
      type: "GET",
      dataType: "json",

      success: function (datos) {
        experimentos = datos;
        $("#estadoCarga").text(experimentos.length + " experimentos cargados");
        mostrarCatalogo();
        actualizarProgreso();
      },

      error: function () {
        $("#estadoCarga").text("Error al cargar JSON");
        $("#listaCatalogo").html('<p class="error">No se pudo cargar el catálogo de experimentos.</p>');
      }
    });
  }

  function buscarElemento(id) {
    let encontrados = elementos.filter(function (el) {
      return el.id === id;
    });
    return encontrados[0];
  }

  function buscarExperimento(a, b) {
    let encontrados = experimentos.filter(function (exp) {
      let r1 = exp.reactivos[0];
      let r2 = exp.reactivos[1];
      return (r1 === a && r2 === b) || (r1 === b && r2 === a);
    });

    if (encontrados.length > 0) {
      return encontrados[0];
    }
    return null;
  }

  function agregarElemento(id) {
    if (mezclando) {
      return;
    }

    if (vasoUsado) {
      vaciarVaso();
    }

    if (seleccion.length === 2) {
      mostrarAviso("El vaso ya tiene dos elementos. Presiona Mezclar o vacía el vaso.");
      return;
    }

    if (seleccion.includes(id)) {
      mostrarAviso("Ese elemento ya está en el vaso. Elige uno diferente.");
      return;
    }

    seleccion.push(id);
    crearParticulas("burbuja", 5, "#burbujas");
    mostrarSeleccion();
  }

  function mostrarSeleccion() {
    $(".ranura").each(function () {
      let posicion = $(this).attr("data-posicion");
      let el = buscarElemento(seleccion[posicion]);

      if (el) {
        $(this).addClass("llena").html(`
          <div class="frasco"><div class="frasco-liquido" style="background:${el.color}"></div></div>
          <div class="ranura-texto"><b>${el.formula}</b><small>${el.nombre}</small></div>
          <span class="quitar">×</span>
        `);
      } else {
        $(this).removeClass("llena").text("Elemento " + (Number(posicion) + 1));
      }
    });

    if (seleccion.length === 0) {
      $("#liquido").css("height", "0%");
      $("#instruccion").text("Arrastra dos elementos al vaso");
    } else if (seleccion.length === 1) {
      $("#liquido").css({ "height": "35%", "background": buscarElemento(seleccion[0]).color });
      $("#instruccion").text("Agrega un elemento más");
    } else {
      let color1 = buscarElemento(seleccion[0]).color;
      let color2 = buscarElemento(seleccion[1]).color;
      $("#liquido").css({ "height": "62%", "background": `linear-gradient(${color2}, ${color1})` });
      $("#instruccion").text("Todo listo: presiona Mezclar");
    }

    if (seleccion.length < 2 || vasoUsado) {
      $("#btnMezclar").attr("disabled", "disabled");
    } else {
      $("#btnMezclar").removeAttr("disabled");
    }
  }

  function mezclar() {
    if (seleccion.length < 2 || mezclando || vasoUsado) {
      return;
    }

    mezclando = true;
    $("#btnMezclar").attr("disabled", "disabled").text("Mezclando...");
    $("#instruccion").text("Mezclando...");
    $("#vaso").addClass("agitando");
    crearParticulas("burbuja", 10, "#burbujas");

    setTimeout(function () {
      $("#vaso").removeClass("agitando");
      $("#btnMezclar").text("Mezclar");
      mezclando = false;
      vasoUsado = true;

      let experimento = buscarExperimento(seleccion[0], seleccion[1]);

      if (experimento) {
        mostrarReaccion(experimento);
      } else {
        mostrarSinReaccion();
      }

      $("#instruccion").text("Arrastra un elemento para iniciar otro experimento");
    }, 1500);
  }

  function mostrarReaccion(exp) {
    $("#liquido").css("background", exp.colorFinal);

    exp.efectos.forEach(function (efecto) {
      $("#vaso").addClass("efecto-" + efecto);
    });

    if (exp.efectos.includes("burbujas")) {
      crearParticulas("burbuja", 25, "#burbujas");
    }
    if (exp.efectos.includes("cristales")) {
      crearParticulas("cristal", 12, "#particulas");
    }
    if (exp.efectos.includes("copos")) {
      crearParticulas("copo", 15, "#particulas");
    }
    if (exp.efectos.includes("gotas")) {
      crearParticulas("gota", 8, "#particulas");
    }
    if (exp.efectos.includes("capas")) {
      $(".capa").css("background", buscarElemento("Aceite").color);
    }
    if (exp.vapor !== "") {
      crearVapor(exp.vapor);
    }

    cambiarTemperatura(exp.temperatura);

    let claseTipo = exp.tipo === "Cambio físico" ? "fisico" : "quimica";

    $("#resultado")
      .removeClass("neutro fisico quimica")
      .addClass(claseTipo)
      .html(`
        <span class="resultado-etiqueta">Resultado:</span>
        <h3>${exp.nombre}</h3>
        <div class="insignias">
          <span class="insignia">${exp.tipo}</span>
          <span class="insignia energia">${exp.energia}</span>
        </div>
        <code class="formula">${exp.ecuacion}</code>
        <p>${exp.descripcion}</p>
      `)
      .hide()
      .fadeIn(400);

    if (descubiertos.includes(exp.id)) {
      mostrarAviso("Ya habías realizado este experimento: " + exp.nombre);
    } else {
      descubiertos.push(exp.id);
      mostrarAviso("¡Nuevo experimento descubierto: " + exp.nombre + "!");
      mostrarCatalogo();
      actualizarProgreso();
    }

    conResultado++;
    registrarPrueba(exp.nombre, exp.tipo, claseTipo, exp.temperatura, exp.colorFinal);
    guardarColor(exp.colorFinal);
  }

  function mostrarSinReaccion() {
    $("#vaso").addClass("temblor");

    $("#resultado")
      .removeClass("fisico quimica")
      .addClass("neutro")
      .html(`
        <span class="resultado-etiqueta">Resultado:</span>
        <h3>Sin reacción</h3>
        <p>Esta combinación no aparece en la tabla de reglas del laboratorio. Prueba con otros elementos.</p>
      `)
      .hide()
      .fadeIn(400);

    mostrarAviso("Sin reacción: prueba otra combinación");
    sinResultado++;
    registrarPrueba("Sin reacción", "Sin reacción", "neutro", 25, "#8ba2bf");
  }

  function registrarPrueba(resultado, tipo, claseTipo, temperatura, color) {
    numeroPrueba++;
    let combinacion = buscarElemento(seleccion[0]).formula + " + " + buscarElemento(seleccion[1]).formula;
    let fecha = new Date().toLocaleString();

    $("#tablaBitacora .vacio").remove();
    $("#tablaBitacora").prepend(`
      <tr class="nueva">
        <td>${numeroPrueba}</td>
        <td>${fecha}</td>
        <td>${combinacion}</td>
        <td><span class="punto-color" style="background:${color}"></span>${resultado}</td>
        <td><span class="tipo ${claseTipo}">${tipo}</span></td>
        <td>${temperatura.toFixed(1)} °C</td>
      </tr>
    `);

    $("#statTotal").text(numeroPrueba);
    $("#statReacciones").text(conResultado);
    $("#statSin").text(sinResultado);
  }

  function mostrarCatalogo() {
    $("#listaCatalogo").empty();

    experimentos.forEach(function (exp, i) {
      let numero = i + 1;

      if (descubiertos.includes(exp.id)) {
        let reactivos = buscarElemento(exp.reactivos[0]).formula + " + " + buscarElemento(exp.reactivos[1]).formula;
        $("#listaCatalogo").append(`
          <div class="experimento descubierto" data-id="${exp.id}" title="Clic para cargarlo en el vaso">
            <span class="exp-numero">${numero}</span>
            <div class="exp-info">
              <h3>${exp.nombre}</h3>
              <p>${reactivos} · ${exp.tipo}</p>
            </div>
            <span class="exp-color" style="background:${exp.colorFinal}"></span>
          </div>
        `);
      } else {
        $("#listaCatalogo").append(`
          <div class="experimento oculto">
            <span class="exp-numero">${numero}</span>
            <div class="exp-info">
              <h3>Experimento oculto</h3>
              <p>Pista: ${exp.pista}</p>
            </div>
            <span class="exp-color"></span>
          </div>
        `);
      }
    });

    aplicarFiltro();
  }

  function aplicarFiltro() {
    if (filtroActual === "todos") {
      $(".experimento").show();
    } else {
      $(".experimento").hide();
      $(".experimento." + filtroActual).show();
    }
  }

  function actualizarProgreso() {
    let total = experimentos.length;
    let hechos = descubiertos.length;
    let porcentaje = (hechos / total) * 100;

    $("#contador").text(hechos + "/" + total);
    $("#textoProgreso").text("Experimentos descubiertos: " + hechos + " de " + total);
    $("#barraProgreso").css("width", porcentaje + "%");

    if (hechos === total) {
      setTimeout(function () {
        mostrarAviso("¡Felicidades! Descubriste todos los experimentos");
      }, 2800);
    }
  }

  function guardarColor(color) {
    ultimosColores = [color, ultimosColores[0], ultimosColores[1]];

    $(".tubo-liquido").each(function (i) {
      if (ultimosColores[i]) {
        $(this).css({ "height": "60%", "background": ultimosColores[i] });
      }
    });
  }

  function cambiarTemperatura(temperatura) {
    $("#temperatura").text(temperatura.toFixed(1) + " °C");
    $("#mercurio").css("height", (temperatura / 60) * 100 + "%");
    $("#termometro").removeClass("caliente frio");

    if (temperatura > 30) {
      $("#termometro").addClass("caliente");
    } else if (temperatura < 23) {
      $("#termometro").addClass("frio");
    }
  }

  function crearParticulas(clase, cantidad, contenedor) {
    for (let i = 0; i < cantidad; i++) {
      let tamano = 5 + Math.random() * 10;
      let particula = $("<span>").addClass(clase).css({
        "left": Math.random() * 90 + "%",
        "width": tamano + "px",
        "height": tamano + "px",
        "animation-delay": Math.random() * 2 + "s"
      });

      if (clase !== "burbuja") {
        particula.css("top", 45 + Math.random() * 45 + "%");
      }

      $(contenedor).append(particula);
    }
  }

  function crearVapor(texto) {
    for (let i = 0; i < 6; i++) {
      setTimeout(function () {
        let nube = $("<span>").addClass("nube").text(texto).css("left", 15 + Math.random() * 60 + "%");
        $("#vapor").append(nube);

        setTimeout(function () {
          nube.remove();
        }, 2500);
      }, i * 350);
    }
  }

  function vaciarVaso() {
    seleccion = [];
    vasoUsado = false;
    $("#vaso").removeClass().addClass("vaso");
    $("#burbujas, #particulas, #vapor").empty();
    cambiarTemperatura(25);
    mostrarSeleccion();
  }

  function mostrarAviso(texto) {
    clearTimeout(timerAviso);
    $("#aviso").text(texto).fadeIn(200);

    timerAviso = setTimeout(function () {
      $("#aviso").fadeOut(400);
    }, 2200);
  }

  $("#zonaVaso").droppable({
    accept: ".elemento",
    classes: { "ui-droppable-hover": "vaso-activo" },
    drop: function (e, ui) {
      agregarElemento(ui.draggable.attr("data-id"));
    }
  });

  $("#gridElementos").on("click", ".elemento", function () {
    agregarElemento($(this).attr("data-id"));
  });

  $(".ranura").on("click", function () {
    let posicion = Number($(this).attr("data-posicion"));

    if (mezclando || !seleccion[posicion]) {
      return;
    }

    if (vasoUsado) {
      vaciarVaso();
    } else {
      seleccion = seleccion.filter(function (id, i) {
        return i !== posicion;
      });
      mostrarSeleccion();
    }
  });

  $("#btnMezclar").on("click", function () {
    mezclar();
  });

  $("#btnReiniciar").on("click", function () {
    if (mezclando) {
      return;
    }

    vaciarVaso();
    $("#resultado")
      .removeClass("fisico quimica")
      .addClass("neutro")
      .html(`
        <span class="resultado-etiqueta">Resultado:</span>
        <h3>Esperando mezcla</h3>
        <p>Arrastra dos elementos al vaso (o haz clic en ellos) y presiona Mezclar.</p>
      `);
  });

  $("#btnLimpiar").on("click", function () {
    if (numeroPrueba === 0) {
      return;
    }

    numeroPrueba = 0;
    conResultado = 0;
    sinResultado = 0;
    $("#tablaBitacora").html('<tr class="vacio"><td colspan="6">Aún no hay pruebas registradas.</td></tr>');
    $("#statTotal, #statReacciones, #statSin").text("0");
    mostrarAviso("Bitácora limpiada");
  });

  $(".filtro").on("click", function () {
    $(".filtro").removeClass("activo");
    $(this).addClass("activo");
    filtroActual = $(this).attr("data-filtro");
    aplicarFiltro();
  });

  $("#listaCatalogo").on("click", ".descubierto", function () {
    if (mezclando) {
      return;
    }

    let id = Number($(this).attr("data-id"));
    let exp = experimentos.filter(function (x) {
      return x.id === id;
    })[0];

    vaciarVaso();
    seleccion = [exp.reactivos[0], exp.reactivos[1]];
    mostrarSeleccion();
    mostrarAviso("Elementos cargados: presiona Mezclar");
  });

  cargarElementos();
});
