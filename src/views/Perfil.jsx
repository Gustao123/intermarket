import React, { useEffect, useState } from "react";
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

  // ============================================================
  // DATOS
  // ============================================================
  const [perfil, setPerfil] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [pedidosCount, setPedidosCount] = useState(0);
  const [metodosPago, setMetodosPago] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotoUrl, setFotoUrl] = useState("");
  const [archivoNuevo, setArchivoNuevo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({
    texto: "",
    tipo: "",
  });
  const [notificacionesActivas, setNotificacionesActivas] =
    useState(true);

  // ============================================================
  // VISTAS INTERNAS
  // main | tienda | metodos | seguridad
  // ============================================================
  const [vistaActual, setVistaActual] = useState("main");

  // ============================================================
  // MÉTODOS DE PAGO
  // ============================================================
  const [showAddModal, setShowAddModal] = useState(false);

  const [nuevaTarjeta, setNuevaTarjeta] = useState({
    tipo: "Visa",
    ultimo4: "",
  });

  const [guardandoTarjeta, setGuardandoTarjeta] =
    useState(false);

  const [eliminandoTarjetaId, setEliminandoTarjetaId] =
    useState(null);

  // ============================================================
  // DIRECCIONES
  // ============================================================
  const [showAddressModal, setShowAddressModal] =
    useState(false);

  const [nuevaDireccion, setNuevaDireccion] = useState({
    nombre: "",
    apellido: "",
    nombre_calle: "",
    descripcion: "",
    codigo_postal: "",
    numero_telefono: "",
  });

  const [guardandoDireccion, setGuardandoDireccion] =
    useState(false);

  // ============================================================
  // CARGAR DATOS
  // ============================================================
  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [
          perfilRes,
          metodosRes,
          direccionesRes,
        ] = await Promise.all([
          // PERFIL
          supabase
            .from("perfiles")
            .select("*, usuarios(email, username, rol)")
            .eq("id_usuario", user.id)
            .maybeSingle(),

          // MÉTODOS DE PAGO
          supabase
            .from("metodos_pago")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", {
              ascending: false,
            }),

          // ======================================================
          // DIRECCIONES PERSONALES DEL USUARIO
          // ======================================================
          supabase
            .from("direcciones")
            .select("*")
            .eq("id_usuario", user.id)
            .order("creado_en", {
              ascending: false,
            }),
        ]);

        let perfilData = perfilRes.data;

        // ======================================================
        // CREAR PERFIL SI NO EXISTE
        // ======================================================
        if (!perfilData) {
          try {
            const email = user.email || "";

            const username = email
              ? email.split("@")[0]
              : "usuario";

            await supabase.from("usuarios").upsert({
              id_usuario: user.id,
              username,
              email,
              rol: "comprador",
            });

            await supabase
              .from("perfiles")
              .upsert({
                id_usuario: user.id,
              });

            const { data: retryData } =
              await supabase
                .from("perfiles")
                .select(
                  "*, usuarios(email, username, rol)"
                )
                .eq("id_usuario", user.id)
                .maybeSingle();

            perfilData = retryData;
          } catch (err) {
            console.error(
              "Error creando perfil de respaldo:",
              err
            );
          }
        }

        // ======================================================
        // PROCESAR PERFIL
        // ======================================================
        if (perfilData) {
          setPerfil(perfilData);

          setFotoUrl(
            perfilData.foto_perfil || ""
          );

          setMetodosPago(
            metodosRes.data || []
          );

          // ====================================================
          // IMPORTANTE:
          // ESTAS SON ÚNICAMENTE LAS DIRECCIONES PERSONALES
          // ====================================================
          setDirecciones(
            direccionesRes.data || []
          );

          // ====================================================
          // CARGAR TIENDA
          //
          // Esto se mantiene porque el perfil principal
          // utiliza el nombre de la tienda.
          //
          // PERO esta información NO se muestra dentro
          // de la sección Dirección.
          // ====================================================
          if (perfilData.id_tienda) {
            const { data: tiendaData } =
              await supabase
                .from("tiendas")
                .select("*")
                .eq(
                  "id_tienda",
                  perfilData.id_tienda
                )
                .maybeSingle();

            if (tiendaData) {
              setTienda(tiendaData);
            }
          }

          // ====================================================
          // CONTAR PEDIDOS
          // ====================================================
          let pedidosQuery = supabase
            .from("pedidos")
            .select("id_pedido", {
              count: "exact",
              head: true,
            });

          if (
            perfilData.rol === "vendedor" ||
            user.rol === "vendedor"
          ) {
            if (perfilData.id_tienda) {
              pedidosQuery = pedidosQuery.eq(
                "id_tienda",
                perfilData.id_tienda
              );
            }
          } else {
            pedidosQuery = pedidosQuery.eq(
              "perfil_id",
              perfilData.perfil_id
            );
          }

          const { count } = await pedidosQuery;

          setPedidosCount(count || 0);
        }
      } catch (err) {
        console.error(
          "Error al cargar datos de perfil:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [user]);

  // ============================================================
  // FOTO
  // ============================================================
  const manejarArchivo = (e) => {
    if (
      e.target.files &&
      e.target.files[0]
    ) {
      setArchivoNuevo(e.target.files[0]);

      setFotoUrl(
        URL.createObjectURL(
          e.target.files[0]
        )
      );
    }
  };

  const guardarFoto = async () => {
    if (!perfil || !archivoNuevo) return;

    setGuardando(true);

    setMensaje({
      texto: "",
      tipo: "",
    });

    try {
      const fileExt =
        archivoNuevo.name.split(".").pop();

      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const filePath =
        `avatares/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("avatars")
        .upload(
          filePath,
          archivoNuevo
        );

      if (uploadError)
        throw uploadError;

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(
          filePath
        );

      const urlFinal =
        publicUrlData.publicUrl;

      const { error } =
        await supabase
          .from("perfiles")
          .update({
            foto_perfil: urlFinal,
          })
          .eq(
            "perfil_id",
            perfil.perfil_id
          );

      if (error) throw error;

      setFotoUrl(urlFinal);

      setArchivoNuevo(null);

      setMensaje({
        texto:
          "Foto actualizada correctamente.",
        tipo: "success",
      });
    } catch (err) {
      console.error(err);

      setMensaje({
        texto:
          "Error al actualizar la foto.",
        tipo: "danger",
      });
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // MÉTODOS DE PAGO
  // ============================================================
  const agregarNuevaTarjeta = async () => {
    if (
      !nuevaTarjeta.ultimo4 ||
      nuevaTarjeta.ultimo4.length !== 4
    ) {
      alert(
        "Por favor, ingresa los últimos 4 dígitos."
      );
      return;
    }

    setGuardandoTarjeta(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("metodos_pago")
        .insert({
          id_usuario: user.id,
          id_stripe_customer:
            "cus_manual",
          id_stripe_payment_method:
            "pm_manual_" +
            Date.now(),
          ultimo4:
            nuevaTarjeta.ultimo4,
          tipo_metodo:
            nuevaTarjeta.tipo,
        })
        .select()
        .single();

      if (error) throw error;

      setMetodosPago([
        data,
        ...metodosPago,
      ]);

      setShowAddModal(false);

      setNuevaTarjeta({
        tipo: "Visa",
        ultimo4: "",
      });

      setMensaje({
        texto:
          "Tarjeta añadida correctamente.",
        tipo: "success",
      });
    } catch (err) {
      console.error(err);

      setMensaje({
        texto:
          "Error al añadir la tarjeta.",
        tipo: "danger",
      });
    } finally {
      setGuardandoTarjeta(false);
    }
  };

  const eliminarTarjeta = async (
    id_metodo_pago
  ) => {
    const confirmar = window.confirm(
      "¿Eliminar esta tarjeta?"
    );

    if (!confirmar) return;

    setEliminandoTarjetaId(
      id_metodo_pago
    );

    try {
      if (session?.access_token) {
        const response =
          await fetch(
            "/.netlify/functions/delete-payment-method",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                id_metodo_pago,
              }),
            }
          );

        if (!response.ok)
          throw new Error(
            "Error al eliminar"
          );
      } else {
        const { error } =
          await supabase
            .from("metodos_pago")
            .delete()
            .eq(
              "id_metodo_pago",
              id_metodo_pago
            );

        if (error) throw error;
      }

      setMetodosPago(
        (prev) =>
          prev.filter(
            (m) =>
              m.id_metodo_pago !==
              id_metodo_pago
          )
      );

      setMensaje({
        texto: "Tarjeta eliminada.",
        tipo: "success",
      });
    } catch (err) {
      console.error(err);

      setMensaje({
        texto:
          "No se pudo eliminar la tarjeta.",
        tipo: "danger",
      });
    } finally {
      setEliminandoTarjetaId(null);
    }
  };

  // ============================================================
  // DIRECCIONES PERSONALES
  // ============================================================
  const agregarDireccion = async () => {
    if (
      !nuevaDireccion.nombre_calle ||
      !nuevaDireccion.numero_telefono
    ) {
      alert(
        "Calle y teléfono son requeridos."
      );
      return;
    }

    setGuardandoDireccion(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("direcciones")
        .insert({
          ...nuevaDireccion,
          id_usuario: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setDirecciones([
        data,
        ...direcciones,
      ]);

      setShowAddressModal(false);

      setNuevaDireccion({
        nombre: "",
        apellido: "",
        nombre_calle: "",
        descripcion: "",
        codigo_postal: "",
        numero_telefono: "",
      });

      setMensaje({
        texto:
          "Dirección añadida con éxito.",
        tipo: "success",
      });
    } catch (err) {
      console.error(err);

      setMensaje({
        texto:
          "Error al guardar dirección.",
        tipo: "danger",
      });
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const eliminarDireccion = async (
    id
  ) => {
    if (
      !window.confirm(
        "¿Eliminar esta dirección?"
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("direcciones")
          .delete()
          .eq(
            "id_direccion",
            id
          );

      if (error) throw error;

      setDirecciones(
        direcciones.filter(
          (d) =>
            d.id_direccion !== id
        )
      );
    } catch (err) {
      console.error(err);

      alert(
        "No se pudo eliminar la dirección."
      );
    }
  };

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================
  const handleCerrarSesion =
    async () => {
      if (
        window.confirm(
          "¿Seguro que quieres cerrar sesión?"
        )
      ) {
        try {
          if (logout) {
            await logout();
          } else {
            await supabase.auth.signOut();
          }

          navegar("/login");
        } catch (err) {
          console.error(err);
        }
      }
    };

  // ============================================================
  // HELPERS
  // ============================================================
  const anioMiembro =
    perfil?.creado_en
      ? new Date(
          perfil.creado_en
        ).getFullYear()
      : new Date().getFullYear();

  const nombreUsuario =
    perfil?.usuarios?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const nombreTienda = tienda
    ? `${tienda.nombre_tienda}${
        tienda.ciudad
          ? ` - ${tienda.ciudad}`
          : ""
      }`
    : "Sin tienda registrada";

  // ============================================================
  // ESTILOS
  // ============================================================
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

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "60vh",
        }}
      >
        <Spinner
          animation="border"
          style={{
            color: "#0d5c63",
          }}
        />
      </div>
    );
  }

  // ============================================================
  // SIN PERFIL
  // ============================================================
  if (!perfil) {
    return (
      <Container className="mt-5 text-center">
        <p>
          No se encontró información
          de perfil.
        </p>
      </Container>
    );
  }

  // ============================================================
  // VISTA: DIRECCIÓN
  //
  // IMPORTANTE:
  // AQUÍ YA NO SE MUESTRA INFORMACIÓN DE LA TIENDA.
  //
  // Aunque el usuario tenga:
  // - plan vendedor
  // - rol vendedor
  // - id_tienda
  // - una tienda registrada
  //
  // ESTA PANTALLA SOLO MUESTRA:
  // direcciones del usuario.
  // ============================================================
  if (vistaActual === "tienda") {
    return (
      <div
        style={{
          backgroundColor: "#f7fafc",
          minHeight: "100vh",
          paddingBottom: "40px",
        }}
      >
        {/* HEADER */}
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2">
          <button
            className="btn p-0 border-0 bg-transparent"
            onClick={() =>
              setVistaActual("main")
            }
          >
            <i
              className="bi bi-arrow-left"
              style={{
                fontSize: "1.4rem",
                color: "#0f172a",
              }}
            />
          </button>

          <h1
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Dirección
          </h1>
        </div>

        <Container className="px-3 mt-3">
          {/* MENSAJE */}
          {mensaje.texto && (
            <Alert
              variant={mensaje.tipo}
              className="rounded-4 border-0 shadow-sm mb-3"
              dismissible
              onClose={() =>
                setMensaje({
                  texto: "",
                  tipo: "",
                })
              }
            >
              {mensaje.texto}
            </Alert>
          )}

          {/* ==================================================
              DIRECCIONES DE ENVÍO
              
              ESTE ES EL ÚNICO CONTENIDO DE ESTA VISTA.
              
              NO:
              - tienda.nombre_tienda
              - tienda.direccion
              - tienda.ciudad
              - tienda.horarios
              - tienda.telefono
              
              SÍ:
              - direcciones del usuario
             ================================================== */}
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6
                style={{
                  fontWeight: 600,
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Direcciones de envío
              </h6>

              <Button
                size="sm"
                className="rounded-pill border-0"
                style={{
                  backgroundColor:
                    "#0d5c63",
                  color: "white",
                }}
                onClick={() =>
                  setShowAddressModal(true)
                }
              >
                <i className="bi bi-plus-lg me-1" />
                Nueva
              </Button>
            </div>

            {/* SIN DIRECCIONES */}
            {direcciones.length === 0 ? (
              <div
                className="text-center py-4"
                style={{
                  backgroundColor:
                    "white",
                  borderRadius: 16,
                }}
              >
                <i
                  className="bi bi-geo"
                  style={{
                    fontSize: "2rem",
                    color: "#94a3b8",
                  }}
                />

                <p className="text-muted mb-0 mt-2">
                  No hay direcciones
                  guardadas
                </p>
              </div>
            ) : (
              /* DIRECCIONES */
              direcciones.map(
                (dir) => (
                  <div
                    key={
                      dir.id_direccion
                    }
                    className="mb-3 p-3"
                    style={{
                      backgroundColor:
                        "white",
                      borderRadius: 14,
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="d-flex justify-content-between">
                      <div>
                        {/* NOMBRE */}
                        <div
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {dir.nombre}{" "}
                          {dir.apellido}
                        </div>

                        {/* CALLE */}
                        <div
                          style={{
                            fontSize:
                              "0.9rem",
                            color:
                              "#64748b",
                          }}
                        >
                          {
                            dir.nombre_calle
                          }
                        </div>

                        {/* REFERENCIA */}
                        {dir.descripcion && (
                          <div
                            style={{
                              fontSize:
                                "0.8rem",
                              color:
                                "#94a3b8",
                              marginTop: 4,
                            }}
                          >
                            {
                              dir.descripcion
                            }
                          </div>
                        )}

                        {/* CP + TELÉFONO */}
                        <div
                          className="d-flex gap-3 mt-2"
                          style={{
                            fontSize:
                              "0.8rem",
                          }}
                        >
                          {dir.codigo_postal && (
                            <span className="badge bg-light text-dark border">
                              CP:{" "}
                              {
                                dir.codigo_postal
                              }
                            </span>
                          )}

                          <span
                            style={{
                              color:
                                "#0d5c63",
                            }}
                          >
                            <i className="bi bi-telephone me-1" />

                            {
                              dir.numero_telefono
                            }
                          </span>
                        </div>
                      </div>

                      {/* ELIMINAR */}
                      <button
                        className="btn btn-link text-danger p-0"
                        onClick={() =>
                          eliminarDireccion(
                            dir.id_direccion
                          )
                        }
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </Container>

        {/* ==================================================
            MODAL NUEVA DIRECCIÓN
           ================================================== */}
        {showAddressModal && (
          <div
            className="modal show d-block"
            style={{
              backgroundColor:
                "rgba(0,0,0,0.45)",
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content border-0"
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                {/* HEADER */}
                <div className="modal-header border-0 px-4 pt-4 pb-2">
                  <h5
                    style={{
                      fontWeight: 700,
                      color: "#0d5c63",
                      margin: 0,
                    }}
                  >
                    Nueva Dirección
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() =>
                      setShowAddressModal(
                        false
                      )
                    }
                  />
                </div>

                {/* BODY */}
                <div className="modal-body px-4">
                  <Row className="g-3">
                    {/* NOMBRE */}
                    <Col xs={6}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Nombre
                      </Form.Label>

                      <Form.Control
                        style={inputStyle}
                        value={
                          nuevaDireccion.nombre
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              nombre:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>

                    {/* APELLIDO */}
                    <Col xs={6}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Apellido
                      </Form.Label>

                      <Form.Control
                        style={inputStyle}
                        value={
                          nuevaDireccion.apellido
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              apellido:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>

                    {/* CALLE */}
                    <Col xs={12}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Calle y Número
                      </Form.Label>

                      <Form.Control
                        style={inputStyle}
                        placeholder="Ej: Av. Reforma 123"
                        value={
                          nuevaDireccion.nombre_calle
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              nombre_calle:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>

                    {/* REFERENCIAS */}
                    <Col xs={12}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Referencias
                      </Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={2}
                        style={{
                          ...inputStyle,
                          resize: "none",
                        }}
                        placeholder="Ej: Portón verde..."
                        value={
                          nuevaDireccion.descripcion
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              descripcion:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>

                    {/* CÓDIGO POSTAL */}
                    <Col xs={6}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Código Postal
                      </Form.Label>

                      <Form.Control
                        style={inputStyle}
                        value={
                          nuevaDireccion.codigo_postal
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              codigo_postal:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>

                    {/* TELÉFONO */}
                    <Col xs={6}>
                      <Form.Label
                        style={labelStyle}
                      >
                        Teléfono
                      </Form.Label>

                      <Form.Control
                        style={inputStyle}
                        type="tel"
                        value={
                          nuevaDireccion.numero_telefono
                        }
                        onChange={(e) =>
                          setNuevaDireccion(
                            {
                              ...nuevaDireccion,
                              numero_telefono:
                                e.target
                                  .value,
                            }
                          )
                        }
                      />
                    </Col>
                  </Row>
                </div>

                {/* FOOTER */}
                <div className="modal-footer border-0 px-4 pb-4">
                  <Button
                    className="w-100 rounded-pill border-0 fw-semibold"
                    style={{
                      backgroundColor:
                        "#a8e0ef",
                      color: "#0d5c63",
                      padding: "12px",
                    }}
                    onClick={
                      agregarDireccion
                    }
                    disabled={
                      guardandoDireccion
                    }
                  >
                    {guardandoDireccion ? (
                      <Spinner
                        size="sm"
                        animation="border"
                      />
                    ) : (
                      "Guardar Dirección"
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

  // ============================================================
  // VISTA: MÉTODOS DE PAGO
  // ============================================================
  if (vistaActual === "metodos") {
    return (
      <div
        style={{
          backgroundColor: "#f7fafc",
          minHeight: "100vh",
          paddingBottom: "40px",
        }}
      >
        {/* HEADER */}
        <div className="d-flex align-items-center justify-content-between px-3 pt-3 pb-2">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn p-0 border-0 bg-transparent"
              onClick={() =>
                setVistaActual("main")
              }
            >
              <i
                className="bi bi-arrow-left"
                style={{
                  fontSize: "1.4rem",
                  color: "#0f172a",
                }}
              />
            </button>

            <h1
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Método de pago
            </h1>
          </div>

          <Button
            size="sm"
            className="rounded-pill border-0"
            style={{
              backgroundColor:
                "#0d5c63",
              color: "white",
            }}
            onClick={() =>
              setShowAddModal(true)
            }
          >
            <i className="bi bi-plus-lg me-1" />
            Añadir
          </Button>
        </div>

        <Container className="px-3 mt-3">
          {mensaje.texto && (
            <Alert
              variant={mensaje.tipo}
              className="rounded-4 border-0 shadow-sm mb-3"
              dismissible
              onClose={() =>
                setMensaje({
                  texto: "",
                  tipo: "",
                })
              }
            >
              {mensaje.texto}
            </Alert>
          )}

          {metodosPago.length === 0 ? (
            <div
              className="text-center py-5"
              style={{
                backgroundColor:
                  "white",
                borderRadius: 16,
              }}
            >
              <i
                className="bi bi-credit-card"
                style={{
                  fontSize: "3.5rem",
                  color: "#94a3b8",
                }}
              />

              <h5 className="mt-3 text-muted fw-bold">
                No hay métodos de pago
              </h5>

              <p className="text-muted small">
                Añade una tarjeta para
                facilitar tus compras
              </p>

              <Button
                className="mt-2 rounded-pill px-4 border-0"
                style={{
                  backgroundColor:
                    "#0d5c63",
                }}
                onClick={() =>
                  setShowAddModal(true)
                }
              >
                Añadir tarjeta
              </Button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {metodosPago.map(
                (metodo) => (
                  <div
                    key={
                      metodo.id_metodo_pago
                    }
                    className="position-relative overflow-hidden"
                    style={{
                      borderRadius: 16,
                      padding: "20px",
                      color: "white",
                      background:
                        metodo.tipo_metodo ===
                        "Visa"
                          ? "linear-gradient(135deg, #1a1a1a 0%, #333 100%)"
                          : metodo.tipo_metodo ===
                            "Mastercard"
                          ? "linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)"
                          : "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                      boxShadow:
                        "0 4px 12px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <i
                        className={`bi bi-${
                          metodo.tipo_metodo ===
                          "Visa"
                            ? "credit-card-2-front"
                            : "credit-card"
                        }`}
                        style={{
                          fontSize:
                            "1.6rem",
                        }}
                      />

                      <button
                        className="btn btn-link text-white p-0 opacity-75"
                        onClick={() =>
                          eliminarTarjeta(
                            metodo.id_metodo_pago
                          )
                        }
                        disabled={
                          eliminandoTarjetaId ===
                          metodo.id_metodo_pago
                        }
                      >
                        {eliminandoTarjetaId ===
                        metodo.id_metodo_pago ? (
                          <Spinner
                            size="sm"
                            animation="border"
                          />
                        ) : (
                          <i
                            className="bi bi-trash"
                            style={{
                              fontSize:
                                "1.1rem",
                            }}
                          />
                        )}
                      </button>
                    </div>

                    <div
                      style={{
                        fontSize:
                          "1.35rem",
                        fontWeight: 700,
                        letterSpacing:
                          "2px",
                        marginBottom: 20,
                      }}
                    >
                      **** **** ****{" "}
                      {metodo.ultimo4}
                    </div>

                    <div className="d-flex justify-content-between">
                      <div>
                        <div
                          style={{
                            fontSize:
                              "0.65rem",
                            textTransform:
                              "uppercase",
                            opacity: 0.7,
                          }}
                        >
                          Tipo
                        </div>

                        <div
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {metodo.tipo_metodo ||
                            "Tarjeta"}
                        </div>
                      </div>

                      <div className="text-end">
                        <div
                          style={{
                            fontSize:
                              "0.65rem",
                            textTransform:
                              "uppercase",
                            opacity: 0.7,
                          }}
                        >
                          Guardada
                        </div>

                        <div
                          style={{
                            fontWeight: 600,
                            fontSize:
                              "0.9rem",
                          }}
                        >
                          {new Date(
                            metodo.creado_en
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Container>

        {/* MODAL AÑADIR TARJETA */}
        {showAddModal && (
          <div
            className="modal show d-block"
            style={{
              backgroundColor:
                "rgba(0,0,0,0.45)",
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content border-0"
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <div className="modal-header border-0 px-4 pt-4 pb-2">
                  <h5
                    style={{
                      fontWeight: 700,
                      color: "#0d5c63",
                      margin: 0,
                    }}
                  >
                    Añadir tarjeta
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() =>
                      setShowAddModal(
                        false
                      )
                    }
                  />
                </div>

                <div className="modal-body px-4">
                  <Form.Group className="mb-3">
                    <Form.Label
                      style={labelStyle}
                    >
                      Tipo de tarjeta
                    </Form.Label>

                    <Form.Select
                      style={inputStyle}
                      value={
                        nuevaTarjeta.tipo
                      }
                      onChange={(e) =>
                        setNuevaTarjeta(
                          {
                            ...nuevaTarjeta,
                            tipo: e.target
                              .value,
                          }
                        )
                      }
                    >
                      <option value="Visa">
                        Visa
                      </option>

                      <option value="Mastercard">
                        Mastercard
                      </option>

                      <option value="American Express">
                        American Express
                      </option>

                      <option value="Débito">
                        Tarjeta de Débito
                      </option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label
                      style={labelStyle}
                    >
                      Últimos 4 dígitos
                    </Form.Label>

                    <Form.Control
                      style={inputStyle}
                      type="text"
                      maxLength={4}
                      placeholder="Ej: 4242"
                      value={
                        nuevaTarjeta.ultimo4
                      }
                      onChange={(e) =>
                        setNuevaTarjeta(
                          {
                            ...nuevaTarjeta,
                            ultimo4:
                              e.target.value.replace(
                                /\D/g,
                                ""
                              ),
                          }
                        )
                      }
                    />

                    <Form.Text className="text-muted">
                      Por seguridad solo
                      guardamos los últimos
                      4 números.
                    </Form.Text>
                  </Form.Group>
                </div>

                <div className="modal-footer border-0 px-4 pb-4">
                  <Button
                    className="w-100 rounded-pill border-0 fw-semibold"
                    style={{
                      backgroundColor:
                        "#a8e0ef",
                      color: "#0d5c63",
                      padding: "12px",
                    }}
                    onClick={
                      agregarNuevaTarjeta
                    }
                    disabled={
                      guardandoTarjeta
                    }
                  >
                    {guardandoTarjeta ? (
                      <Spinner
                        size="sm"
                        animation="border"
                      />
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

  // ============================================================
  // VISTA PRINCIPAL
  // ============================================================
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
      {/* HEADER */}
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
              backgroundColor:
                "#0d5c63",
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
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Perfil
        </h1>
      </div>

      <Container className="px-3">
        {mensaje.texto && (
          <Alert
            variant={mensaje.tipo}
            className="rounded-4 border-0 shadow-sm mt-2 mb-3"
            dismissible
            onClose={() =>
              setMensaje({
                texto: "",
                tipo: "",
              })
            }
          >
            {mensaje.texto}
          </Alert>
        )}

        {/* ======================================================
            TARJETA DE PERFIL
           ====================================================== */}
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
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />

            <label
              htmlFor="upload-photo"
              className="position-absolute bottom-0 end-0 d-flex align-items-center justify-content-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor:
                  "#0d5c63",
                color: "white",
                cursor: "pointer",
                border:
                  "2px solid white",
              }}
            >
              <i
                className="bi bi-pencil-fill"
                style={{
                  fontSize:
                    "0.7rem",
                }}
              />

              <input
                type="file"
                id="upload-photo"
                className="d-none"
                accept="image/*"
                onChange={
                  manejarArchivo
                }
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
              justifyContent:
                "center",
              gap: 6,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  "#0d5c63",
                display: "inline-block",
              }}
            />

            {nombreTienda}
          </div>

          <div
            className="d-flex justify-content-around"
            style={{
              borderTop:
                "1px solid rgba(13, 92, 99, 0.12)",
              paddingTop: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "1.15rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {tienda ? 1 : 0}
              </div>

              <div
                style={{
                  fontSize:
                    "0.75rem",
                  color: "#64748b",
                }}
              >
                Tienda
              </div>
            </div>

            <div
              style={{
                width: 1,
                backgroundColor:
                  "rgba(13, 92, 99, 0.12)",
              }}
            />

            <div>
              <div
                style={{
                  fontSize:
                    "1.15rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {pedidosCount}
              </div>

              <div
                style={{
                  fontSize:
                    "0.75rem",
                  color: "#64748b",
                }}
              >
                Pedidos
              </div>
            </div>

            <div
              style={{
                width: 1,
                backgroundColor:
                  "rgba(13, 92, 99, 0.12)",
              }}
            />

            <div>
              <div
                style={{
                  fontSize:
                    "1.15rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {anioMiembro}
              </div>

              <div
                style={{
                  fontSize:
                    "0.75rem",
                  color: "#64748b",
                }}
              >
                Miembro desde
              </div>
            </div>
          </div>

          {archivoNuevo && (
            <Button
              size="sm"
              className="mt-3 rounded-pill px-4 border-0"
              style={{
                backgroundColor:
                  "#0d5c63",
                color: "white",
              }}
              onClick={guardarFoto}
              disabled={guardando}
            >
              {guardando ? (
                <Spinner
                  size="sm"
                  animation="border"
                />
              ) : (
                "Guardar foto"
              )}
            </Button>
          )}
        </div>

        {/* ======================================================
            SECCIÓN CUENTA
           ====================================================== */}
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
              backgroundColor:
                "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* ==================================================
                DIRECCIÓN
                ==================================================
                AHORA EL BOTÓN LLEVA A LA VISTA QUE SOLO
                MUESTRA DIRECCIONES PERSONALES.
               ================================================== */}
            <button
              className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
              style={{
                padding:
                  "16px 18px",
                borderBottom:
                  "1px solid #f1f5f9",
              }}
              onClick={() =>
                setVistaActual(
                  "tienda"
                )
              }
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor:
                    "#e8f4f8",
                  color: "#0d5c63",
                  flexShrink: 0,
                }}
              >
                <i
                  className="bi bi-geo-alt"
                  style={{
                    fontSize:
                      "1.15rem",
                  }}
                />
              </div>

              <div className="flex-grow-1">
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0f172a",
                    fontSize:
                      "0.95rem",
                  }}
                >
                  Dirección
                </div>

                <div
                  style={{
                    fontSize:
                      "0.8rem",
                    color: "#94a3b8",
                  }}
                >
                  Direcciones de envío
                </div>
              </div>

              <i
                className="bi bi-chevron-right"
                style={{
                  color: "#cbd5e1",
                  fontSize:
                    "1.1rem",
                }}
              />
            </button>

            {/* MÉTODO DE PAGO */}
            <button
              className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
              style={{
                padding:
                  "16px 18px",
                borderBottom:
                  "1px solid #f1f5f9",
              }}
              onClick={() =>
                setVistaActual(
                  "metodos"
                )
              }
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor:
                    "#e8f4f8",
                  color: "#0d5c63",
                  flexShrink: 0,
                }}
              >
                <i
                  className="bi bi-credit-card"
                  style={{
                    fontSize:
                      "1.15rem",
                  }}
                />
              </div>

              <div className="flex-grow-1">
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0f172a",
                    fontSize:
                      "0.95rem",
                  }}
                >
                  Metodo de pago
                </div>

                <div
                  style={{
                    fontSize:
                      "0.8rem",
                    color: "#94a3b8",
                  }}
                >
                  Tarjetas y cuentas
                  vinculadas
                </div>
              </div>

              <i
                className="bi bi-chevron-right"
                style={{
                  color: "#cbd5e1",
                  fontSize:
                    "1.1rem",
                }}
              />
            </button>

            {/* SEGURIDAD */}
            <button
              className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
              style={{
                padding:
                  "16px 18px",
              }}
              onClick={() =>
                setVistaActual(
                  "seguridad"
                )
              }
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor:
                    "#e8f4f8",
                  color: "#0d5c63",
                  flexShrink: 0,
                }}
              >
                <i
                  className="bi bi-shield-lock"
                  style={{
                    fontSize:
                      "1.15rem",
                  }}
                />
              </div>

              <div className="flex-grow-1">
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0f172a",
                    fontSize:
                      "0.95rem",
                  }}
                >
                  Seguridad
                </div>

                <div
                  style={{
                    fontSize:
                      "0.8rem",
                    color: "#94a3b8",
                  }}
                >
                  Contraseña y
                  verificacion
                </div>
              </div>

              <i
                className="bi bi-chevron-right"
                style={{
                  color: "#cbd5e1",
                  fontSize:
                    "1.1rem",
                }}
              />
            </button>
          </div>
        </div>

        {/* ======================================================
            PREFERENCIAS
           ====================================================== */}
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
              backgroundColor:
                "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* NOTIFICACIONES */}
            <div
              className="d-flex align-items-center gap-3"
              style={{
                padding:
                  "16px 18px",
                borderBottom:
                  "1px solid #f1f5f9",
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor:
                    "#e8f4f8",
                  color: "#0d5c63",
                  flexShrink: 0,
                }}
              >
                <i
                  className="bi bi-shield-check"
                  style={{
                    fontSize:
                      "1.15rem",
                  }}
                />
              </div>

              <div className="flex-grow-1">
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0f172a",
                    fontSize:
                      "0.95rem",
                  }}
                >
                  Notificaciones
                </div>

                <div
                  style={{
                    fontSize:
                      "0.8rem",
                    color: "#94a3b8",
                  }}
                >
                  Pedidos y alertas de
                  stock
                </div>
              </div>

              <Form.Check
                type="switch"
                id="switch-notificaciones"
                checked={
                  notificacionesActivas
                }
                onChange={(e) =>
                  setNotificacionesActivas(
                    e.target.checked
                  )
                }
                style={{
                  transform:
                    "scale(1.15)",
                }}
              />
            </div>

            {/* CERRAR SESIÓN */}
            <button
              className="w-100 d-flex align-items-center gap-3 border-0 bg-transparent text-start"
              style={{
                padding:
                  "16px 18px",
              }}
              onClick={
                handleCerrarSesion
              }
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor:
                    "#fee2e2",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                <i
                  className="bi bi-box-arrow-right"
                  style={{
                    fontSize:
                      "1.15rem",
                  }}
                />
              </div>

              <div className="flex-grow-1">
                <div
                  style={{
                    fontWeight: 600,
                    color: "#ef4444",
                    fontSize:
                      "0.95rem",
                  }}
                >
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