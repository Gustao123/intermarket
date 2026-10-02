import React, { useEffect, useState, useMemo } from "react";
import {
  Container,
  Spinner,
  Button,
  Form,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Perfil = () => {
  const { user, session, logout } = useAuth();
  const navegar = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [pedidosCount, setPedidosCount] = useState(0);
  const [metodosPago, setMetodosPago] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotoUrl, setFotoUrl] = useState("");
  const [archivoNuevo, setArchivoNuevo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [notificacionesActivas, setNotificacionesActivas] = useState(true);

  // main | tienda | metodos | seguridad | reseñas | pedidos
  const [vistaActual, setVistaActual] = useState("main");
  const [textoBusqueda, setTextoBusqueda] = useState("");

  const [misResenas, setMisResenas] = useState([]);
  const [misCalifTienda, setMisCalifTienda] = useState([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);

  const [misPedidos, setMisPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevaTarjeta, setNuevaTarjeta] = useState({ tipo: "Visa", ultimo4: "" });
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);
  const [eliminandoTarjetaId, setEliminandoTarjetaId] = useState(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState({
    nombre: "",
    apellido: "",
    nombre_calle: "",
    descripcion: "",
    codigo_postal: "",
    numero_telefono: "",
  });
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [perfilRes, metodosRes, direccionesRes] = await Promise.all([
          supabase
            .from("perfiles")
            .select("*, usuarios(email, username, rol)")
            .eq("id_usuario", user.id)
            .maybeSingle(),
          supabase
            .from("metodos_pago")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", { ascending: false }),
          supabase
            .from("direcciones")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", { ascending: false }),
        ]);

        let perfilData = perfilRes.data;

        if (!perfilData) {
          try {
            const email = user.email || "";
            const username = email ? email.split("@")[0] : "usuario";
            await supabase.from("usuarios").upsert({
              id_usuario: user.id,
              username,
              email,
              rol: "comprador",
            });
            await supabase.from("perfiles").upsert({ id_usuario: user.id });
            const { data: retryData } = await supabase
              .from("perfiles")
              .select("*, usuarios(email, username, rol)")
              .eq("id_usuario", user.id)
              .maybeSingle();
            perfilData = retryData;
          } catch (err) {
            console.error("Error creando perfil de respaldo:", err);
          }
        }

        if (perfilData) {
          setPerfil(perfilData);
          setFotoUrl(perfilData.foto_perfil || "");
          setMetodosPago(metodosRes.data || []);
          setDirecciones(direccionesRes.data || []);

          if (perfilData.id_tienda) {
            const { data: tiendaData } = await supabase
              .from("tiendas")
              .select("*")
              .eq("id_tienda", perfilData.id_tienda)
              .maybeSingle();
            if (tiendaData) setTienda(tiendaData);
          }

          let pedidosQuery = supabase
            .from("pedidos")
            .select("id_pedido", { count: "exact", head: true });

          if (perfilData.rol === "vendedor" || user.rol === "vendedor") {
            if (perfilData.id_tienda) {
              pedidosQuery = pedidosQuery.eq("id_tienda", perfilData.id_tienda);
            }
          } else {
            pedidosQuery = pedidosQuery.eq("perfil_id", perfilData.perfil_id);
          }

          const { count } = await pedidosQuery;
          setPedidosCount(count || 0);
        }
      } catch (err) {
        console.error("Error al cargar datos de perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [user]);

  useEffect(() => {
    const cargarResenas = async () => {
      if (vistaActual !== "reseñas" || !perfil?.perfil_id) return;
      setCargandoResenas(true);
      try {
        const [resProd, resTienda] = await Promise.all([
          supabase
            .from("reseñas_productos")
            .select("*, productos(nombre_producto, imagen_url, precio_venta)")
            .eq("comprador_id", perfil.perfil_id)
            .order("creado_en", { ascending: false }),
          supabase
            .from("calificaciones_tiendas")
            .select("*, tiendas(nombre_tienda, imagen_url)")
            .eq("comprador_id", perfil.perfil_id)
            .order("creado_en", { ascending: false }),
        ]);
        setMisResenas(resProd.data || []);
        setMisCalifTienda(resTienda.data || []);
      } catch (err) {
        console.error("Error cargando reseñas:", err);
      } finally {
        setCargandoResenas(false);
      }
    };
    cargarResenas();
  }, [vistaActual, perfil?.perfil_id]);

  useEffect(() => {
    const cargarPedidos = async () => {
      if (vistaActual !== "pedidos" || !perfil?.perfil_id) return;
      setCargandoPedidos(true);
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select(`
            *,
            productos (nombre_producto, imagen_url, precio_venta),
            estados_pedido (nombre_estado)
          `)
          .eq("perfil_id", perfil.perfil_id)
          .order("creado_en", { ascending: false });

        if (error) throw error;
        setMisPedidos(data || []);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        try {
          const { data } = await supabase
            .from("pedidos")
            .select("*, productos(nombre_producto, imagen_url, precio_venta)")
            .eq("perfil_id", perfil.perfil_id)
            .order("creado_en", { ascending: false });
          setMisPedidos(data || []);
        } catch (e2) {
          console.error(e2);
        }
      } finally {
        setCargandoPedidos(false);
      }
    };
    cargarPedidos();
  }, [vistaActual, perfil?.perfil_id]);

  const manejarArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoNuevo(e.target.files[0]);
      setFotoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const guardarFoto = async () => {
    if (!perfil || !archivoNuevo) return;
    setGuardando(true);
    setMensaje({ texto: "", tipo: "" });
    try {
      const fileExt = archivoNuevo.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatares/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, archivoNuevo);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const urlFinal = publicUrlData.publicUrl;

      const { error } = await supabase
        .from("perfiles")
        .update({ foto_perfil: urlFinal })
        .eq("perfil_id", perfil.perfil_id);
      if (error) throw error;

      setFotoUrl(urlFinal);
      setArchivoNuevo(null);
      setMensaje({ texto: "Foto actualizada correctamente.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al actualizar la foto.", tipo: "danger" });
    } finally {
      setGuardando(false);
    }
  };

  const agregarNuevaTarjeta = async () => {
    if (!nuevaTarjeta.ultimo4 || nuevaTarjeta.ultimo4.length !== 4) {
      alert("Por favor, ingresa los últimos 4 dígitos.");
      return;
    }
    setGuardandoTarjeta(true);
    try {
      const { data, error } = await supabase
        .from("metodos_pago")
        .insert({
          id_usuario: user.id,
          id_stripe_customer: "cus_manual",
          id_stripe_payment_method: "pm_manual_" + Date.now(),
          ultimo4: nuevaTarjeta.ultimo4,
          tipo_metodo: nuevaTarjeta.tipo,
        })
        .select()
        .single();
      if (error) throw error;
      setMetodosPago([data, ...metodosPago]);
      setShowAddModal(false);
      setNuevaTarjeta({ tipo: "Visa", ultimo4: "" });
      setMensaje({ texto: "Tarjeta añadida correctamente.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al añadir la tarjeta.", tipo: "danger" });
    } finally {
      setGuardandoTarjeta(false);
    }
  };

  const eliminarTarjeta = async (id_metodo_pago) => {
    if (!window.confirm("¿Eliminar esta tarjeta?")) return;
    setEliminandoTarjetaId(id_metodo_pago);
    try {
      if (session?.access_token) {
        const response = await fetch(
          "/.netlify/functions/delete-payment-method",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ id_metodo_pago }),
          }
        );
        if (!response.ok) throw new Error("Error al eliminar");
      } else {
        const { error } = await supabase
          .from("metodos_pago")
          .delete()
          .eq("id_metodo_pago", id_metodo_pago);
        if (error) throw error;
      }
      setMetodosPago((prev) =>
        prev.filter((m) => m.id_metodo_pago !== id_metodo_pago)
      );
      setMensaje({ texto: "Tarjeta eliminada.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "No se pudo eliminar la tarjeta.", tipo: "danger" });
    } finally {
      setEliminandoTarjetaId(null);
    }
  };

  const agregarDireccion = async () => {
    if (!nuevaDireccion.nombre_calle || !nuevaDireccion.numero_telefono) {
      alert("Calle y teléfono son requeridos.");
      return;
    }
    setGuardandoDireccion(true);
    try {
      const { data, error } = await supabase
        .from("direcciones")
        .insert({ ...nuevaDireccion, id_usuario: user.id })
        .select()
        .single();
      if (error) throw error;
      setDirecciones([data, ...direcciones]);
      setShowAddressModal(false);
      setNuevaDireccion({
        nombre: "",
        apellido: "",
        nombre_calle: "",
        descripcion: "",
        codigo_postal: "",
        numero_telefono: "",
      });
      setMensaje({ texto: "Dirección añadida con éxito.", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMensaje({ texto: "Error al guardar dirección.", tipo: "danger" });
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const eliminarDireccion = async (id) => {
    if (!window.confirm("¿Eliminar esta dirección?")) return;
    try {
      const { error } = await supabase
        .from("direcciones")
        .delete()
        .eq("id_direccion", id);
      if (error) throw error;
      setDirecciones(direcciones.filter((d) => d.id_direccion !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar la dirección.");
    }
  };

  const handleCerrarSesion = async () => {
    if (!window.confirm("¿Seguro que quieres cerrar sesión?")) return;
    try {
      if (logout) await logout();
      else await supabase.auth.signOut();
      navegar("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const anioMiembro = perfil?.creado_en
    ? new Date(perfil.creado_en).getFullYear()
    : new Date().getFullYear();

  const nombreUsuario =
    perfil?.usuarios?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const nombreTienda = tienda
    ? `${tienda.nombre_tienda}${tienda.ciudad ? ` - ${tienda.ciudad}` : ""}`
    : "Sin tienda registrada";

  const labelStyle = {
    color: "#0d5c63",
    fontWeight: 600,
    fontSize: "0.9rem",
    marginBottom: "6px",
  };

  const inputStyle = {
    backgroundColor: "#e8f4f8",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "0.95rem",
  };

  const opcionesMenu = useMemo(
    () => [
      {
        id: "pedidos",
        titulo: "Historias de pedidos",
        sub: "Compras anteriores y en curso",
        icono: "cart3",
        vista: "pedidos",
      },
      {
        id: "tienda",
        titulo: "Dirección",
        sub: "Direcciones de envío",
        icono: "geo-alt",
        vista: "tienda",
      },
      {
        id: "metodos",
        titulo: "Metodo de pago",
        sub: "Tarjetas y cuentas vinculadas",
        icono: "credit-card",
        vista: "metodos",
      },
      {
        id: "seguridad",
        titulo: "Seguridad",
        sub: "Contraseña y verificacion",
        icono: "shield-lock",
        vista: "seguridad",
      },
      {
        id: "reseñas",
        titulo: "Historial de reseñas",
        sub: "Productos y tiendas que calificaste",
        icono: "star",
        vista: "reseñas",
      },
    ],
    []
  );

  const opcionesFiltradas = useMemo(() => {
    const q = textoBusqueda.trim().toLowerCase();
    if (!q) return opcionesMenu;
    return opcionesMenu.filter(
      (o) =>
        o.titulo.toLowerCase().includes(q) || o.sub.toLowerCase().includes(q)
    );
  }, [textoBusqueda, opcionesMenu]);

  const Estrellas = ({ valor }) => (
    <span style={{ color: "#f59e0b", fontSize: "0.85rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`bi bi-star${s <= valor ? "-fill" : ""}`} />
      ))}
    </span>
  );

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh" }}
      >
        <Spinner animation="border" style={{ color: "#0d5c63" }} />
      </div>
    );
  }

  if (!perfil) {
    return (
      <Container className="mt-5 text-center">
        <p>No se encontró información de perfil.</p>
      </Container>
    );
  }

  // ========== DIRECCIONES ==========
  if (vistaActual === "tienda") {
    return (
      <div style={{ backgroundColor: "#f7fafc", minHeight: "100vh", paddingBottom: 40 }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button className="btn p-0 border-0 bg-transparent" onClick={() => setVistaActual("main")}>
            <i className="bi bi-arrow-left" style={{ fontSize: "1.4rem", color: "#0f172a" }} />
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Dirección
          </h1>
        </div>

        <Container className="px-3 mt-3">
          {mensaje.texto && (
            <Alert
              variant={mensaje.tipo}
              className="rounded-4 border-0 shadow-sm mb-3"
              dismissible
              onClose={() => setMensaje({ texto: "", tipo: "" })}
            >
              {mensaje.texto}
            </Alert>
          )}

          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 style={{ fontWeight: 600, color: "#64748b", margin: 0 }}>
                Direcciones de envío
              </h6>
              <Button
                size="sm"
                className="rounded-pill border-0"
                style={{ backgroundColor: "#0d5c63", color: "white" }}
                onClick={() => setShowAddressModal(true)}
              >
                <i className="bi bi-plus-lg me-1" />
                Nueva
              </Button>
            </div>

            {direcciones.length === 0 ? (
              <div className="text-center py-4" style={{ backgroundColor: "white", borderRadius: 16 }}>
                <i className="bi bi-geo" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                <p className="text-muted mb-0 mt-2">No hay direcciones guardadas</p>
              </div>
            ) : (
              direcciones.map((dir) => (
                <div
                  key={dir.id_direccion}
                  className="mb-3 p-3"
                  style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="d-flex justify-content-between">
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {dir.nombre} {dir.apellido}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                        {dir.nombre_calle}
                      </div>
                      {dir.descripcion && (
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
                          {dir.descripcion}
                        </div>
                      )}
                      <div className="d-flex gap-3 mt-2" style={{ fontSize: "0.8rem" }}>
                        {dir.codigo_postal && (
                          <span className="badge bg-light text-dark border">
                            CP: {dir.codigo_postal}
                          </span>
                        )}
                        <span style={{ color: "#0d5c63" }}>
                          <i className="bi bi-telephone me-1" />
                          {dir.numero_telefono}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-link text-danger p-0"
                      onClick={() => eliminarDireccion(dir.id_direccion)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Container>

        {showAddressModal && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0" style={{ borderRadius: 20, overflow: "hidden" }}>
                <div className="modal-header border-0 px-4 pt-4 pb-2">
                  <h5 style={{ fontWeight: 700, color: "#0d5c63", margin: 0 }}>Nueva Dirección</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddressModal(false)} />
                </div>
                <div className="modal-body px-4">
                  <Row className="g-3">
                    <Col xs={6}>
                      <Form.Label style={labelStyle}>Nombre</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.nombre}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, nombre: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Label style={labelStyle}>Apellido</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.apellido}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, apellido: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label style={labelStyle}>Calle</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.nombre_calle}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, nombre_calle: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label style={labelStyle}>Referencia</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.descripcion}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, descripcion: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Label style={labelStyle}>Código postal</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.codigo_postal}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, codigo_postal: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Label style={labelStyle}>Teléfono</Form.Label>
                      <Form.Control
                        style={inputStyle}
                        value={nuevaDireccion.numero_telefono}
                        onChange={(e) =>
                          setNuevaDireccion({ ...nuevaDireccion, numero_telefono: e.target.value })
                        }
                      />
                    </Col>
                  </Row>
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <Button
                    className="w-100 rounded-pill border-0 fw-semibold"
                    style={{ backgroundColor: "#a8e0ef", color: "#0d5c63", padding: 12 }}
                    onClick={agregarDireccion}
                    disabled={guardandoDireccion}
                  >
                    {guardandoDireccion ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      "Guardar dirección"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== MÉTODOS DE PAGO ==========
  if (vistaActual === "metodos") {
    return (
      <div style={{ backgroundColor: "#f7fafc", minHeight: "100vh", paddingBottom: 40 }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button className="btn p-0 border-0 bg-transparent" onClick={() => setVistaActual("main")}>
            <i className="bi bi-arrow-left" style={{ fontSize: "1.4rem", color: "#0f172a" }} />
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Método de pago
          </h1>
        </div>

        <Container className="px-3 mt-3">
          {mensaje.texto && (
            <Alert
              variant={mensaje.tipo}
              className="rounded-4 border-0 shadow-sm mb-3"
              dismissible
              onClose={() => setMensaje({ texto: "", tipo: "" })}
            >
              {mensaje.texto}
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 style={{ fontWeight: 600, color: "#64748b", margin: 0 }}>Tus tarjetas</h6>
            <Button
              size="sm"
              className="rounded-pill border-0"
              style={{ backgroundColor: "#0d5c63", color: "white" }}
              onClick={() => setShowAddModal(true)}
            >
              <i className="bi bi-plus-lg me-1" />
              Nueva
            </Button>
          </div>

          {metodosPago.length === 0 ? (
            <div className="text-center py-4" style={{ backgroundColor: "white", borderRadius: 16 }}>
              <i className="bi bi-credit-card" style={{ fontSize: "2rem", color: "#94a3b8" }} />
              <p className="text-muted mb-0 mt-2">No hay tarjetas guardadas</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {metodosPago.map((metodo) => (
                <div
                  key={metodo.id_metodo_pago}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    color: "white",
                    background:
                      metodo.tipo_metodo === "Visa"
                        ? "linear-gradient(135deg, #1a1a1a 0%, #333 100%)"
                        : metodo.tipo_metodo === "Mastercard"
                        ? "linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)"
                        : "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <i
                      className={`bi bi-${
                        metodo.tipo_metodo === "Visa" ? "credit-card-2-front" : "credit-card"
                      }`}
                      style={{ fontSize: "1.6rem" }}
                    />
                    <button
                      className="btn btn-link text-white p-0 opacity-75"
                      onClick={() => eliminarTarjeta(metodo.id_metodo_pago)}
                      disabled={eliminandoTarjetaId === metodo.id_metodo_pago}
                    >
                      {eliminandoTarjetaId === metodo.id_metodo_pago ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        <i className="bi bi-trash" style={{ fontSize: "1.1rem" }} />
                      )}
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 700,
                      letterSpacing: "2px",
                      marginBottom: 20,
                    }}
                  >
                    **** **** **** {metodo.ultimo4}
                  </div>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.7 }}>
                        Tipo
                      </div>
                      <div style={{ fontWeight: 600 }}>{metodo.tipo_metodo || "Tarjeta"}</div>
                    </div>
                    <div className="text-end">
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.7 }}>
                        Guardada
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {new Date(metodo.creado_en).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>

        {showAddModal && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0" style={{ borderRadius: 20, overflow: "hidden" }}>
                <div className="modal-header border-0 px-4 pt-4 pb-2">
                  <h5 style={{ fontWeight: 700, color: "#0d5c63", margin: 0 }}>Añadir tarjeta</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
                </div>
                <div className="modal-body px-4">
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Tipo de tarjeta</Form.Label>
                    <Form.Select
                      style={inputStyle}
                      value={nuevaTarjeta.tipo}
                      onChange={(e) =>
                        setNuevaTarjeta({ ...nuevaTarjeta, tipo: e.target.value })
                      }
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                      <option value="Débito">Tarjeta de Débito</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label style={labelStyle}>Últimos 4 dígitos</Form.Label>
                    <Form.Control
                      style={inputStyle}
                      type="text"
                      maxLength={4}
                      placeholder="Ej: 4242"
                      value={nuevaTarjeta.ultimo4}
                      onChange={(e) =>
                        setNuevaTarjeta({
                          ...nuevaTarjeta,
                          ultimo4: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                    <Form.Text className="text-muted">
                      Por seguridad solo guardamos los últimos 4 números.
                    </Form.Text>
                  </Form.Group>
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <Button
                    className="w-100 rounded-pill border-0 fw-semibold"
                    style={{ backgroundColor: "#a8e0ef", color: "#0d5c63", padding: 12 }}
                    onClick={agregarNuevaTarjeta}
                    disabled={guardandoTarjeta}
                  >
                    {guardandoTarjeta ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      "Añadir tarjeta"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== SEGURIDAD ==========
  if (vistaActual === "seguridad") {
    return (
      <div style={{ backgroundColor: "#f7fafc", minHeight: "100vh", paddingBottom: 40 }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button className="btn p-0 border-0 bg-transparent" onClick={() => setVistaActual("main")}>
            <i className="bi bi-arrow-left" style={{ fontSize: "1.4rem", color: "#0f172a" }} />
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Seguridad
          </h1>
        </div>
        <Container className="px-3 mt-3">
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
              Aquí puedes gestionar contraseña y verificación de tu cuenta.
            </p>
          </div>
        </Container>
      </div>
    );
  }

  // ========== HISTORIAL DE RESEÑAS ==========
  if (vistaActual === "reseñas") {
    return (
      <div style={{ backgroundColor: "#f7fafc", minHeight: "100vh", paddingBottom: 40 }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button className="btn p-0 border-0 bg-transparent" onClick={() => setVistaActual("main")}>
            <i className="bi bi-arrow-left" style={{ fontSize: "1.4rem", color: "#0f172a" }} />
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Historial de reseñas
          </h1>
        </div>

        <Container className="px-3 mt-3">
          {cargandoResenas ? (
            <div className="text-center py-5">
              <Spinner animation="border" style={{ color: "#0d5c63" }} />
            </div>
          ) : (
            <>
              <h6 style={{ fontWeight: 600, color: "#64748b", marginBottom: 12 }}>
                Productos ({misResenas.length})
              </h6>

              {misResenas.length === 0 ? (
                <div
                  className="text-center py-4 mb-4"
                  style={{ backgroundColor: "white", borderRadius: 16 }}
                >
                  <i className="bi bi-star" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                  <p className="text-muted mb-0 mt-2">Aún no has reseñado productos</p>
                </div>
              ) : (
                misResenas.map((r) => {
                  const img = Array.isArray(r.productos?.imagen_url)
                    ? r.productos.imagen_url[0]
                    : r.productos?.imagen_url;
                  return (
                    <div
                      key={r.id_resena || r.id}
                      className="mb-3 p-3"
                      style={{
                        backgroundColor: "white",
                        borderRadius: 14,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="d-flex gap-3">
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#f1f5f9",
                            flexShrink: 0,
                          }}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                              <i className="bi bi-box-seam" />
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                            {r.productos?.nombre_producto || "Producto"}
                          </div>
                          <div className="mt-1">
                            <Estrellas valor={r.calificacion} />
                          </div>
                          {r.comentario && (
                            <p className="mb-0 mt-1" style={{ fontSize: "0.85rem", color: "#64748b" }}>
                              {r.comentario}
                            </p>
                          )}
                          {r.creado_en && (
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>
                              {new Date(r.creado_en).toLocaleDateString("es-NI")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <h6 style={{ fontWeight: 600, color: "#64748b", margin: "20px 0 12px" }}>
                Tiendas ({misCalifTienda.length})
              </h6>

              {misCalifTienda.length === 0 ? (
                <div className="text-center py-4" style={{ backgroundColor: "white", borderRadius: 16 }}>
                  <i className="bi bi-shop" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                  <p className="text-muted mb-0 mt-2">Aún no has calificado tiendas</p>
                </div>
              ) : (
                misCalifTienda.map((c) => (
                  <div
                    key={c.id || c.id_calificacion}
                    className="mb-3 p-3"
                    style={{
                      backgroundColor: "white",
                      borderRadius: 14,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="d-flex gap-3">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "#0d5c63",
                          color: "#fff",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {c.tiendas?.imagen_url ? (
                          <img
                            src={c.tiendas.imagen_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <i className="bi bi-shop" />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                          {c.tiendas?.nombre_tienda || "Tienda"}
                        </div>
                        <div className="mt-1">
                          <Estrellas valor={c.puntuacion} />
                        </div>
                        {c.comentario && (
                          <p className="mb-0 mt-1" style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            {c.comentario}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </Container>
      </div>
    );
  }

  // ========== HISTORIAS DE PEDIDOS ==========
  if (vistaActual === "pedidos") {
    const etiquetaEstado = (p) => {
      const nombre = p.estados_pedido?.nombre_estado;
      if (nombre) return nombre;
      const id = p.id_estado;
      if (id === 1) return "Pendiente";
      if (id === 2) return "En proceso";
      if (id === 3) return "Entregado";
      if (id === 4) return "Cancelado";
      return "En curso";
    };

    const colorEstado = (p) => {
      const t = (etiquetaEstado(p) || "").toLowerCase();
      if (t.includes("entreg")) return "#10b981";
      if (t.includes("cancel")) return "#ef4444";
      if (t.includes("proceso") || t.includes("curso")) return "#f59e0b";
      return "#0d5c63";
    };

    return (
      <div style={{ backgroundColor: "#f7fafc", minHeight: "100vh", paddingBottom: 40 }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button className="btn p-0 border-0 bg-transparent" onClick={() => setVistaActual("main")}>
            <i className="bi bi-arrow-left" style={{ fontSize: "1.4rem", color: "#0f172a" }} />
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Historias de pedidos
          </h1>
        </div>

        <Container className="px-3 mt-3">
          {cargandoPedidos ? (
            <div className="text-center py-5">
              <Spinner animation="border" style={{ color: "#0d5c63" }} />
            </div>
          ) : misPedidos.length === 0 ? (
            <div className="text-center py-5" style={{ backgroundColor: "white", borderRadius: 16 }}>
              <i className="bi bi-cart3" style={{ fontSize: "2.2rem", color: "#94a3b8" }} />
              <p className="text-muted mb-0 mt-2">Aún no tienes pedidos</p>
            </div>
          ) : (
            misPedidos.map((p) => {
              const img = Array.isArray(p.productos?.imagen_url)
                ? p.productos.imagen_url[0]
                : p.productos?.imagen_url;
              const precio =
                p.monto_total ?? p.total ?? p.productos?.precio_venta ?? 0;

              return (
                <div
                  key={p.id_pedido}
                  className="mb-3 p-3"
                  style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="d-flex gap-3">
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f1f5f9",
                        flexShrink: 0,
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                          <i className="bi bi-box-seam" />
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="d-flex justify-content-between gap-2">
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                          {p.productos?.nombre_producto || `Pedido #${p.id_pedido}`}
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: colorEstado(p),
                            whiteSpace: "nowrap",
                          }}
                        >
                          {etiquetaEstado(p)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#0d5c63",
                          marginTop: 4,
                        }}
                      >
                        C${" "}
                        {Number(precio).toLocaleString("es-NI", {
                          minimumFractionDigits: 2,
                        })}
                      </div>

                      {p.creado_en && (
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                          {new Date(p.creado_en).toLocaleDateString("es-NI", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Container>
      </div>
    );
  }

  // ========== VISTA PRINCIPAL ==========
  return (
    <div
      style={{
        backgroundColor: "#f7fafc",
        minHeight: "100vh",
        paddingBottom: "90px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="px-3 pt-3 pb-2">
        <div
          style={{
            fontSize: "0.8rem",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#0d5c63",
              display: "inline-block",
            }}
          />
          Mi cuenta
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 14px",
            lineHeight: 1.2,
          }}
        >
          Perfil
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 999,
            padding: "10px 16px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
            backdropFilter: "blur(8px)",
          }}
        >
          <i className="bi bi-search" style={{ color: "#94a3b8", fontSize: "1rem" }} />
          <input
            type="search"
            placeholder="Buscar en tu cuenta..."
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              flex: 1,
              fontSize: "0.95rem",
              color: "#0f172a",
            }}
          />
          {textoBusqueda && (
            <button
              type="button"
              onClick={() => setTextoBusqueda("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
        </div>
      </div>

      <Container className="px-3">
        {mensaje.texto && (
          <Alert
            variant={mensaje.tipo}
            className="rounded-4 border-0 shadow-sm mt-2 mb-3"
            dismissible
            onClose={() => setMensaje({ texto: "", tipo: "" })}
          >
            {mensaje.texto}
          </Alert>
        )}

        <div
          className="mt-2 mb-4"
          style={{
            backgroundColor: "#e8f4f8",
            borderRadius: 20,
            padding: "24px 20px 20px",
            textAlign: "center",
          }}
        >
          <div className="position-relative d-inline-block mb-3">
            <img
              src={
                fotoUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  nombreUsuario
                )}&background=0d5c63&color=fff&size=128`
              }
              alt="Foto de perfil"
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <label
              htmlFor="upload-photo"
              className="position-absolute bottom-0 end-0 d-flex align-items-center justify-content-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#0d5c63",
                color: "white",
                cursor: "pointer",
                border: "2px solid white",
              }}
            >
              <i className="bi bi-pencil-fill" style={{ fontSize: "0.7rem" }} />
              <input
                type="file"
                id="upload-photo"
                className="d-none"
                accept="image/*"
                onChange={manejarArchivo}
              />
            </label>
          </div>

          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 4,
            }}
          >
            {nombreUsuario}
          </h2>

          <div
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#0d5c63",
                display: "inline-block",
              }}
            />
            {nombreTienda}
          </div>

          <div
            className="d-flex justify-content-around"
            style={{
              borderTop: "1px solid rgba(13, 92, 99, 0.12)",
              paddingTop: 16,
            }}
          >
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                {tienda ? 1 : 0}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Tienda</div>
            </div>
            <div style={{ width: 1, backgroundColor: "rgba(13, 92, 99, 0.12)" }} />
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                {pedidosCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Pedidos</div>
            </div>
            <div style={{ width: 1, backgroundColor: "rgba(13, 92, 99, 0.12)" }} />
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                {anioMiembro}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Miembro desde</div>
            </div>
          </div>

          {archivoNuevo && (
            <Button
              size="sm"
              className="mt-3 rounded-pill px-4 border-0"
              style={{ backgroundColor: "#0d5c63", color: "white" }}
              onClick={guardarFoto}
              disabled={guardando}
            >
              {guardando ? <Spinner size="sm" animation="border" /> : "Guardar foto"}
            </Button>
          )}
        </div>

        <div className="mb-4">
          <h6
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            Cuenta
          </h6>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {opcionesFiltradas.length === 0 ? (
              <div className="text-center text-muted py-4" style={{ fontSize: "0.9rem" }}>
                No hay resultados para “{textoBusqueda}”
              </div>
            ) : (
              opcionesFiltradas.map((op, idx) => (
                <button
                  key={op.id}
                  className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
                  style={{
                    padding: "16px 18px",
                    borderBottom:
                      idx < opcionesFiltradas.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}
                  onClick={() => setVistaActual(op.vista)}
                >
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#e8f4f8",
                      color: "#0d5c63",
                      flexShrink: 0,
                    }}
                  >
                    <i className={`bi bi-${op.icono}`} style={{ fontSize: "1.15rem" }} />
                  </div>
                  <div className="flex-grow-1">
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>
                      {op.titulo}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{op.sub}</div>
                  </div>
                  <i
                    className="bi bi-chevron-right"
                    style={{ color: "#cbd5e1", fontSize: "1.1rem" }}
                  />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mb-4">
          <h6
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            Preferencias
          </h6>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="d-flex align-items-center gap-3"
              style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#e8f4f8",
                  color: "#0d5c63",
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-shield-check" style={{ fontSize: "1.15rem" }} />
              </div>
              <div className="flex-grow-1">
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>
                  Notificaciones
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Pedidos y alertas de stock
                </div>
              </div>
              <Form.Check
                type="switch"
                id="switch-notificaciones"
                checked={notificacionesActivas}
                onChange={(e) => setNotificacionesActivas(e.target.checked)}
                style={{ transform: "scale(1.15)" }}
              />
            </div>

            <button
              className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
              style={{ padding: "16px 18px" }}
              onClick={handleCerrarSesion}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-box-arrow-right" style={{ fontSize: "1.15rem" }} />
              </div>
              <div className="flex-grow-1">
                <div style={{ fontWeight: 600, color: "#ef4444", fontSize: "0.95rem" }}>
                  Cerrar sesion
                </div>
              </div>
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Perfil;