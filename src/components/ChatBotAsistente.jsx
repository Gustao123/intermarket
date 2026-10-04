import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { preguntarGemini } from "../services/geminiService";

import capiBurbuja from "../assets/capi_burbuja.jpeg";
import capiChat from "../assets/capi_chat.jpeg";

const CapiAvatar = () => <img src={capiBurbuja} alt="Capi" />;

/* ===========================================================
   CACHE DEL CHAT
=========================================================== */
const CHAT_CACHE_KEY = "intermarket_chat_cache_v2";
const MAX_CACHE_MESSAGES = 50;

const guardarChatCache = (mensajes) => {
  try {
    const ultimos = mensajes.slice(-MAX_CACHE_MESSAGES);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(ultimos));
  } catch (e) {
    console.error("Error guardando cache:", e);
  }
};

const cargarChatCache = () => {
  try {
    const cache = localStorage.getItem(CHAT_CACHE_KEY);
    return cache ? JSON.parse(cache) : [];
  } catch {
    return [];
  }
};

const eliminarChatCache = () => {
  localStorage.removeItem(CHAT_CACHE_KEY);
};

const obtenerPrimeraImagen = (producto) => {
  const raw = producto?.imagen_url ?? producto?.url_imagenes ?? null;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] || null;
  return raw;
};

/* ===========================================================
   MANUAL INTERMARKET
=========================================================== */
const MANUAL_INTERMARKET = `
Eres el asistente virtual oficial de InterMarket.
InterMarket es una tienda en línea de Nicaragua donde las personas compran y venden productos.

REGLAS DE COMUNICACIÓN OBLIGATORIAS:
1. Usa un lenguaje EXTREMADAMENTE SENCILLO, claro y directo.
2. Habla como si le explicaras a un usuario que no sabe nada de tecnología o que se confunde rápido.
3. No uses palabras técnicas ni difíciles (evita términos como "plataforma", "suscripción", "categorías", "interfaz", etc.).
4. Responde con frases muy cortas y claras.
5. Si explicas un proceso, usa listas numeradas simples (1, 2, 3...).
6. Sé super amable, paciente y servicial.
7. Nunca inventes productos, precios, colores ni tiendas.
8. Si no encuentras un producto, di simplemente: "No encontré ese producto en la tienda".
9. No uses formato Markdown (nada de asteriscos ni negritas). Responde solo en texto plano.
10. Da respuestas directas de no más de 3 o 4 líneas cuando sea posible.
`.trim();

const sugerencias = [
  "¿Cómo compro?",
  "Ver ofertas",
  "Buscar ropa",
];

const limpiarMarkdown = (texto) =>
  String(texto || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const formatearHora = (fecha) => {
  try {
    return new Date(fecha).toLocaleTimeString("es-NI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const enlaceMapa = (tienda) => {
  if (!tienda) return null;
  if (tienda.latitud && tienda.longitud) {
    return `https://www.google.com/maps/dir/?api=1&destination=${tienda.latitud},${tienda.longitud}`;
  }
  if (tienda.direccion) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${tienda.direccion}, Nicaragua`
    )}`;
  }
  return null;
};

/* ===========================================================
   COMPONENTE PRINCIPAL
=========================================================== */
const ChatBotAsistente = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const finRef = useRef(null);
  const mensajesBoxRef = useRef(null);

  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);

  const mensajeBienvenida = useMemo(
    () => ({
      id: 1,
      de: "bot",
      texto:
        "¡Hola! Te doy la bienvenida a InterMarket.\n\nPuedo ayudarte a buscar ropa, zapatos, ver ofertas o explicarte cómo comprar fácil. ¿Qué estás buscando hoy?",
      fecha: new Date().toISOString(),
    }),
    []
  );

  const [mensajes, setMensajes] = useState([mensajeBienvenida]);
  const mensajesRef = useRef(mensajes);

  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  useEffect(() => {
    const historial = cargarChatCache();
    if (historial.length > 0) {
      setMensajes(historial);
    }
  }, []);

  useEffect(() => {
    guardarChatCache(mensajes);
  }, [mensajes]);

  const scrollAlFinal = () => {
    if (mensajesBoxRef.current) {
      const el = mensajesBoxRef.current;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (finRef.current) {
      finRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(scrollAlFinal, 60);
    return () => clearTimeout(t);
  }, [mensajes, pensando, abierto]);

  const rutasOcultas = [
    "/login",
    "/registro",
    "/seleccion-rol",
    "/suscripcion",
  ];

  const path =
    (location.pathname || "").toLowerCase().replace(/\/$/, "") || "/";

  const ocultar =
    rutasOcultas.includes(path) ||
    role === "admin" ||
    role === "vendedor";

  const agregarUsuario = (texto) => {
    const mensaje = {
      id: Date.now() + Math.random(),
      de: "user",
      texto,
      fecha: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, mensaje]);
  };

  const agregarBot = (respuesta) => {
    const r =
      typeof respuesta === "string" ? { texto: respuesta } : respuesta || {};

    const mensaje = {
      id: Date.now() + Math.random(),
      de: "bot",
      texto: limpiarMarkdown(r.texto),
      fecha: new Date().toISOString(),
      productos: (r.productos || []).map((p) => ({
        id: p.id_producto,
        nombre: p.nombre_producto,
        precio: p.precio_venta,
        tienda: p.tiendas?.nombre_tienda || "General",
        imagen: obtenerPrimeraImagen(p),
      })),
      tiendas: (r.tiendas || []).map((t) => ({
        id: t.id_tienda,
        nombre: t.nombre_tienda,
        direccion: t.direccion || "",
        enlace: enlaceMapa(t),
        imagen: t.imagen_url || null,
      })),
    };
    setMensajes((prev) => [...prev, mensaje]);
  };

  const verEnCatalogo = (producto) => {
    setAbierto(false);
    navigate(`/catalogo?producto=${producto.id}`, {
      state: { productoId: producto.id, nombre: producto.nombre },
    });
  };

  const nuevoChat = () => {
    eliminarChatCache();
    setMensajes([mensajeBienvenida]);
    setEntrada("");
  };

  const eliminarHistorial = () => {
    const confirmar = window.confirm(
      "¿Quieres borrar todo lo que hemos hablado?"
    );
    if (!confirmar) return;
    eliminarChatCache();
    setMensajes([mensajeBienvenida]);
  };

  /* ===========================================================
     CONSULTAS SUPABASE
  =========================================================== */
  const obtenerProductos = async () => {
    const { data, error } = await supabase.from("productos").select(`
        *,
        tiendas(id_tienda,nombre_tienda,direccion,latitud,longitud,imagen_url),
        categorias(id_categoria,nombre_categoria)
      `);
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  };

  const obtenerCategorias = async () => {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre_categoria");
    return data || [];
  };

  const obtenerTiendas = async () => {
    const { data } = await supabase.from("tiendas").select("*");
    return data || [];
  };

  const obtenerPedidos = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id_producto,id_tienda,cantidad,precio_unitario");
    return data || [];
  };

  const obtenerCalificaciones = async () => {
    const { data } = await supabase
      .from("calificaciones_tiendas")
      .select("tienda_id,puntuacion");
    return data || [];
  };

  const productosMasVendidos = async () => {
    const pedidos = await obtenerPedidos();
    const productos = await obtenerProductos();
    if (!pedidos.length)
      return "Todavía no hay productos comprados en la tienda.";

    const contador = {};
    pedidos.forEach((p) => {
      contador[p.id_producto] =
        (contador[p.id_producto] || 0) + Number(p.cantidad || 0);
    });

    const ranking = Object.entries(contador)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let respuesta = "Lo que más compra la gente:\n\n";
    const lista = [];
    ranking.forEach(([id, cantidad], index) => {
      const producto = productos.find((p) => p.id_producto === id);
      if (!producto) return;
      lista.push(producto);
      respuesta += `${index + 1}. ${producto.nombre_producto}
Precio: C$${producto.precio_venta}
Vendido: ${cantidad} veces
De la tienda: ${producto.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return { texto: respuesta, productos: lista };
  };

  const tiendasMejorValoradas = async () => {
    const tiendas = await obtenerTiendas();
    const calificaciones = await obtenerCalificaciones();
    if (!calificaciones.length)
      return "Todavía no hay tiendas calificadas por los clientes.";

    const mapa = {};
    calificaciones.forEach((c) => {
      if (!mapa[c.tienda_id]) mapa[c.tienda_id] = [];
      mapa[c.tienda_id].push(Number(c.puntuacion));
    });

    const ranking = Object.entries(mapa)
      .map(([id, arr]) => ({
        id,
        promedio: arr.reduce((a, b) => a + b, 0) / arr.length,
        opiniones: arr.length,
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);

    let texto = "Las mejores tiendas según la gente:\n\n";
    const lista = [];
    ranking.forEach((t, index) => {
      const tienda = tiendas.find((x) => x.id_tienda === t.id);
      if (tienda) lista.push(tienda);
      texto += `${index + 1}. ${tienda?.nombre_tienda || "Tienda"}
Puntaje: ${t.promedio.toFixed(1)} de 5 estrellas
\n`;
    });
    return { texto, tiendas: lista };
  };

  const listarCategorias = async () => {
    const categorias = await obtenerCategorias();
    if (!categorias.length)
      return "No hay tipos de productos guardados en este momento.";

    return (
      "Tenemos de todo un poco:\n\n" +
      categorias.map((c) => `- ${c.nombre_categoria}`).join("\n")
    );
  };

  const obtenerOfertas = async () => {
    const productos = await obtenerProductos();
    const ofertas = productos.filter(
      (p) =>
        p.precio_original &&
        Number(p.precio_original) > Number(p.precio_venta)
    );

    if (!ofertas.length)
      return "Por ahora no tenemos ofertas con descuento en la tienda.";

    let texto = "Productos en rebaja hoy:\n\n";
    const lista = ofertas.slice(0, 5);
    lista.forEach((p) => {
      texto += `• ${p.nombre_producto}
Antes: C$${p.precio_original}
Ahora: C$${p.precio_venta}
Tienda: ${p.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return { texto, productos: lista };
  };

  const ubicacionTienda = async (pregunta) => {
    const tiendas = await obtenerTiendas();
    if (!tiendas.length) return "Por ahora no hay tiendas guardadas.";

    const texto = norm(pregunta);
    const encontradas = tiendas.filter(
      (t) => t.nombre_tienda && texto.includes(norm(t.nombre_tienda))
    );

    if (!encontradas.length) {
      const nombres = tiendas
        .slice(0, 8)
        .map((t) => `- ${t.nombre_tienda}`)
        .join("\n");
      return `¿De cuál tienda quieres saber? Tenemos:\n\n${nombres}`;
    }

    const conEnlace = encontradas.filter((t) => enlaceMapa(t));
    if (!conEnlace.length) {
      return "Esa tienda todavía no tiene su ubicación guardada.";
    }

    const t = conEnlace[0];
    return {
      texto: `La tienda ${t.nombre_tienda} está en: ${
        t.direccion || "ubicación en el mapa"
      }.\n\nToca el botón para ver cómo llegar.`,
      tiendas: [t],
    };
  };

  const buscarProducto = async (pregunta) => {
    const productos = await obtenerProductos();
    const texto = pregunta
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    const ignorar = [
      "en",
      "que",
      "donde",
      "encuentro",
      "buscar",
      "busca",
      "hay",
      "quiero",
      "una",
      "un",
      "el",
      "la",
      "los",
      "las",
      "de",
      "para",
      "con",
      "color",
      "talla",
    ];

    const palabras = texto
      .split(/\s+/)
      .filter((p) => p.length > 1 && !ignorar.includes(p));

    if (!palabras.length) {
      return "Por favor dime qué producto buscas (ejemplo: camisa, zapatos, reloj).";
    }

    const encontrados = productos.filter((producto) => {
      const nombre = (producto.nombre_producto || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const descripcion = (producto.descripcion || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const categoria = (producto.categorias?.nombre_categoria || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const tienda = (producto.tiendas?.nombre_tienda || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const tallas = (producto.tallas || []).map((t) => t.toLowerCase());
      const colores = (producto.colores || []).map((c) => c.toLowerCase());

      return palabras.every(
        (palabra) =>
          nombre.includes(palabra) ||
          descripcion.includes(palabra) ||
          categoria.includes(palabra) ||
          tienda.includes(palabra) ||
          tallas.some((t) => t.includes(palabra)) ||
          colores.some((c) => c.includes(palabra))
      );
    });

    if (!encontrados.length) {
      return "No encontré ningún producto que coincida con lo que buscas.";
    }

    let respuesta = `Encontré esto para ti:\n\n`;
    const lista = encontrados.slice(0, 5);
    lista.forEach((p) => {
      respuesta += `• ${p.nombre_producto}
Precio: C$${p.precio_venta}
Quedan: ${p.stock} disponibles
Tienda: ${p.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return { texto: respuesta, productos: lista };
  };

  const construirContexto = async () => {
    const productos = await obtenerProductos();
    const categorias = await obtenerCategorias();
    const tiendas = await obtenerTiendas();

    let contexto = "PRODUCTOS DISPONIBLES:\n";
    productos.forEach((p) => {
      contexto += `
Producto: ${p.nombre_producto}
Precio: C$${p.precio_venta}
Stock: ${p.stock}
Categoría: ${p.categorias?.nombre_categoria || "Sin categoría"}
Tienda: ${p.tiendas?.nombre_tienda || "Sin tienda"}
Tallas: ${p.tallas?.join(", ") || "No aplica"}
Colores: ${p.colores?.join(", ") || "No aplica"}
Descripción: ${p.descripcion || "Sin descripción"}
`;
    });

    contexto += "\nCATEGORÍAS:\n";
    categorias.forEach((c) => {
      contexto += `- ${c.nombre_categoria}\n`;
    });

    contexto += "\nTIENDAS:\n";
    tiendas.forEach((t) => {
      contexto += `
${t.nombre_tienda}
Dirección: ${t.direccion || "No especificada"}
`;
    });

    return { contexto, productos };
  };

  const construirHistorialGemini = (preguntaActual) => {
    const historial = mensajesRef.current.slice(-12).map((m) => ({
      role: m.de === "user" ? "user" : "model",
      parts: [{ text: m.texto }],
    }));

    historial.push({
      role: "user",
      parts: [{ text: preguntaActual }],
    });

    return historial;
  };

  const consultarGeminiIA = async (pregunta) => {
    try {
      const { contexto: contextoBD, productos } = await construirContexto();
      const contents = construirHistorialGemini(pregunta);
      const systemInstruction = `${MANUAL_INTERMARKET}\n\nINFORMACIÓN EN TIEMPO REAL DE LA TIENDA:\n${contextoBD}`;

      const respuestaTexto = await preguntarGemini(
        contents,
        systemInstruction
      );

      const texto = limpiarMarkdown(
        respuestaTexto || "No pude encontrar la respuesta."
      );

      const textoNorm = norm(texto);
      const mencionados = productos
        .filter(
          (p) =>
            p.nombre_producto &&
            textoNorm.includes(norm(p.nombre_producto))
        )
        .slice(0, 3);

      return { texto, productos: mencionados };
    } catch (error) {
      console.error("Gemini Error:", error);
      if (error.message?.includes("UNAVAILABLE")) {
        return "Estoy algo ocupado. Por favor, intenta de nuevo en un segundo.";
      }
      return "No pude conectarme para responderte. Intenta de nuevo.";
    }
  };

  const responder = async (textoUsuario) => {
    const texto = textoUsuario
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (
      /(catalogo|productos)/.test(texto) &&
      /(ir|abrir|ver|mostrar)/.test(texto)
    ) {
      navigate("/catalogo");
      return "Listo, te llevo a ver todos los productos.";
    }

    if (/(perfil|mi cuenta)/.test(texto) && user) {
      navigate("/perfil");
      return "Te llevo a tu perfil.";
    }

    if (/(mensajes|chat vendedor|contactar vendedor)/.test(texto)) {
      navigate("/mensajes");
      return "Te llevo a tus mensajes con los vendedores.";
    }

    if (
      /(donde esta|donde queda|\bqueda\b|ubicacion|ubicada|direccion|como llego|como llegar|mapa)/.test(
        texto
      )
    ) {
      return await ubicacionTienda(textoUsuario);
    }

    if (
      /(mas vendido|productos mas vendidos|producto popular|top producto)/.test(
        texto
      )
    ) {
      return await productosMasVendidos();
    }

    if (
      /(mejor tienda|mejor valorada|ranking tiendas|tiendas mejor valoradas)/.test(
        texto
      )
    ) {
      return await tiendasMejorValoradas();
    }

    if (/(categorias|categoria disponible)/.test(texto)) {
      return await listarCategorias();
    }

    if (/(oferta|descuento|rebaja|promocion)/.test(texto)) {
      return await obtenerOfertas();
    }

    if (/(como compro|como comprar|carrito|pagar|pedido)/.test(texto)) {
      return `Comprar es facilísimo:
1. Toca el producto que te guste.
2. Elige tu talla o color.
3. Toca el botón azul "Agregar al carrito".
4. Entra al carrito y toca "Comprar".
5. ¡Listo! Espera a que el vendedor se contacte contigo.`;
    }

    if (/(vender|abrir tienda|crear tienda|suscripcion)/.test(texto)) {
      return `Para vender tus productos:
1. Registra tu cuenta como vendedor.
2. Entra a "Mis Tiendas" y crea tu tienda.
3. Sube las fotos y precios de lo que quieres vender.`;
    }

    if (/^(hola|buenas|hello|hey|ayuda)$/.test(texto.trim())) {
      return `¡Hola! Con gusto te ayudo. Puedes preguntarme cosas sencillas como:
- ¿Qué ropa o zapatos hay?
- ¿Cuáles son las ofertas de hoy?
- ¿Cómo se compra un producto?`;
    }

    if (
      /(color|talla|blanco|negro|rojo|azul|verde|talla s|talla m|talla l)/.test(
        texto
      )
    ) {
      return await consultarGeminiIA(textoUsuario);
    }

    if (
      /(camisa|blusa|pantalon|zapato|zapatilla|tenis|gorra|bolso|short|chaqueta|calcetin|cadena|diadema)/.test(
        texto
      )
    ) {
      return await buscarProducto(textoUsuario);
    }

    return await consultarGeminiIA(textoUsuario);
  };

  const enviar = async (mensajeLibre) => {
    const texto = (mensajeLibre ?? entrada).trim();
    if (!texto || pensando) return;

    setEntrada("");
    agregarUsuario(texto);
    setPensando(true);

    try {
      const respuesta = await responder(texto);
      agregarBot(respuesta);
    } catch (error) {
      console.error(error);
      agregarBot(
        "Tuve un pequeño problema para responder. Por favor prueba a preguntarme de nuevo."
      );
    } finally {
      setPensando(false);
    }
  };

  const manejarEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  if (ocultar) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Asistente InterMarket"
        className="chatbot-float"
        onClick={() => setAbierto(!abierto)}
      >
        {abierto ? (
          <i className="bi bi-x-lg chatbot-float-icon" />
        ) : (
          <>
            <CapiAvatar />
            <span className="chatbot-float-dot" />
          </>
        )}
      </button>

      {abierto && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-avatar">
              <CapiAvatar />
            </div>

            <div className="chatbot-header-info">
              <div className="nombre">CapiPro</div>
              <div className="subtitulo">Asistente de InterMarket</div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                onClick={nuevoChat}
                title="Nueva pregunta"
                aria-label="Nueva pregunta"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
              <button
                type="button"
                onClick={eliminarHistorial}
                title="Borrar chat"
                aria-label="Borrar chat"
              >
                <i className="bi bi-trash3"></i>
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                title="Cerrar"
                aria-label="Cerrar"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          <div className="chatbot-messages-wrap">
            <img className="chatbot-mascota-bg" src={capiChat} alt="" />

            <div className="chatbot-messages" ref={mensajesBoxRef}>
              {mensajes.map((mensaje) => (
                <div
                  key={mensaje.id}
                  className={`chatbot-message ${mensaje.de}`}
                >
                  {mensaje.de === "bot" && (
                    <div className="chatbot-avatar-mini">
                      <CapiAvatar />
                    </div>
                  )}

                  <div className="chatbot-bubble-wrap">
                    <div className="chatbot-bubble">{mensaje.texto}</div>

                    {/* TARJETAS DE PRODUCTOS CON IMAGEN */}
                    {mensaje.productos?.map((p) => (
                      <div key={p.id} className="chatbot-card">
                        {p.imagen ? (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="chatbot-card-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="chatbot-card-img chatbot-card-img-empty">
                            <i className="bi bi-box-seam"></i>
                          </div>
                        )}
                        <div className="chatbot-card-title">{p.nombre}</div>
                        <div className="chatbot-card-price">C${p.precio}</div>
                        <div className="chatbot-card-text">
                          Tienda: {p.tienda}
                        </div>
                        <button
                          type="button"
                          className="chatbot-btn"
                          onClick={() => verEnCatalogo(p)}
                        >
                          <i className="bi bi-eye-fill"></i>
                          Ver en catálogo
                        </button>
                      </div>
                    ))}

                    {/* TARJETAS DE TIENDAS */}
                    {mensaje.tiendas?.map((t) => (
                      <div key={t.id} className="chatbot-card">
                        {t.imagen && (
                          <img
                            src={t.imagen}
                            alt={t.nombre}
                            className="chatbot-card-img"
                            loading="lazy"
                          />
                        )}
                        <div className="chatbot-card-title">{t.nombre}</div>
                        {t.direccion && (
                          <div className="chatbot-card-text">
                            {t.direccion}
                          </div>
                        )}
                        {t.enlace && (
                          <a
                            href={t.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chatbot-btn"
                          >
                            <i className="bi bi-geo-alt-fill"></i>
                            Cómo llegar
                          </a>
                        )}
                      </div>
                    ))}

                    <div className="chatbot-timestamp">
                      {formatearHora(mensaje.fecha)}
                      {mensaje.de === "user" && (
                        <i className="bi bi-check2-all"></i>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {pensando && (
                <div className="chatbot-message bot">
                  <div className="chatbot-avatar-mini">
                    <CapiAvatar />
                  </div>
                  <div className="chatbot-bubble-wrap">
                    <div className="chatbot-bubble d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" />
                      Buscando...
                    </div>
                  </div>
                </div>
              )}

              <div ref={finRef} />
            </div>
          </div>

          <div className="chatbot-suggestions">
            {sugerencias.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                disabled={pensando}
                onClick={() => enviar(sugerencia)}
              >
                {sugerencia}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="chatbot-input"
          >
            <span className="chatbot-input-plus" aria-hidden="true">
              <i className="bi bi-plus-lg"></i>
            </span>

            <textarea
              rows={1}
              value={entrada}
              disabled={pensando}
              onKeyDown={manejarEnter}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Escribe un mensaje..."
            />

            <button
              type="submit"
              className="chatbot-send"
              disabled={pensando || !entrada.trim()}
            >
              {pensando ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </button>
          </form>

          <div className="chatbot-footer">
            Asistente sencillo de InterMarket
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBotAsistente;