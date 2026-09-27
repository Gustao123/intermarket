import React, { useState, useEffect } from "react";
import { Spinner, Alert, Button } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import NotificacionOperacion from "../components/NotificacionOperacion";
import ModalRegistroTienda from "../components/tiendas/ModalRegistroTienda";
import ModalEdicionTienda from "../components/tiendas/ModalEdicionTienda";
import ModalEliminacionTienda from "../components/tiendas/ModalEliminacionTienda";

const Tiendas = () => {
  const { user } = useAuth();
  const [tiendas, setTiendas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
  const [tiendaAEliminar, setTiendaAEliminar] = useState(null);
  const [tiendaEditar, setTiendaEditar] = useState(null);
  const [toast, setToast] = useState({ mostrar: false, mensaje: "", tipo: "" });

  const [nuevaTienda, setNuevaTienda] = useState({
    nombre_tienda: "",
    imagen_url: "",
    direccion: "",
    latitud: null,
    longitud: null,
  });

  const nombreUsuario =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const subirImagenASupabase = async (archivo, bucketName) => {
    try {
      const fileExt = archivo.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, archivo);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw new Error("No se pudo subir la imagen al servidor.");
    }
  };

  // Cargar TODAS las tiendas del usuario
  const cargarTiendas = async () => {
    try {
      setCargando(true);
      if (!user) return;

      const { data, error } = await supabase
        .from("tiendas")
        .select("*")
        .eq("id_usuario", user.id)
        .order("creado_en", { ascending: false });

      if (error) throw error;
      setTiendas(data || []);
    } catch (err) {
      console.error("Error al cargar tiendas:", err.message);
      setToast({ mostrar: true, mensaje: "Error al cargar tiendas", tipo: "error" });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTiendas();
  }, [user]);

  const manejoCambioInput = (e) => {
    const { name, value } = e.target;
    setNuevaTienda((prev) => ({ ...prev, [name]: value }));
  };

  const manejoCambioInputEdicion = (e) => {
    const { name, value } = e.target;
    setTiendaEditar((prev) => ({ ...prev, [name]: value }));
  };

  const manejoCambioArchivo = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNuevaTienda((prev) => ({ ...prev, archivo_imagen: archivo }));
  };

  const manejoCambioArchivoActualizar = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setTiendaEditar((prev) => ({ ...prev, archivo_imagen: archivo }));
  };

  const manejoCambioUbicacion = (ubicacion) => {
    setNuevaTienda((prev) => ({
      ...prev,
      ...ubicacion,
    }));
  };

  const manejoCambioUbicacionEdicion = (ubicacion) => {
    setTiendaEditar((prev) => ({
      ...prev,
      ...ubicacion,
    }));
  };

  const abrirModalEdicion = (tienda) => {
    setTiendaEditar(tienda);
    setMostrarModalEdicion(true);
  };

  const abrirModalEliminacion = (tienda) => {
    setTiendaAEliminar(tienda);
    setMostrarModalEliminacion(true);
  };

  const agregarTienda = async () => {
    try {
      if (!nuevaTienda.nombre_tienda.trim()) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar el nombre de la tienda.",
          tipo: "advertencia",
        });
        return;
      }

      // ============================================================
      // VERIFICAR LÍMITE DE TIENDAS POR SUSCRIPCIÓN
      // ============================================================
      try {
        const { data: suscripcion, error: suscripcionError } = await supabase
          .from("suscripciones")
          .select("limite_tiendas")
          .eq("id_usuario", user.id)
          .eq("estado", "activo")
          .maybeSingle();

        if (suscripcionError) {
          console.warn("Error al verificar suscripción:", suscripcionError);
        }

        if (suscripcion?.limite_tiendas !== null && suscripcion?.limite_tiendas !== undefined) {
          const { count, error: countError } = await supabase
            .from("tiendas")
            .select("*", { count: "exact", head: true })
            .eq("id_usuario", user.id);

          if (countError) {
            console.warn("Error al contar tiendas:", countError);
          } else if (count >= suscripcion.limite_tiendas) {
            setToast({
              mostrar: true,
              mensaje: `Has alcanzado el límite de ${suscripcion.limite_tiendas} tiendas permitidas.`,
              tipo: "error",
            });
            return;
          }
        }
      } catch (err) {
        console.warn("Error en verificación de límite:", err);
      }

      setCargando(true);

      let urlPublica = null;
      if (nuevaTienda.archivo_imagen) {
        urlPublica = await subirImagenASupabase(nuevaTienda.archivo_imagen, "tiendas");
      }

      const payload = {
        nombre_tienda: nuevaTienda.nombre_tienda.trim(),
        imagen_url: urlPublica,
        direccion: nuevaTienda.direccion?.trim() || null,
        latitud: nuevaTienda.latitud ?? null,
        longitud: nuevaTienda.longitud ?? null,
        id_usuario: user.id,
      };

      const { data, error } = await supabase
        .from("tiendas")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      if (user) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("id_tienda")
          .eq("id_usuario", user.id)
          .maybeSingle();

        if (!perfilData?.id_tienda) {
          await supabase
            .from("perfiles")
            .update({ id_tienda: data.id_tienda })
            .eq("id_usuario", user.id);
        }

        await supabase
          .from("usuarios")
          .update({ rol: "vendedor" })
          .eq("id_usuario", user.id);
      }

      await cargarTiendas();
      setMostrarModalRegistro(false);
      setNuevaTienda({
        nombre_tienda: "",
        imagen_url: "",
        direccion: "",
        latitud: null,
        longitud: null,
        archivo_imagen: null,
      });
      setToast({ mostrar: true, mensaje: "Tienda registrada exitosamente.", tipo: "exito" });
    } catch (err) {
      console.error("Error al registrar tienda:", err.message);
      setToast({
        mostrar: true,
        mensaje: `Error al registrar tienda: ${err.message}`,
        tipo: "error",
      });
    } finally {
      setCargando(false);
    }
  };

  const actualizarTienda = async () => {
    if (!tiendaEditar) return;
    try {
      if (!tiendaEditar.nombre_tienda?.trim()) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar el nombre de la tienda.",
          tipo: "advertencia",
        });
        return;
      }

      setCargando(true);

      let urlPublica = tiendaEditar.imagen_url;
      if (tiendaEditar.archivo_imagen) {
        urlPublica = await subirImagenASupabase(tiendaEditar.archivo_imagen, "tiendas");
      }

      const payload = {
        nombre_tienda: tiendaEditar.nombre_tienda.trim(),
        imagen_url: urlPublica,
        direccion: tiendaEditar.direccion?.trim() || null,
        latitud: tiendaEditar.latitud ?? null,
        longitud: tiendaEditar.longitud ?? null,
      };

      const { error } = await supabase
        .from("tiendas")
        .update(payload)
        .eq("id_tienda", tiendaEditar.id_tienda);
      if (error) throw error;

      await cargarTiendas();
      setMostrarModalEdicion(false);
      setToast({ mostrar: true, mensaje: "Tienda actualizada exitosamente.", tipo: "exito" });
    } catch (err) {
      console.error("Error al actualizar tienda:", err.message);
      setToast({
        mostrar: true,
        mensaje: `Error al actualizar tienda: ${err.message}`,
        tipo: "error",
      });
    } finally {
      setCargando(false);
    }
  };

  const eliminarTienda = async () => {
    if (!tiendaAEliminar) return;
    try {
      const { error } = await supabase
        .from("tiendas")
        .delete()
        .eq("id_tienda", tiendaAEliminar.id_tienda);
      if (error) throw error;

      if (user) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("id_tienda")
          .eq("id_usuario", user.id)
          .maybeSingle();

        if (perfilData?.id_tienda === tiendaAEliminar.id_tienda) {
          const { data: otras } = await supabase
            .from("tiendas")
            .select("id_tienda")
            .eq("id_usuario", user.id)
            .neq("id_tienda", tiendaAEliminar.id_tienda)
            .limit(1);

          await supabase
            .from("perfiles")
            .update({ id_tienda: otras?.[0]?.id_tienda ?? null })
            .eq("id_usuario", user.id);
        }
      }

      await cargarTiendas();
      setMostrarModalEliminacion(false);
      setToast({ mostrar: true, mensaje: "Tienda eliminada exitosamente.", tipo: "exito" });
    } catch (err) {
      console.error("Error al eliminar tienda:", err.message);
      setToast({
        mostrar: true,
        mensaje: `Error al eliminar tienda: ${err.message}`,
        tipo: "error",
      });
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f0f7fa",
        minHeight: "100vh",
        paddingBottom: "100px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* HEADER */}
      <div className="px-4 pt-4 pb-2">
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#0d5c63",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          ¡Hola! {nombreUsuario}
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            color: "#64748b",
            margin: "4px 0 12px",
          }}
        >
          Tu tienda registrada en un solo lugar
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "#e8f4f8",
            color: "#0d5c63",
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 20,
          }}
        >
          {tiendas.length} {tiendas.length === 1 ? "tienda registrada" : "tiendas registradas"}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="px-4 mt-3">
        {toast.mostrar && (
          <Alert
            variant={
              toast.tipo === "exito"
                ? "success"
                : toast.tipo === "error"
                ? "danger"
                : "warning"
            }
            className="rounded-4 border-0 shadow-sm mb-3"
            dismissible
            onClose={() => setToast({ ...toast, mostrar: false })}
          >
            {toast.mensaje}
          </Alert>
        )}

        {cargando ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: "#0d5c63" }} />
          </div>
        ) : tiendas.length === 0 ? (
          <div
            className="text-center py-5"
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: "40px 20px",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "#e8f4f8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <i className="bi bi-shop" style={{ fontSize: "2rem", color: "#0d5c63" }} />
            </div>
            <h5 style={{ color: "#0f172a", fontWeight: 600 }}>No tienes tienda registrada</h5>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Crea tu primera tienda para empezar a vender
            </p>
            <Button
              className="rounded-pill px-4 border-0 mt-2"
              style={{ backgroundColor: "#0d5c63", color: "white" }}
              onClick={() => setMostrarModalRegistro(true)}
            >
              <i className="bi bi-plus-lg me-2" />
              Crear tienda
            </Button>
          </div>
        ) : (
          // En móvil (por defecto, col-12) sigue tal cual: una tarjeta por fila.
          // Desde tablet/escritorio (col-md-6) pasa a 2 tarjetas por fila.
          <div className="row g-3">
            {tiendas.map((tienda) => (
              <div className="col-12 col-md-6" key={tienda.id_tienda}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: 18,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 14,
                      backgroundColor: "#e8f4f8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {tienda.imagen_url ? (
                      <img
                        src={tienda.imagen_url}
                        alt={tienda.nombre_tienda}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "2rem" }}>🏪</div>
                    )}
                  </div>

                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tienda.nombre_tienda}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        fontSize: "0.85rem",
                        color: "#0d5c63",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#22c55e",
                          display: "inline-block",
                        }}
                      />
                      Tienda activa
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn p-0 border-0 bg-transparent"
                      onClick={() => abrirModalEliminacion(tienda)}
                      title="Eliminar"
                    >
                      <i
                        className="bi bi-trash"
                        style={{ fontSize: "1.15rem", color: "#ef4444" }}
                      />
                    </button>
                    <button
                      className="btn p-0 border-0 bg-transparent"
                      onClick={() => abrirModalEdicion(tienda)}
                      title="Editar"
                    >
                      <i
                        className="bi bi-pencil-square"
                        style={{ fontSize: "1.15rem", color: "#0d5c63" }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÓN FLOTANTE + */}
      <button
        onClick={() => setMostrarModalRegistro(true)}
        style={{
          position: "fixed",
          bottom: 90,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "#e8f4f8",
          border: "none",
          boxShadow: "0 4px 14px rgba(13, 92, 99, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          cursor: "pointer",
        }}
      >
        <i className="bi bi-plus-lg" style={{ fontSize: "1.5rem", color: "#0d5c63" }} />
      </button>

      {/* MODALES */}
      <ModalRegistroTienda
        mostrarModal={mostrarModalRegistro}
        setMostrarModal={setMostrarModalRegistro}
        nuevaTienda={nuevaTienda}
        manejoCambioInput={manejoCambioInput}
        manejoCambioArchivo={manejoCambioArchivo}
        manejoCambioUbicacion={manejoCambioUbicacion}
        agregarTienda={agregarTienda}
      />

      <ModalEdicionTienda
        mostrarModalEdicion={mostrarModalEdicion}
        setMostrarModalEdicion={setMostrarModalEdicion}
        tiendaEditar={tiendaEditar}
        manejoCambioInputEdicion={manejoCambioInputEdicion}
        manejoCambioArchivoActualizar={manejoCambioArchivoActualizar}
        manejoCambioUbicacionEdicion={manejoCambioUbicacionEdicion}
        actualizarTienda={actualizarTienda}
      />

      <ModalEliminacionTienda
        mostrarModal={mostrarModalEliminacion}
        setMostrarModal={setMostrarModalEliminacion}
        tiendaAEliminar={tiendaAEliminar}
        eliminarTienda={eliminarTienda}
      />

      <NotificacionOperacion
        mostrar={toast.mostrar}
        mensaje={toast.mensaje}
        tipo={toast.tipo}
        onCerrar={() => setToast({ ...toast, mostrar: false })}
      />
    </div>
  );
};

export default Tiendas;