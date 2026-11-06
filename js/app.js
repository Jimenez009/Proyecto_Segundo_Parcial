document.addEventListener("DOMContentLoaded", () => {
    // Selectores del DOM
    const btnLanzar = document.getElementById("btn-lanzar");
    const statusDisplay = document.getElementById("status-display");
    const modalResumen = document.getElementById("modal-resumen");
    const resumenTexto = document.getElementById("resumen-texto");
    const btnReiniciar = document.getElementById("btn-reiniciar");

    // Botones de control específico
    const btnEnfriar = document.getElementById("btn-enfriar");
    const btnInyectar = document.getElementById("btn-inyectar");
    const btnRecargar = document.getElementById("btn-recargar");
    const btnCorregir = document.getElementById("btn-corregir");

    const valCombustible = document.getElementById("val-combustible");
    const barCombustible = document.getElementById("bar-combustible");
    const valTemperatura = document.getElementById("val-temperatura");
    const barTemperatura = document.getElementById("bar-temperatura");
    const valEnergia = document.getElementById("val-energia");
    const barEnergia = document.getElementById("bar-energia");
    const valTrayectoria = document.getElementById("val-trayectoria");

    // Declaras tu objeto con valores por defecto por si falla el fetch
    let estadoMision = {
        combustible: 100,
        temperatura: 25,
        energia: 100,
        trayectoria: 0,
        enCurso: false,
        tiempoRestante: 60
    };

    // Cargar parámetros iniciales desde el JSON por AJAX
    fetch('../datos/misiones.json')
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el archivo JSON");
            return response.json();
        })
        .then(data => {
            // Asignamos los valores reales que vienen del JSON
            estadoMision.combustible = data.combustibleInicial;
            estadoMision.temperatura = data.temperaturaInicial;
            estadoMision.energia = data.energiaInicial;
            estadoMision.trayectoria = data.trayectoriaInicial;
            estadoMision.tiempoRestante = data.duracionSegundos;

            statusDisplay.textContent = `Misión "${data.nombre}" cargada con éxito. Listo para despegue.`;
            actualizarUI(); // Refrescamos la interfaz con los datos del JSON
        })
        .catch(error => {
            statusDisplay.textContent = "Usando parámetros locales de respaldo. Listo.";
        });

    // Secuencia de Lanzamiento
    btnLanzar.addEventListener("click", () => {
        btnLanzar.disabled = true;
        let cuentaRegresiva = 5;
        statusDisplay.textContent = `Iniciando secuencia en ${cuentaRegresiva}...`;

        const timerCuenta = setInterval(() => {
            cuentaRegresiva--;
            if (cuentaRegresiva > 0) {
                statusDisplay.textContent = `Despegue inminente en ${cuentaRegresiva}...`;
            } else {
                clearInterval(timerCuenta);
                iniciarSimulacionVuelo();
            }
        }, 1000);
    });

    function iniciarSimulacionVuelo() {
        estadoMision.enCurso = true;
        estadoMision.tiempoRestante = 60; // Reiniciar cronómetro a 60 segundos
        statusDisplay.textContent = "¡Despegue exitoso! Sostén el vuelo por 1 minuto...";

        intervaloSimulacion = setInterval(() => {
            // Reducir el tiempo de la misión cada segundo
            estadoMision.tiempoRestante--;

            // Dificultad Progresiva: A menor tiempo restante, mayor desgaste base por segundo
            let factorDificultad = estadoMision.tiempoRestante < 20 ? 3 : (estadoMision.tiempoRestante < 40 ? 2 : 1);

            estadoMision.combustible -= Math.floor(Math.random() * 2) + factorDificultad;
            estadoMision.energia -= Math.floor(Math.random() * 2) + factorDificultad;

            // Apagar botones por defecto en este ciclo
            desactivarTodosLosControles();

            // Eventos aleatorios de fallas (Entre más avanza el tiempo, más probabilidad de fallas agresivas)
            let eventoAleatorio = Math.random();

            if (eventoAleatorio < 0.28) {
                estadoMision.temperatura += (15 * factorDificultad);
                statusDisplay.textContent = `⚠️ [T-${estadoMision.tiempo}s] ¡Sobrecalentamiento crítico! ¡Enfría los motores!`;
                btnEnfriar.disabled = false; 

            } else if (eventoAleatorio >= 0.28 && eventoAleatorio < 0.55) {
                estadoMision.combustible -= (6 * factorDificultad);
                statusDisplay.textContent = `⚠️ [T-${estadoMision.tiempoRestante}s] ¡Fuga de combustible! ¡Inyecta reserva!`;
                btnInyectar.disabled = false;

            } else if (eventoAleatorio >= 0.55 && eventoAleatorio < 0.80) {
                estadoMision.energia -= (8 * factorDificultad);
                statusDisplay.textContent = `⚠️ [T-${estadoMision.tiempoRestante}s] ¡Cortocircuito eléctrico! ¡Recarga energía!`;
                btnRecargar.disabled = false;

            } else if (eventoAleatorio >= 0.80) {
                let desviacionDelta = (Math.floor(Math.random() * 8) - 3) * factorDificultad;
                estadoMision.trayectoria += desviacionDelta;
                statusDisplay.textContent = `⚠️ [T-${estadoMision.tiempoRestante}s] ¡Tormenta de radiación! ¡Corrige el rumbo!`;
                btnCorregir.disabled = false;

            } else {
                statusDisplay.textContent = `🚀 Vuelo en curso... Tiempo restante: ${estadoMision.tiempoRestante}s`;
            }

            actualizarUI();
            verificarCondicionesFinMision();

        }, 1000); // Se ejecuta cada 1 segundo exacto para medir el minuto de juego
    }

    
    btnEnfriar.addEventListener("click", () => {
        if (!estadoMision.enCurso) return;
        estadoMision.temperatura = Math.max(25, estadoMision.temperatura - 35);
        statusDisplay.textContent = "❄️ Motores enfriados con éxito.";
        btnEnfriar.disabled = true;
        actualizarUI();
    });

    btnInyectar.addEventListener("click", () => {
        if (!estadoMision.enCurso) return;
        estadoMision.combustible = Math.min(100, estadoMision.combustible + 25);
        statusDisplay.textContent = "⛽ Combustible inyectado correctamente.";
        btnInyectar.disabled = true;
        actualizarUI();
    });

    btnRecargar.addEventListener("click", () => {
        if (!estadoMision.enCurso) return;
        estadoMision.energia = Math.min(100, estadoMision.energia + 30);
        statusDisplay.textContent = "⚡ Baterías principales recargadas.";
        btnRecargar.disabled = true;
        actualizarUI();
    });

    btnCorregir.addEventListener("click", () => {
        if (!estadoMision.enCurso) return;
        estadoMision.trayectoria = 0;
        statusDisplay.textContent = "🎯 Rumbo corregido a 0° de desviación.";
        btnCorregir.disabled = true;
        actualizarUI();
    });

    function actualizarUI() {
        valCombustible.textContent = Math.max(0, estadoMision.combustible);
        barCombustible.value = Math.max(0, estadoMision.combustible);

        valTemperatura.textContent = estadoMision.temperatura;
        barTemperatura.value = estadoMision.temperatura;

        valEnergia.textContent = Math.max(0, estadoMision.energia);
        barEnergia.value = Math.max(0, estadoMision.energia);

        valTrayectoria.textContent = estadoMision.trayectoria;
    }

    function verificarCondicionesFinMision() {
        let motivo = "";
        let exito = false;

        // 1. Verificar si el usuario logró sobrevivir el minuto completo (ÉXITO)
        if (estadoMision.tiempoRestante <= 0) {
            motivo = "¡Increíble pilotaje! Has completado el minuto completo de vuelo espacial con éxito.";
            exito = true;
        } 
        // 2. Condición de Fracaso si falla antes del minuto
        else if (estadoMision.combustible <= 0 || estadoMision.energia <= 0) {
            motivo = "Misión fallida: La nave colapsó por agotamiento total de recursos antes de cumplir el minuto.";
            exito = false;
        } else if (estadoMision.temperatura >= 140) {
            motivo = "Misión fallida: Fusión térmica en los propulsores antes de completar el tiempo.";
            exito = false;
        } else if (Math.abs(estadoMision.trayectoria) >= 30) {
            motivo = "Misión fallida: La nave se salió de la órbita de seguridad antes de los 60 segundos.";
            exito = false;
        }

        if (motivo !== "") {
            finalizarMision(exito, motivo);
        }
    }

    function finalizarMision(exito, mensaje) {
        clearInterval(intervaloSimulacion);
        estadoMision.enCurso = false;
        desactivarTodosLosControles();

        resumenTexto.innerHTML = `
            <strong>${exito ? "✨ ¡MISIÓN EXITOSA!" : "💥 ¡MISIÓN FRACASADA!"}</strong><br><br>
            ${mensaje}<br><br>
            - Tiempo sobrerevivido: ${60 - estadoMision.tiempoRestante} / 60 segundos<br>
            - Combustible final: ${Math.max(0, estadoMision.combustible)}%<br>
            - Temperatura final: ${estadoMision.temperatura}°C<br>
            - Energía final: ${Math.max(0, estadoMision.energia)}%
        `;
        modalResumen.classList.remove("hidden");
    }

    btnReiniciar.addEventListener("click", () => {
        window.location.reload();
    });
});