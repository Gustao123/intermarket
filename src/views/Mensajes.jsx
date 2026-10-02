import React, { useEffect, useMemo, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { supabase } from "../database/supabaseconfig";
import NotificacionOperacion from "../components/NotificacionOperacion";
import { useAuth } from "../context/AuthContext";
import { enviarNotificacionPorCorreo } from "../services/emailService";
import { obtenerMiPerfil } from "../services/perfilService";

const Mensajes = () => {
    const [chats, setChats] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const [chatActivo, setChatActivo] = useState(null);
    const [toast, setToast] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const { user, role } = useAuth();
    const navigate = useNavigate();
    const [textoMensaje, setTextoMensaje] = useState("");
    const [mensajes, setMensajes] = useState([]);
    const [miPerfilId, setMiPerfilId] = useState(null);
    const scrollRef = React.useRef(null);

    const [esMovil, setEsMovil] = useState(window.innerWidth < 992);
    const [vistaMovil, setVistaMovil] = useState("lista");

    useEffect(() => {
        const manejarResize = () => setEsMovil(window.innerWidth < 992);
        window.addEventListener("resize", manejarResize);
        return () => window.removeEventListener("resize", manejarResize);
    }, []);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    useEffect(() => {
        const obtenerPerfilId = async () => {
            if (!user) return;
            try {
                const perfil = await obtenerMiPerfil(user.id);
                if (perfil) setMiPerfilId(perfil.perfil_id);
            } catch (err) {
                console.error("Error obteniendo el perfil:", err.message);
            }
        };
        obtenerPerfilId();
    }, [user]);

    const cargarChats = async () => {
        try {
            setCargando(true);
            if (!miPerfilId) return;

            const { data, error } = await supabase
                .from("chats")
                .select(`
                    *,
                    comprador:perfiles!comprador_id(perfil_id, foto_perfil, usuarios(username)),
                    vendedor:perfiles!vendedor_id(perfil_id, foto_perfil, usuarios(username)),
                    productos(id_producto, nombre_producto, imagen_url, precio_venta),
                    mensajes(id_mensaje, texto, leido, emisor_id, creado_en)
                `)
                .or(`comprador_id.eq.${miPerfilId},vendedor_id.eq.${miPerfilId}`)
                .order("creado_en", { ascending: false });

            if (error) throw error;
            setChats(data || []);
        } catch (err) {
            console.error("Error al cargar chats:", err.message);
            setToast({ mostrar: true, mensaje: `Error al cargar chats: ${err.message}`, tipo: "error" });
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (miPerfilId) cargarChats();
    }, [miPerfilId]);

    useEffect(() => {
        if (!chatActivo && chats.length > 0 && !esMovil) {
            setChatActivo(chats[0]);
        }
    }, [chats, chatActivo, esMovil]);

    // ============================================================
    // REALTIME GLOBAL
    // ============================================================
    useEffect(() => {
        if (!miPerfilId) return;

        const canalGlobal = supabase
            .channel(`mensajes-global-${miPerfilId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chats" },
                (payload) => {
                    const chat = payload.new;
                    if (
                        chat.comprador_id === miPerfilId ||
                        chat.vendedor_id === miPerfilId
                    ) {
                        cargarChats();
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "mensajes" },
                (payload) => {
                    const nuevoMensaje = payload.new;

                    setChats((anteriores) => {
                        const estaEnMisChats = anteriores.some(
                            (c) => c.id_chat === nuevoMensaje.id_chat
                        );

                        if (!estaEnMisChats) {
                            cargarChats();
                            return anteriores;
                        }

                        return anteriores.map((c) =>
                            c.id_chat === nuevoMensaje.id_chat
                                ? {
                                      ...c,
                                      mensajes: [...(c.mensajes || []), nuevoMensaje],
                                  }
                                : c
                        );
                    });

                    if (nuevoMensaje.emisor_id !== miPerfilId) {
                        if (chatActivo?.id_chat === nuevoMensaje.id_chat) {
                            supabase
                                .from("mensajes")
                                .update({ leido: true })
                                .eq("id_mensaje", nuevoMensaje.id_mensaje)
                                .then(() => {
                                    setMensajes((prev) => {
                                        const existe = prev.some(
                                            (m) => m.id_mensaje === nuevoMensaje.id_mensaje
                                        );
                                        if (existe) {
                                            return prev.map((m) =>
                                                m.id_mensaje === nuevoMensaje.id_mensaje
                                                    ? { ...m, leido: true }
                                                    : m
                                            );
                                        }
                                        return [...prev, nuevoMensaje];
                                    });
                                });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canalGlobal);
        };
    }, [miPerfilId, chatActivo]);

    const obtenerNombreOtro = (chat) => {
        if (!chat) return "Conversación";
        if (chat.vendedor_id === miPerfilId) {
            return chat.comprador?.usuarios?.username || "Comprador";
        }
        return chat.vendedor?.usuarios?.username || "Vendedor";
    };

    const obtenerFotoOtro = (chat) => {
        if (!chat) return null;
        if (chat.vendedor_id === miPerfilId) {
            return chat.comprador?.foto_perfil || null;
        }
        return chat.vendedor?.foto_perfil || null;
    };

    const obtenerUltimoMensaje = (chat) => {
        if (!chat?.mensajes || chat.mensajes.length === 0) return null;
        return [...chat.mensajes].sort(
            (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
        )[0];
    };

    const contarNoLeidos = (chat) => {
        if (!chat?.mensajes) return 0;
        return chat.mensajes.filter(
            (m) => !m.leido && m.emisor_id !== miPerfilId
        ).length;
    };

    const formatearHora = (fecha) => {
        if (!fecha) return "";
        const d = new Date(fecha);
        const hoy = new Date();
        const esHoy = d.toDateString() === hoy.toDateString();

        if (esHoy) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    };

    const chatsOrdenados = useMemo(() => {
        return [...chats].sort((a, b) => {
            const fechaA = obtenerUltimoMensaje(a)?.creado_en || a.creado_en;
            const fechaB = obtenerUltimoMensaje(b)?.creado_en || b.creado_en;
            return new Date(fechaB) - new Date(fechaA);
        });
    }, [chats, miPerfilId]);

    const chatsFiltrados = useMemo(() => {
        if (!textoBusqueda.trim()) return chatsOrdenados;
        const valor = textoBusqueda.toLowerCase().trim();
        return chatsOrdenados.filter((chat) => {
            const nombreOtro = obtenerNombreOtro(chat).toLowerCase();
            const nombreProducto = (chat.productos?.nombre_producto || "").toLowerCase();
            const idChat = chat.id_chat.toLowerCase();

            return nombreOtro.includes(valor) ||
                nombreProducto.includes(valor) ||
                idChat.includes(valor);
        });
    }, [textoBusqueda, chatsOrdenados, miPerfilId]);

    const eliminarChat = async (idChat) => {
        try {
            const { error: mensajesError } = await supabase
                .from("mensajes")
                .delete()
                .eq("id_chat", idChat);

            if (mensajesError) throw mensajesError;

            const { error: chatError } = await supabase
                .from("chats")
                .delete()
                .eq("id_chat", idChat);

            if (chatError) throw chatError;

            if (chatActivo?.id_chat === idChat) {
                setChatActivo(null);
                if (esMovil) setVistaMovil("lista");
            }

            setToast({ mostrar: true, mensaje: "Chat eliminado exitosamente.", tipo: "exito" });
            await cargarChats();
        } catch (err) {
            console.error("Error al eliminar chat:", err.message);
            setToast({
                mostrar: true,
                mensaje: `Error al eliminar chat: ${err.message}`,
                tipo: "error",
            });
        }
    };

    const seleccionarChat = (chat) => {
        setChatActivo(chat);
        if (esMovil) setVistaMovil("chat");
    };

    const volverALaLista = () => {
        setVistaMovil("lista");
    };

    // ============================================================
    // NAVEGAR AL PRODUCTO DEL CHAT
    // ============================================================
    const irAlProducto = () => {
        const idProducto = chatActivo?.productos?.id_producto || chatActivo?.id_producto;
        if (!idProducto) return;

        if (role === "vendedor" || role === "admin") {
            // Vendedor: ir a Productos y abrir el modal de edición
            navigate(`/productos?editar=${idProducto}`);
        } else {
            // Comprador: ir al catálogo con el detalle abierto
            navigate(`/catalogo?producto=${idProducto}`);
        }
    };

    useEffect(() => {
        if (!chatActivo) {
            setMensajes([]);
            return;
        }

        const cargarMensajes = async () => {
            const { data, error } = await supabase
                .from("mensajes")
                .select("*")
                .eq("id_chat", chatActivo.id_chat)
                .order("creado_en", { ascending: true });

            if (data) {
                setMensajes(data);
                const mensajesNoLeidos = data.filter(m => m.emisor_id !== miPerfilId && !m.leido);
                if (mensajesNoLeidos.length > 0) {
                    await supabase
                        .from("mensajes")
                        .update({ leido: true })
                        .eq("id_chat", chatActivo.id_chat)
                        .neq("emisor_id", miPerfilId);

                    setChats((anteriores) =>
                        anteriores.map((c) =>
                            c.id_chat === chatActivo.id_chat
                                ? {
                                      ...c,
                                      mensajes: (c.mensajes || []).map((m) =>
                                          m.emisor_id !== miPerfilId
                                              ? { ...m, leido: true }
                                              : m
                                      )
                                  }
                                : c
                        )
                    );
                }
            }
        };

        cargarMensajes();

        const channel = supabase.channel(`mensajes_chat_${chatActivo.id_chat}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mensajes', filter: `id_chat=eq.${chatActivo.id_chat}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMensajes((prev) => {
                            if (prev.some((m) => m.id_mensaje === payload.new.id_mensaje)) {
                                return prev;
                            }
                            return [...prev, payload.new];
                        });

                        setChats((anteriores) =>
                            anteriores.map((c) =>
                                c.id_chat === payload.new.id_chat
                                    ? {
                                          ...c,
                                          mensajes: (c.mensajes || []).some(
                                              (m) => m.id_mensaje === payload.new.id_mensaje
                                          )
                                              ? c.mensajes
                                              : [...(c.mensajes || []), payload.new]
                                      }
                                    : c
                            )
                        );

                        if (payload.new.emisor_id !== miPerfilId) {
                            await supabase
                                .from("mensajes")
                                .update({ leido: true })
                                .eq("id_mensaje", payload.new.id_mensaje);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMensajes((prev) => prev.map(m => m.id_mensaje === payload.new.id_mensaje ? payload.new : m));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatActivo, miPerfilId]);

    const enviarMensaje = async () => {
        if (!chatActivo || !textoMensaje.trim() || !miPerfilId) return;

        const texto = textoMensaje.trim();
        setTextoMensaje("");

        const { error } = await supabase
            .from("mensajes")
            .insert([{
                id_chat: chatActivo.id_chat,
                emisor_id: miPerfilId,
                texto: texto
            }]);

        if (error) {
            setToast({ mostrar: true, mensaje: "Error al enviar mensaje.", tipo: "error" });
        } else {
            const receptorId = chatActivo.vendedor_id === miPerfilId ? chatActivo.comprador_id : chatActivo.vendedor_id;
            if (receptorId) {
                const titulo = 'Nuevo mensaje';
                const msjAviso = `Tienes un nuevo mensaje en el chat.`;

                const { error: errorNotificacion } = await supabase
                    .from('notificaciones')
                    .insert([{
                        perfil_id: receptorId,
                        titulo: titulo,
                        mensaje: msjAviso
                    }]);

                if (errorNotificacion) {
                    console.error("No se pudo crear la notificación:", errorNotificacion);
                }

                const { data: receptorData } = await supabase.from('perfiles').select('usuarios(email)').eq('perfil_id', receptorId).maybeSingle();
                if (receptorData?.usuarios?.email) {
                    enviarNotificacionPorCorreo(receptorData.usuarios.email, titulo, msjAviso);
                }
            }
        }
    };

    const AvatarConversacion = ({ chat, grande = false }) => {
        const foto = obtenerFotoOtro(chat);
        const inicial = obtenerNombreOtro(chat).charAt(0).toUpperCase();

        if (foto) {
            return (
                <img
                    src={foto}
                    alt={obtenerNombreOtro(chat)}
                    className={`msg-avatar-photo ${grande ? "grande" : ""}`}
                />
            );
        }

        return (
            <span className={`msg-avatar-fallback ${grande ? "grande" : ""}`}>
                {inicial}
            </span>
        );
    };

    const mostrarLista = !esMovil || vistaMovil === "lista";
    const mostrarChat = !esMovil || vistaMovil === "chat";

    return (
        <div className="mensajes-page container-fluid">
            <div className="row g-3 h-100">
                {mostrarLista && (
                    <div className="col-lg-4 h-100">
                        <section className="mensajes-lista msg-conv-panel">
                            <div className="msg-panel-header">
                                <h5 className="mb-0">Mensajes</h5>
                            </div>

                            <div className="mensajes-buscador">
                                <i className="bi bi-search" />
                                <Form.Control
                                    placeholder="Buscar"
                                    value={textoBusqueda}
                                    onChange={(e) => setTextoBusqueda(e.target.value)}
                                />
                            </div>

                            {cargando ? (
                                <div className="text-center my-5">
                                    <Spinner animation="border" variant="success" />
                                </div>
                            ) : (
                                <div className="msg-conv-list">
                                    {chatsFiltrados.map((chat) => {
                                        const ultimo = obtenerUltimoMensaje(chat);
                                        const noLeidos = contarNoLeidos(chat);
                                        const activo = chatActivo?.id_chat === chat.id_chat;

                                        return (
                                            <button
                                                type="button"
                                                key={chat.id_chat}
                                                className={`msg-conv-item ${activo ? "activo" : ""}`}
                                                onClick={() => seleccionarChat(chat)}
                                            >
                                                <div className="msg-conv-avatar-wrap">
                                                    <AvatarConversacion chat={chat} />
                                                </div>

                                                <div className="msg-conv-body">
                                                    <div className="msg-conv-top">
                                                        <strong className="msg-conv-name">
                                                            {obtenerNombreOtro(chat)}
                                                        </strong>
                                                        <span className="msg-conv-time">
                                                            {formatearHora(ultimo?.creado_en || chat.creado_en)}
                                                        </span>
                                                    </div>

                                                    <div className="msg-conv-bottom">
                                                        <p className="msg-conv-preview">
                                                            {ultimo?.texto || "Inicia la conversación"}
                                                        </p>

                                                        {noLeidos > 0 && (
                                                            <span className="msg-unread-badge">
                                                                {noLeidos > 9 ? "9+" : noLeidos}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span
                                                    className="msg-conv-delete"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        eliminarChat(chat.id_chat);
                                                    }}
                                                >
                                                    <i className="bi bi-trash3" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {!cargando && chatsFiltrados.length === 0 && (
                                        <div className="msg-conv-empty">
                                            <i className="bi bi-chat-square-text" />
                                            <p>No hay chats disponibles.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {mostrarChat && (
                    <div className="col-lg-8 h-100">
                        <section className="mensajes-chat">
                            {chatActivo ? (
                                <>
                                    <header className="mensajes-chat-header shadow-sm">
                                        {esMovil && (
                                            <button
                                                type="button"
                                                className="msg-back-btn"
                                                onClick={volverALaLista}
                                                aria-label="Volver a la lista"
                                            >
                                                <i className="bi bi-arrow-left" />
                                            </button>
                                        )}

                                        <div className="msg-conv-avatar-wrap">
                                            <AvatarConversacion chat={chatActivo} grande />
                                        </div>

                                        <div className="ms-3">
                                            <h6 className="mb-0 fw-bold">{obtenerNombreOtro(chatActivo)}</h6>
                                            <div className="d-flex align-items-center gap-2">
                                                <small className="text-muted">
                                                    {role === "vendedor" ? "Comprador" : "Vendedor"}
                                                </small>
                                            </div>
                                        </div>
                                    </header>

                                    {/* ==========================================
                                        CUADRITO DEL PRODUCTO (arriba del chat)
                                    ========================================== */}
                                    {chatActivo.productos && (
                                        <button
                                            type="button"
                                            className="msg-producto-contexto"
                                            onClick={irAlProducto}
                                            title="Ver detalle del producto"
                                        >
                                            <div className="msg-producto-contexto-img">
                                                {chatActivo.productos.imagen_url?.[0] ? (
                                                    <img
                                                        src={chatActivo.productos.imagen_url[0]}
                                                        alt={chatActivo.productos.nombre_producto}
                                                    />
                                                ) : (
                                                    <i className="bi bi-image" />
                                                )}
                                            </div>
                                            <div className="msg-producto-contexto-info">
                                                <span className="msg-producto-contexto-label">
                                                    Conversación iniciada por:
                                                </span>
                                                <strong className="msg-producto-contexto-nombre">
                                                    {chatActivo.productos.nombre_producto}
                                                </strong>
                                            </div>
                                            <i className="bi bi-chevron-right msg-producto-contexto-arrow" />
                                        </button>
                                    )}

                                    <div className="mensajes-chat-cuerpo" ref={scrollRef}>
                                        {mensajes.map((mensaje) => {
                                            const esMio = mensaje.emisor_id === miPerfilId;
                                            return (
                                                <div
                                                    key={mensaje.id_mensaje}
                                                    className={`burbuja-wrapper ${esMio ? "yo" : "otro"}`}
                                                >
                                                    <div className="burbuja-mensaje">
                                                        <p>{mensaje.texto}</p>
                                                        <div className="d-flex align-items-center justify-content-end gap-1">
                                                            <small>{new Date(mensaje.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                            {esMio && (
                                                                <i className={`bi bi-check2${mensaje.leido ? '-all text-primary' : ''}`} style={{ fontSize: '0.8rem' }} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <footer className="mensajes-chat-footer">
                                        <button type="button" className="btn btn-link text-dark p-0">
                                            <i className="bi bi-plus-lg" />
                                        </button>
                                        <Form.Control
                                            placeholder="Enviar mensaje"
                                            value={textoMensaje}
                                            onChange={(e) => setTextoMensaje(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    enviarMensaje();
                                                }
                                            }}
                                        />
                                        <button type="button" className="btn btn-link text-primary p-0" onClick={enviarMensaje}>
                                            <i className="bi bi-send-fill" />
                                        </button>
                                    </footer>
                                </>
                            ) : (
                                <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted bg-light rounded-4 border-dashed border-2">
                                    <div className="bg-white p-4 rounded-circle shadow-sm mb-3">
                                        <i className="bi bi-chat-dots text-primary" style={{ fontSize: '3rem' }} />
                                    </div>
                                    <h5 className="fw-bold">Tus Mensajes</h5>
                                    <p className="small px-4 text-center">Selecciona una conversación de la izquierda para ver los detalles y mensajes del producto.</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            <NotificacionOperacion
                mostrar={toast.mostrar}
                mensaje={toast.mensaje}
                tipo={toast.tipo}
                onCerrar={() => setToast((prev) => ({ ...prev, mostrar: false }))}
            />
        </div>
    );
};

export default Mensajes;