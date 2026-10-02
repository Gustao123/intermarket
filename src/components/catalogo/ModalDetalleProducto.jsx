import React, { useState, useEffect, useMemo, useRef } from "react";
import { Modal, Button, Form, Spinner, Carousel } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../database/supabaseconfig";
import { useAuth } from "../../context/AuthContext";
import ModalTienda from "./ModalTienda";

const TIEMPO_LIMITE_MS = 6000;

const consultaSegura = async (consulta, valorPorDefecto = null, ms = TIEMPO_LIMITE_MS) => {
  let temporizador;
  try {
    const timeout = new Promise((resolve) => {
      temporizador = setTimeout(() => {
        resolve({ data: valorPorDefecto, error: { message: "tiempo_agotado" } });
      }, ms);
    });
    return await Promise.race([Promise.resolve(consulta), timeout]);
  } catch (error) {
    return { data: valorPorDefecto, error };
  } finally {
    clearTimeout(temporizador);
  }
};

const cacheDetalles = new Map();
const DURACION_CACHE_MS = 2 * 60 * 1000;

const obtenerTiendaInicial = (producto) => {
  if (!producto?.id_tienda) return null;
  const tiendaRelacion = Array.isArray(producto?.tiendas)
    ? producto.tiendas[0]
    : producto?.tiendas;
  return {
    id_tienda: producto.id_tienda,
    nombre_tienda:
      tiendaRelacion?.nombre_tienda || producto?.nombre_tienda || "Tienda",
    imagen_url: tiendaRelacion?.imagen_url || null,
  };
};

const obtenerVendedorInicial = (producto) => {
  const tiendaRelacion = Array.isArray(producto?.tiendas)
    ? producto.tiendas[0]
    : producto?.tiendas;
  const perfiles = tiendaRelacion?.perfiles;
  if (Array.isArray(perfiles)) return perfiles[0] || null;
  return perfiles || null;
};

const ModalDetalleProducto = ({
  mostrar,
  setMostrar,
  producto,
  agregarAlCarrito,
}) => {
  const { user } = useAuth();
  const idCargaActualRef = useRef(0);

  const [tienda, setTienda] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [mostrarModalTienda, setMostrarModalTienda] = useState(false);
  const [esMiProducto, setEsMiProducto] = useState(false);

  const [resenas, setResenas] = useState([]);
  const [calificacionesTienda, setCalificacionesTienda] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [comprado, setComprado] = useState(false);

  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [colorSeleccionado, setColorSeleccionado] = useState("");
  const [productoDetalle, setProductoDetalle] = useState(producto);

  const [nuevaResena, setNuevaResena] = useState({
    calificacion: 5,
    comentario: "",
  });
  const [nuevaCalificacionTienda, setNuevaCalificacionTienda] = useState({
    puntuacion: 5,
    comentario: "",
  });

  const [mostrarQR, setMostrarQR] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  const idProducto = producto?.id_producto;

  const enlaceProducto = useMemo(() => {
    if (!idProducto) return "";
    const origenDev = "http://192.168.1.25:5173";
    const origen =
      typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? window.location.origin
        : origenDev;
    return `${origen}/catalogo?producto=${idProducto}`;
  }, [idProducto]);

  const copiarEnlace = async () => {
    if (!enlaceProducto) return;
    try {
      await navigator.clipboard.writeText(enlaceProducto);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      alert("No se pudo copiar el enlace");
    }
  };

  const compartirProducto = async () => {
    const nombre =
      productoDetalle?.nombre_producto ||
      producto?.nombre_producto ||
      "Producto";
    if (navigator.share) {
      try {
        await navigator.share({
          title: nombre,
          text: `Mira este producto en InterMarket: ${nombre}`,
          url: enlaceProducto,
        });
      } catch {
        // canceló
      }
    } else {
      await copiarEnlace();
    }
  };

  useEffect(() => {
    if (!mostrar || !producto?.id_producto) {
      idCargaActualRef.current += 1;
      return;
    }

    setTallaSeleccionada("");
    setColorSeleccionado("");
    setProductoDetalle(producto);
    setErrorCarga(false);
    setMostrarQR(false);
    setEnlaceCopiado(false);
    setTienda(obtenerTiendaInicial(producto));
    setVendedor(obtenerVendedorInicial(producto));
    setPerfilUsuario(null);
    setEsMiProducto(false);
    setResenas([]);
    setCalificacionesTienda([]);
    setComprado(false);

    const cache = cacheDetalles.get(producto.id_producto);
    if (cache && Date.now() - cache.guardadoEn < DURACION_CACHE_MS) {
      setProductoDetalle(cache.productoDetalle || producto);
      setTienda(cache.tienda || null);
      setVendedor(cache.vendedor || null);
      setResenas(cache.resenas || []);
      setCalificacionesTienda(cache.calificacionesTienda || []);
      setCargando(false);
    }
    cargarDetalles(Boolean(cache));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar, producto?.id_producto, user?.id]);

  const ultimoReintentoRef = useRef(0);
  const reintentoTimerRef = useRef(null);

  useEffect(() => {
    const programarReintento = () => {
      if (
        !mostrar ||
        !producto?.id_producto ||
        document.visibilityState !== "visible"
      ) {
        return;
      }
      const ahora = Date.now();
      if (ahora - ultimoReintentoRef.current < 800) return;
      ultimoReintentoRef.current = ahora;
      if (reintentoTimerRef.current) clearTimeout(reintentoTimerRef.current);
      setErrorCarga(false);
      reintentoTimerRef.current = setTimeout(() => {
        if (
          mostrar &&
          producto?.id_producto &&
          document.visibilityState === "visible"
        ) {
          cargarDetalles(true);
        }
      }, 700);
    };

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") {
        idCargaActualRef.current += 1;
        setCargando(false);
        if (reintentoTimerRef.current) clearTimeout(reintentoTimerRef.current);
        return;
      }
      programarReintento();
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("focus", programarReintento);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("focus", programarReintento);
      if (reintentoTimerRef.current) clearTimeout(reintentoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar, producto?.id_producto, user?.id]);

  const cargarDetalles = async (cargaEnSegundoPlano = false) => {
    if (!producto?.id_producto) {
      setCargando(false);
      return;
    }

    idCargaActualRef.current += 1;
    const idCarga = idCargaActualRef.current;
    const esCargaVigente = () => idCargaActualRef.current === idCarga;

    if (!cargaEnSegundoPlano) setCargando(true);
    setErrorCarga(false);

    try {
      const promesas = [
        consultaSegura(
          supabase
            .from("productos")
            .select("*, categorias(nombre_categoria)")
            .eq("id_producto", producto.id_producto)
            .maybeSingle(),
          producto,
          6000
        ),
        producto.id_tienda
          ? consultaSegura(
              supabase
                .from("tiendas")
                .select("*")
                .eq("id_tienda", producto.id_tienda)
                .maybeSingle(),
              null,
              6000
            )
          : Promise.resolve({ data: null, error: null }),
        consultaSegura(
          supabase
            .from("reseñas_productos")
            .select("*, perfiles(usuarios(username))")
            .eq("producto_id", producto.id_producto)
            .order("creado_en", { ascending: false }),
          [],
          6000
        ),
        user?.id
          ? consultaSegura(
              supabase
                .from("perfiles")
                .select("perfil_id, id_tienda")
                .eq("id_usuario", user.id)
                .maybeSingle(),
              null,
              6000
            )
          : Promise.resolve({ data: null, error: null }),
        producto.id_tienda
          ? consultaSegura(
              supabase
                .from("perfiles")
                .select("*, usuarios(username)")
                .eq("id_tienda", producto.id_tienda)
                .maybeSingle(),
              null,
              6000
            )
          : Promise.resolve({ data: null, error: null }),
        producto.id_tienda
          ? consultaSegura(
              supabase
                .from("calificaciones_tiendas")
                .select("*, perfiles(usuarios(username))")
                .eq("tienda_id", producto.id_tienda)
                .order("creado_en", { ascending: false }),
              [],
              6000
            )
          : Promise.resolve({ data: [], error: null }),
      ];

      const [
        productoResultado,
        tiendaResultado,
        resenasResultado,
        miPerfilResultado,
        vendedorResultado,
        califTiendaResultado,
      ] = await Promise.all(promesas);

      if (!esCargaVigente()) return;

      const detalleFinal = productoResultado?.data || producto;
      const tiendaFinal =
        tiendaResultado?.data || obtenerTiendaInicial(producto) || null;
      const vendedorFinal =
        vendedorResultado?.data || obtenerVendedorInicial(producto) || null;
      const resenasFinal = Array.isArray(resenasResultado?.data)
        ? resenasResultado.data
        : [];
      const calificacionesFinal = Array.isArray(califTiendaResultado?.data)
        ? califTiendaResultado.data
        : [];
      const miPerfil = miPerfilResultado?.data || null;

      setProductoDetalle(detalleFinal);
      setTienda(tiendaFinal);
      setVendedor(vendedorFinal);
      setResenas(resenasFinal);
      setCalificacionesTienda(calificacionesFinal);
      setPerfilUsuario(miPerfil);
      setEsMiProducto(
        Boolean(miPerfil && miPerfil.id_tienda === producto.id_tienda)
      );

      const erroresSecundarios = [
        tiendaResultado?.error,
        resenasResultado?.error,
        vendedorResultado?.error,
        califTiendaResultado?.error,
      ].filter(Boolean);

      if (erroresSecundarios.length > 0) {
        console.warn("Datos secundarios no disponibles:", erroresSecundarios);
        cacheDetalles.delete(producto.id_producto);
      } else {
        cacheDetalles.set(producto.id_producto, {
          guardadoEn: Date.now(),
          productoDetalle: detalleFinal,
          tienda: tiendaFinal,
          vendedor: vendedorFinal,
          resenas: resenasFinal,
          calificacionesTienda: calificacionesFinal,
        });
      }

      if (productoResultado?.error && !detalleFinal) setErrorCarga(true);
      if (!miPerfil?.perfil_id) {
        setComprado(false);
        return;
      }

      const pedidosResultado = await consultaSegura(
        supabase
          .from("pedidos")
          .select("id_pedido")
          .eq("perfil_id", miPerfil.perfil_id)
          .eq("id_producto", producto.id_producto)
          .gte("id_estado", 2)
          .limit(1),
        [],
        5000
      );

      if (!esCargaVigente()) return;
      if (pedidosResultado?.error) {
        setComprado(false);
        return;
      }
      const pedidos = pedidosResultado?.data || [];
      setComprado(Array.isArray(pedidos) && pedidos.length > 0);
    } catch (error) {
      console.error("Error inesperado al cargar detalles:", error);
      if (esCargaVigente()) setErrorCarga(false);
    } finally {
      if (esCargaVigente()) setCargando(false);
    }
  };

  const enviarResenaProducto = async (e) => {
    e.preventDefault();
    if (!nuevaResena.comentario.trim()) return;
    if (!perfilUsuario?.perfil_id) {
      alert(
        "No se pudo identificar tu perfil de usuario. Intenta recargar la página."
      );
      return;
    }
    try {
      const { error } = await supabase.from("reseñas_productos").insert([
        {
          producto_id: producto.id_producto,
          comprador_id: perfilUsuario.perfil_id,
          calificacion: nuevaResena.calificacion,
          comentario: nuevaResena.comentario,
        },
      ]);
      if (error) {
        if (error.code === "23505") {
          alert("Ya has dejado una reseña para este producto.");
        } else {
          throw error;
        }
        return;
      }
      setNuevaResena({ calificacion: 5, comentario: "" });
      cargarDetalles();
    } catch (error) {
      console.error("Error al enviar reseña:", error);
      alert(
        "Error al enviar la reseña: " + (error.message || "Error desconocido")
      );
    }
  };

  const enviarCalificacionTienda = async (e) => {
    e.preventDefault();
    if (!nuevaCalificacionTienda.comentario.trim()) return;
    try {
      const { error } = await supabase.from("calificaciones_tiendas").insert([
        {
          tienda_id: producto.id_tienda,
          comprador_id: perfilUsuario.perfil_id,
          puntuacion: nuevaCalificacionTienda.puntuacion,
          comentario: nuevaCalificacionTienda.comentario,
        },
      ]);
      if (error) throw error;
      setNuevaCalificacionTienda({ puntuacion: 5, comentario: "" });
      cargarDetalles();
    } catch (error) {
      console.error("Error al enviar calificación:", error);
      alert("No se pudo calificar. Solo puedes calificar a la tienda una vez.");
    }
  };

  const Estrellas = ({ valor }) => (
    <span style={{ color: "#f59e0b" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`bi bi-star${s <= valor ? "-fill" : ""}`}></i>
      ))}
    </span>
  );

  const EstrellasInteractivas = ({ valor, setValor }) => {
    const [hover, setHover] = useState(0);
    return (
      <div className="mb-2" style={{ cursor: "pointer", fontSize: "1.35rem" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <i
            key={s}
            className={`bi bi-star${s <= (hover || valor) ? "-fill" : ""} me-1`}
            style={{ color: "#f59e0b" }}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValor(s)}
          ></i>
        ))}
      </div>
    );
  };

  const PromedioEstrellas = ({ datos, campo }) => {
    if (!datos || datos.length === 0) {
      return <span className="text-muted small">Sin calificaciones</span>;
    }
    const promedio = Math.round(
      datos.reduce((a, c) => a + c[campo], 0) / datos.length
    );
    return <Estrellas valor={promedio} />;
  };

  const asegurarArray = (valor) => {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    if (typeof valor === "string") {
      if (valor.startsWith("{") && valor.endsWith("}")) {
        return valor
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, ""));
      }
      return valor
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }
    return [];
  };

  if (!producto) return null;

  const tallas = asegurarArray(productoDetalle?.tallas);
  const colores = asegurarArray(productoDetalle?.colores);
  const stock = productoDetalle?.stock ?? producto.stock;
  const precioVenta = parseFloat(
    productoDetalle?.precio_venta || producto.precio_venta || 0
  );
  const precioOriginal = parseFloat(
    productoDetalle?.precio_original || producto.precio_original || 0
  );
  const tieneOferta = precioOriginal > precioVenta && precioOriginal > 0;
  const puedeComprar =
    !esMiProducto &&
    stock !== 0 &&
    !(tallas.length > 0 && !tallaSeleccionada) &&
    !(colores.length > 0 && !colorSeleccionado);

  const chipBase = {
    border: "1.5px solid #e5e7eb",
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: "0.82rem",
    fontWeight: 600,
    background: "#fff",
    color: "#374151",
    minWidth: 44,
    transition: "all 0.15s ease",
  };

  const chipActivo = {
    ...chipBase,
    borderColor: "#0d5c63",
    background: "#e6f4f6",
    color: "#0d5c63",
  };

  const nombreTienda =
    tienda?.nombre_tienda ||
    productoDetalle?.tiendas?.nombre_tienda ||
    producto?.tiendas?.nombre_tienda ||
    "Tienda";

  return (
    <>
      <Modal
        show={mostrar}
        onHide={() => setMostrar(false)}
        size="lg"
        centered
        contentClassName="border-0 overflow-hidden"
        dialogClassName="modal-detalle-producto-dialog"
      >
        <div className="mdp-body position-relative">
          {/* ========== IMAGEN ========== */}
          <div className="mdp-img-wrap">
            <button
              type="button"
              className="mdp-close-float"
              onClick={() => setMostrar(false)}
              aria-label="Cerrar"
            >
              <i className="bi bi-arrow-left"></i>
            </button>

            {producto.imagen_url && producto.imagen_url.length > 1 ? (
              <Carousel
                variant="dark"
                interval={3000}
                pause="hover"
                indicators={false}
              >
                {producto.imagen_url.map((url, idx) => (
                  <Carousel.Item key={idx}>
                    <img
                      src={url}
                      alt={`${producto.nombre_producto} ${idx + 1}`}
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
            ) : producto.imagen_url?.[0] ? (
              <img
                src={producto.imagen_url[0]}
                alt={producto.nombre_producto}
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ height: 280, color: "#94a3b8" }}
              >
                <i className="bi bi-image" style={{ fontSize: "3rem" }}></i>
              </div>
            )}

            <div className="mdp-img-actions">
              {stock !== undefined && stock !== null ? (
                <span className="mdp-badge-stock">
                  {stock === 0
                    ? "Sin stock"
                    : stock <= 5
                    ? `¡Quedan ${stock}!`
                    : `${stock} en stock`}
                </span>
              ) : (
                <span />
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="mdp-btn-qr"
                  onClick={() => setMostrarQR(true)}
                >
                  Ver QR
                </button>
                <button
                  type="button"
                  className="mdp-btn-qr mdp-btn-share"
                  onClick={compartirProducto}
                  aria-label="Compartir"
                  title="Compartir"
                >
                  <i className="bi bi-share"></i>
                </button>
              </div>
            </div>
          </div>

          {/* ========== CONTENIDO ========== */}
          <div className="mdp-content">
            {cargando && (
              <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                <Spinner animation="border" size="sm" />
                Actualizando...
              </div>
            )}

            {errorCarga && (
              <div className="alert alert-warning py-2 small d-flex justify-content-between align-items-center">
                <span>Algunos datos no se actualizaron.</span>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => cargarDetalles(false)}
                >
                  Reintentar
                </Button>
              </div>
            )}

            <h2 className="mdp-title">
              {productoDetalle?.nombre_producto || producto.nombre_producto}
            </h2>

            <div className="mb-1">
              {tieneOferta && (
                <span className="mdp-price-old">
                  C$ {precioOriginal.toFixed(2)}
                </span>
              )}
              <span className="mdp-price">C$ {precioVenta.toFixed(2)}</span>
            </div>

            {/* ===== TIENDA (diseño corregido) ===== */}
            {tienda && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: "12px 14px",
                  margin: "14px 0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  width: "100%",
                }}
              >
                <div
                  onClick={() => setMostrarModalTienda(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flex: "1 1 auto",
                    minWidth: 0,
                    cursor: "pointer",
                  }}
                >
                  {tienda.imagen_url ? (
                    <img
                      src={tienda.imagen_url}
                      alt=""
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: "#0d5c63",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "1rem",
                      }}
                    >
                      <i className="bi bi-shop"></i>
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      Vendido por
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {nombreTienda}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarModalTienda(true)}
                  style={{
                    flex: "0 0 auto",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 14px",
                    background: "#0d5c63",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    width: "auto",
                    maxWidth: "none",
                  }}
                >
                  Ver tienda
                </button>
              </div>
            )}

            {tallas.length > 0 && (
              <div>
                <div className="mdp-label">Talla</div>
                <div className="mdp-chips">
                  {tallas.map((talla) => (
                    <button
                      key={talla}
                      type="button"
                      style={
                        tallaSeleccionada === talla ? chipActivo : chipBase
                      }
                      onClick={() => setTallaSeleccionada(talla)}
                    >
                      {talla}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colores.length > 0 && (
              <div>
                <div className="mdp-label">Color</div>
                <div className="mdp-chips">
                  {colores.map((color) => (
                    <button
                      key={color}
                      type="button"
                      style={
                        colorSeleccionado === color ? chipActivo : chipBase
                      }
                      onClick={() => setColorSeleccionado(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {((tallas.length > 0 && !tallaSeleccionada) ||
              (colores.length > 0 && !colorSeleccionado)) && (
              <small className="text-danger d-block mb-2">
                * Selecciona{" "}
                {tallas.length > 0 && !tallaSeleccionada ? "talla" : ""}
                {tallas.length > 0 &&
                !tallaSeleccionada &&
                colores.length > 0 &&
                !colorSeleccionado
                  ? " y "
                  : ""}
                {colores.length > 0 && !colorSeleccionado ? "color" : ""}
              </small>
            )}

            {(productoDetalle?.descripcion || producto.descripcion) && (
              <p
                className="text-secondary small mb-3"
                style={{ lineHeight: 1.45 }}
              >
                {productoDetalle?.descripcion || producto.descripcion}
              </p>
            )}

            {esMiProducto ? (
              <div className="alert alert-warning border-0 rounded-4 small mb-3">
                Este producto es de tu tienda. No puedes comprarlo.
              </div>
            ) : stock === 0 ? (
              <div className="alert alert-danger border-0 rounded-4 small mb-3">
                Producto agotado.
              </div>
            ) : (
              <button
                type="button"
                className="mdp-btn-primary"
                disabled={!puedeComprar}
                onClick={() => {
                  agregarAlCarrito({
                    ...(productoDetalle || producto),
                    talla_seleccionada: tallaSeleccionada,
                    color_seleccionado: colorSeleccionado,
                  });
                  setMostrar(false);
                }}
              >
                <i className="bi bi-cart-plus me-2"></i>
                Añadir al carrito
              </button>
            )}

            {user && !esMiProducto && tienda && (
              <div className="mdp-review-box mb-3">
                <div className="mdp-label mb-1">Calificar tienda</div>
                <div className="mb-1">
                  <small className="text-muted me-2">Reputación:</small>
                  <PromedioEstrellas
                    datos={calificacionesTienda}
                    campo="puntuacion"
                  />
                </div>
                <Form onSubmit={enviarCalificacionTienda}>
                  <EstrellasInteractivas
                    valor={nuevaCalificacionTienda.puntuacion}
                    setValor={(val) =>
                      setNuevaCalificacionTienda({
                        ...nuevaCalificacionTienda,
                        puntuacion: val,
                      })
                    }
                  />
                  <Form.Control
                    size="sm"
                    as="textarea"
                    rows={2}
                    placeholder="Opinión sobre la tienda..."
                    className="mb-2 rounded-3"
                    value={nuevaCalificacionTienda.comentario}
                    onChange={(e) =>
                      setNuevaCalificacionTienda({
                        ...nuevaCalificacionTienda,
                        comentario: e.target.value,
                      })
                    }
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="w-100 rounded-pill border-0"
                    style={{ background: "#0d5c63" }}
                  >
                    Enviar calificación
                  </Button>
                </Form>
              </div>
            )}

            <div className="mdp-review-box">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong style={{ color: "#0f172a" }}>
                  Reseña del producto
                </strong>
                <PromedioEstrellas datos={resenas} campo="calificacion" />
              </div>

              {user && !esMiProducto ? (
                <Form onSubmit={enviarResenaProducto} className="mb-3">
                  <EstrellasInteractivas
                    valor={nuevaResena.calificacion}
                    setValor={(val) =>
                      setNuevaResena({ ...nuevaResena, calificacion: val })
                    }
                  />
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Deja un comentario"
                    className="mb-2 rounded-3"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                    value={nuevaResena.comentario}
                    onChange={(e) =>
                      setNuevaResena({
                        ...nuevaResena,
                        comentario: e.target.value,
                      })
                    }
                  />
                  <Button
                    type="submit"
                    className="w-100 rounded-pill border-0 fw-semibold"
                    style={{ background: "#0d5c63", padding: "10px" }}
                  >
                    Comentar
                  </Button>
                </Form>
              ) : !user ? (
                <div className="small text-muted mb-2">
                  Inicia sesión para dejar una reseña.
                </div>
              ) : null}

              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {resenas.length > 0 ? (
                  resenas.map((resena) => (
                    <div key={resena.id_resena} className="mdp-review-item">
                      <div className="mdp-review-avatar">
                        <i className="bi bi-person"></i>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between gap-2">
                          <strong className="small text-truncate">
                            {resena.perfiles?.usuarios?.username || "Usuario"}
                          </strong>
                          <Estrellas valor={resena.calificacion} />
                        </div>
                        <p className="small text-muted mb-0 mt-1">
                          {resena.comentario}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted small text-center py-2 mb-0">
                    Aún no hay reseñas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal
        show={mostrarQR}
        onHide={() => setMostrarQR(false)}
        centered
        contentClassName="border-0"
        dialogClassName="mdp-qr-overlay"
      >
        <Modal.Body className="text-center p-4">
          {enlaceProducto ? (
            <>
              <div
                className="d-inline-block p-3 mb-3"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                }}
              >
                <QRCodeSVG
                  value={enlaceProducto}
                  size={200}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#111827"
                />
              </div>
              <Button
                className="w-100 rounded-pill border-0 fw-semibold"
                style={{ background: "#0d5c63", padding: "12px" }}
                onClick={copiarEnlace}
              >
                {enlaceCopiado ? "¡Enlace copiado!" : "Copiar enlace"}
              </Button>
            </>
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
      </Modal>

      {/* Modal Tienda */}
      {tienda && (
        <ModalTienda
          mostrar={mostrarModalTienda}
          onCerrar={() => setMostrarModalTienda(false)}
          tiendaId={tienda.id_tienda}
          onVerProducto={() => setMostrarModalTienda(false)}
        />
      )}
    </>
  );
};

export default ModalDetalleProducto;