import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert, Form } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import NotificacionOperacion from "../components/NotificacionOperacion";
import ModalRegistroProducto from "../components/productos/ModalRegistroProducto";
import ModalEdicionProducto from "../components/productos/ModalEdicionProducto";
import ModalEliminacionProducto from "../components/productos/ModalEliminacionProducto";
import ModalDescuentoProducto from "../components/productos/ModalDescuentoProducto";
import TarjetasProductos from "../components/productos/TarjetasProductos";
import TablaProductos from "../components/productos/TablaProductos";
import CuadroBusquedas from "../components/busquedas/CuadroBusquedas";
import Paginacion from "../components/ordenamiento/Paginacion";
import { useAuth } from "../context/AuthContext";
import { analizarSeguridadProducto } from "../utils/moderacion";

const Productos = () => {
  const { user, role, loading: authLoading } = useAuth();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [misTiendas, setMisTiendas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [idTienda, setIdTienda] = useState(null);
  const [filtroTienda, setFiltroTienda] = useState("");

  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
  const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [productoSeleccionadoDescuento, setProductoSeleccionadoDescuento] = useState(null);
  const [productoEditar, setProductoEditar] = useState(null);
  const [toast, setToast] = useState({ mostrar: false, mensaje: "", tipo: "" });

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [registrosPorPagina, establecerRegistrosPorPagina] = useState(5);
  const [paginaActual, establecerPaginaActual] = useState(1);
  const [procesandoIA, setProcesandoIA] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre_producto: "",
    descripcion: "",
    precio_venta: "",
    precio_compra: "",
    categoria_id: "",
    url_imagenes: "",
    id_estado: "2",
    stock: "",
    tallas: [],
    colores: [],
    id_tienda: "",
  });

  const cargarMisTiendas = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("tiendas")
        .select("id_tienda, nombre_tienda")
        .eq("id_usuario", user.id)
        .order("nombre_tienda");

      if (error) throw error;
      const lista = data || [];
      setMisTiendas(lista);

      if (lista.length === 1) {
        setNuevoProducto((prev) => ({ ...prev, id_tienda: lista[0].id_tienda }));
        setIdTienda(lista[0].id_tienda);
      } else if (lista.length > 0) {
        setIdTienda(lista[0].id_tienda);
      } else {
        setIdTienda(null);
      }
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    }
  };

  const cargarProductos = async (estaCancelado = () => false) => {
    try {
      setCargando(true);
      if (!user?.id) return;

      let query = supabase
        .from("productos")
        .select(`*, categorias(nombre_categoria), tiendas(nombre_tienda)`)
        .order("creado_en", { ascending: false });

      if (role === "admin") {
        const { data, error } = await query;
        if (error) throw error;
        if (estaCancelado()) return;
        setProductos(data || []);
        setIdTienda(null);
      } else {
        const { data: tiendasUser } = await supabase
          .from("tiendas")
          .select("id_tienda")
          .eq("id_usuario", user.id);

        if (estaCancelado()) return;

        const ids = (tiendasUser || []).map((t) => t.id_tienda);
        if (ids.length === 0) {
          setProductos([]);
          setIdTienda(null);
          return;
        }

        setIdTienda(ids[0]);

        const { data, error } = await query.in("id_tienda", ids);
        if (error) throw error;
        if (estaCancelado()) return;
        setProductos(data || []);
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setToast({
        mostrar: true,
        mensaje: "Error al cargar los productos",
        tipo: "error",
      });
    } finally {
      if (!estaCancelado()) setCargando(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("nombre_categoria");
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error("Error categorías:", err.message);
    }
  };

  useEffect(() => {
    let lista = productos;

    if (filtroTienda) {
      lista = lista.filter((p) => String(p.id_tienda) === String(filtroTienda));
    }

    if (textoBusqueda.trim()) {
      const busqueda = textoBusqueda.toLowerCase().trim();
      lista = lista.filter((p) => {
        const nombreStr = p.nombre_producto
          ? String(p.nombre_producto).toLowerCase()
          : "";
        const catStr = p.categorias?.nombre_categoria
          ? String(p.categorias.nombre_categoria).toLowerCase()
          : "";
        const tiendaStr = p.tiendas?.nombre_tienda
          ? String(p.tiendas.nombre_tienda).toLowerCase()
          : "";
        return (
          nombreStr.includes(busqueda) ||
          catStr.includes(busqueda) ||
          tiendaStr.includes(busqueda)
        );
      });
    }

    setProductosFiltrados(lista);
  }, [textoBusqueda, productos, filtroTienda]);

  useEffect(() => {
    establecerPaginaActual(1);
  }, [textoBusqueda, filtroTienda]);

  const productosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * registrosPorPagina,
    paginaActual * registrosPorPagina
  );

  const manejarCambioBusqueda = (e) => setTextoBusqueda(e.target.value);

  const manejoCambioInput = (e) => {
    const { name, value } = e.target;
    setNuevoProducto((prev) => ({ ...prev, [name]: value }));
  };

  const manejoCambioInputEdicion = (e) => {
    const { name, value } = e.target;
    setProductoEditar((prev) => ({ ...prev, [name]: value }));
  };

  const parsearNumero = (valor) =>
    Number.parseFloat(String(valor).replace(",", "."));

  // ============================================================
  // NOTIFICAR AL ADMIN
  // ============================================================
  const notificarAdminInfraccion = async (usuarioAfectado, analisis) => {
    try {
      const { data: admins } = await supabase
        .from("usuarios")
        .select("id_usuario")
        .eq("rol", "admin");

      if (!admins || admins.length === 0) return;

      for (const admin of admins) {
        const { data: perfilAdmin } = await supabase
          .from("perfiles")
          .select("perfil_id")
          .eq("id_usuario", admin.id_usuario)
          .single();

        if (perfilAdmin) {
          await supabase.from("notificaciones").insert([
            {
              perfil_id: perfilAdmin.perfil_id,
              titulo: "⚠️ Alerta de Seguridad: Vendedor Reincidente",
              mensaje: `El usuario ${usuarioAfectado?.email || "desconocido"} ha intentado publicar un producto prohibido (${analisis.categoria_infraccion}).`,
              leido: false,
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Error notificando al admin:", err);
    }
  };

  // ============================================================
  // REGISTRAR INFRACCIÓN AL USUARIO
  // ============================================================
  const registrarInfraccion = async (analisis) => {
    try {
      const { data: usuarioData, error: readError } = await supabase
        .from("usuarios")
        .select("infracciones")
        .eq("id_usuario", user.id)
        .single();

      if (readError) {
        console.warn("No se pudo leer infracciones:", readError);
        return;
      }

      const nuevasInfracciones = (usuarioData?.infracciones || 0) + 1;

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ infracciones: nuevasInfracciones })
        .eq("id_usuario", user.id);

      if (updateError) {
        console.warn("No se pudo actualizar infracciones:", updateError);
        return;
      }

      if (nuevasInfracciones >= 2) {
        await notificarAdminInfraccion(user, analisis);
      }
    } catch (err) {
      console.error("Error registrando infracción:", err);
    }
  };

  const analizarCalidadImagen = (archivo) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(img, 0, 0, 100, 100);
          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;
          let brilloTotal = 0;
          let pixelesOscuros = 0;
          for (let i = 0; i < data.length; i += 4) {
            const brilloPixel = (data[i] + data[i + 1] + data[i + 2]) / 3;
            brilloTotal += brilloPixel;
            if (brilloPixel < 60) pixelesOscuros++;
          }
          const promedio = brilloTotal / (data.length / 4);
          const porcentajeOscuro = (pixelesOscuros / (data.length / 4)) * 100;
          resolve({
            esOscura: promedio < 65 || porcentajeOscuro > 60,
            brillo: promedio,
            porcentajeOscuro,
          });
        };
      };
    });
  };

  const subirImagenASupabase = async (archivo, bucketName) => {
    try {
      let archivoAProcesar = archivo;
      const REMOVE_BG_API_KEY = "A5oKmc4xcBmtcjtBzAvx7XeN";
      if (REMOVE_BG_API_KEY && REMOVE_BG_API_KEY !== "TU_API_KEY_AQUI") {
        setProcesandoIA(true);
        try {
          const formData = new FormData();
          formData.append("image_file", archivo);
          formData.append("size", "auto");
          const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": REMOVE_BG_API_KEY },
            body: formData,
          });
          if (response.ok) {
            const blob = await response.blob();
            archivoAProcesar = new File([blob], archivo.name, { type: "image/png" });
          }
        } catch (err) {
          console.error("Error procesando IA:", err);
        } finally {
          setProcesandoIA(false);
        }
      }

      const fileExt = archivoAProcesar.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, archivoAProcesar);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw new Error("No se pudo subir la imagen al servidor.");
    }
  };

  const manejoCambioArchivo = async (e) => {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;
    const archivosValidos = [];
    for (const archivo of archivos) {
      if (archivo.size < 1024) {
        setToast({
          mostrar: true,
          mensaje: `La imagen "${archivo.name}" es demasiado pequeña o está corrupta.`,
          tipo: "advertencia",
        });
        continue;
      }
      if (archivo.size > 10 * 1024 * 1024) {
        setToast({
          mostrar: true,
          mensaje: `La imagen "${archivo.name}" supera el límite de 10MB.`,
          tipo: "advertencia",
        });
        continue;
      }
      const tiposPermitidos = [
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
      ];
      const extension = archivo.name.split(".").pop().toLowerCase();
      const extensionesValidas = [
        "jpg", "jpeg", "png", "webp", "gif", "avif", "jfif", "pjpeg", "pjp",
      ];
      if (
        !tiposPermitidos.includes(archivo.type) &&
        !extensionesValidas.includes(extension)
      ) {
        setToast({
          mostrar: true,
          mensaje: `El archivo "${archivo.name}" no es una imagen compatible.`,
          tipo: "advertencia",
        });
        continue;
      }
      const calidad = await analizarCalidadImagen(archivo);
      if (calidad.esOscura) {
        setToast({
          mostrar: true,
          mensaje: `La imagen "${archivo.name}" es demasiado oscura o tiene mal contraste.`,
          tipo: "error",
        });
        continue;
      }
      archivosValidos.push(archivo);
    }
    if (archivosValidos.length > 0) {
      setNuevoProducto((prev) => ({ ...prev, archivos_imagen: archivosValidos }));
    }
  };

  const manejoCambioArchivoActualizar = async (e) => {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;
    const archivosValidos = [];
    for (const archivo of archivos) {
      if (archivo.size < 1024) continue;
      if (archivo.size > 10 * 1024 * 1024) continue;
      const tiposPermitidos = [
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
      ];
      const extension = archivo.name.split(".").pop().toLowerCase();
      const extensionesValidas = [
        "jpg", "jpeg", "png", "webp", "gif", "avif", "jfif", "pjpeg", "pjp",
      ];
      if (
        tiposPermitidos.includes(archivo.type) ||
        extensionesValidas.includes(extension)
      ) {
        const calidad = await analizarCalidadImagen(archivo);
        if (calidad.esOscura) {
          setToast({
            mostrar: true,
            mensaje: "La nueva imagen es demasiado oscura.",
            tipo: "error",
          });
          continue;
        }
        archivosValidos.push(archivo);
      }
    }
    if (archivosValidos.length > 0) {
      setProductoEditar((prev) => ({ ...prev, archivos_imagen: archivosValidos }));
    }
  };

  const abrirModalEdicion = (producto) => {
    setProductoEditar({
      ...producto,
      url_imagenes: Array.isArray(producto.imagen_url)
        ? producto.imagen_url
        : producto.imagen_url
        ? [producto.imagen_url]
        : [],
      archivos_imagen: null,
      id_estado: producto.id_estado?.toString() || "2",
    });
    setMostrarModalEdicion(true);
  };

  const abrirModalEliminacion = (producto) => {
    setProductoAEliminar(producto);
    setMostrarModalEliminacion(true);
  };

  const abrirModalDescuento = (producto) => {
    setProductoSeleccionadoDescuento(producto);
    setMostrarModalDescuento(true);
  };

  const aplicarDescuento = async (producto, nuevoPrecio) => {
    try {
      const precioActual = Number(producto.precio_venta || 0);
      const precioCompra = Number(producto.precio_compra || 0);

      if (nuevoPrecio >= precioActual) {
        setToast({
          mostrar: true,
          mensaje: "El nuevo precio debe ser menor al precio actual.",
          tipo: "advertencia",
        });
        return false;
      }

      if (nuevoPrecio < precioCompra) {
        setToast({
          mostrar: true,
          mensaje: `El precio con descuento no puede ser menor al precio de compra (C$${precioCompra.toFixed(2)}).`,
          tipo: "advertencia",
        });
        return false;
      }

      const precioFinal = Math.round(nuevoPrecio * 100) / 100;
      const precioOriginalExistente = Number(producto.precio_original || 0);
      const precioParaGuardar =
        precioOriginalExistente > 0 ? precioOriginalExistente : precioActual;

      const { error } = await supabase
        .from("productos")
        .update({
          precio_venta: precioFinal,
          precio_original: precioParaGuardar,
        })
        .eq("id_producto", producto.id_producto);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((item) =>
          item.id_producto === producto.id_producto
            ? {
                ...item,
                precio_venta: precioFinal,
                precio_original: precioParaGuardar,
              }
            : item
        )
      );

      setToast({
        mostrar: true,
        mensaje: `Descuento aplicado con éxito. Nuevo precio: C$${precioFinal.toFixed(2)}`,
        tipo: "exito",
      });
      return true;
    } catch (err) {
      console.error("Error al aplicar descuento:", err.message);
      setToast({
        mostrar: true,
        mensaje: "Error al aplicar descuento.",
        tipo: "error",
      });
      return false;
    }
  };

  const agregarProducto = async () => {
    try {
      if (
        !nuevoProducto.nombre_producto.trim() ||
        !nuevoProducto.categoria_id ||
        !nuevoProducto.precio_compra ||
        !nuevoProducto.precio_venta
      ) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar todos los campos obligatorios.",
          tipo: "advertencia",
        });
        return;
      }

      if (!nuevoProducto.id_tienda) {
        setToast({
          mostrar: true,
          mensaje: "Debes seleccionar a qué tienda pertenece el producto.",
          tipo: "advertencia",
        });
        return;
      }

      try {
        const { data: suscripcion, error: suscripcionError } = await supabase
          .from("suscripciones")
          .select("limite_productos")
          .eq("id_usuario", user.id)
          .eq("estado", "activo")
          .maybeSingle();

        if (suscripcionError) {
          console.warn("Error al verificar suscripción:", suscripcionError);
        }

        if (suscripcion?.limite_productos !== null && suscripcion?.limite_productos !== undefined) {
          const { count, error: countError } = await supabase
            .from("productos")
            .select("*", { count: "exact", head: true })
            .eq("id_tienda", nuevoProducto.id_tienda);

          if (countError) {
            console.warn("Error al contar productos:", countError);
          } else if (count >= suscripcion.limite_productos) {
            setToast({
              mostrar: true,
              mensaje: `Has alcanzado el límite de ${suscripcion.limite_productos} productos permitidos por tienda.`,
              tipo: "error",
            });
            return;
          }
        }
      } catch (err) {
        console.warn("Error en verificación de límite:", err);
      }

      // ✅ MODERACIÓN (solo palabras clave, sin IA, sin await)
      const analisis = analizarSeguridadProducto(nuevoProducto);
      if (!analisis.aprobado) {
        await registrarInfraccion(analisis);
        setToast({
          mostrar: true,
          mensaje: `🚫 Bloqueado por Seguridad: ${analisis.motivo}`,
          tipo: "error",
        });
        return;
      }

      const precioCompra = parsearNumero(nuevoProducto.precio_compra);
      const precioVenta = parsearNumero(nuevoProducto.precio_venta);
      const categoriaId = Number.parseInt(nuevoProducto.categoria_id, 10);
      const idEstado = Number.parseInt(nuevoProducto.id_estado || "2", 10);

      if (
        !Number.isFinite(precioCompra) ||
        !Number.isFinite(precioVenta) ||
        !Number.isInteger(categoriaId)
      ) {
        setToast({
          mostrar: true,
          mensaje: "Precio o categoría inválidos. Verifica los datos.",
          tipo: "advertencia",
        });
        return;
      }

      setCargando(true);

      let urlsPublicas = [];
      if (nuevoProducto.archivos_imagen && nuevoProducto.archivos_imagen.length > 0) {
        for (const archivo of nuevoProducto.archivos_imagen) {
          const url = await subirImagenASupabase(archivo, "productos");
          urlsPublicas.push(url);
        }
      }

      const payload = {
        nombre_producto: nuevoProducto.nombre_producto.trim(),
        descripcion: nuevoProducto.descripcion?.trim() || "",
        precio_venta: precioVenta,
        precio_compra: precioCompra,
        categoria_id: categoriaId,
        id_tienda: nuevoProducto.id_tienda,
        id_estado: Number.isInteger(idEstado) ? idEstado : 2,
        imagen_url: urlsPublicas.length > 0 ? urlsPublicas : null,
        stock:
          nuevoProducto.stock !== "" ? parseInt(nuevoProducto.stock, 10) : null,
        tallas:
          nuevoProducto.tallas && nuevoProducto.tallas.length > 0
            ? nuevoProducto.tallas
            : null,
        colores:
          nuevoProducto.colores && nuevoProducto.colores.length > 0
            ? nuevoProducto.colores
            : null,
      };

      const { error } = await supabase.from("productos").insert([payload]);
      if (error) throw error;

      await cargarProductos();
      setMostrarModalRegistro(false);
      setNuevoProducto({
        nombre_producto: "",
        descripcion: "",
        precio_venta: "",
        precio_compra: "",
        categoria_id: "",
        url_imagenes: "",
        archivo_imagen: null,
        id_estado: "2",
        stock: "",
        tallas: [],
        colores: [],
        id_tienda: misTiendas.length === 1 ? misTiendas[0].id_tienda : "",
      });
      setToast({
        mostrar: true,
        mensaje: "Producto registrado exitosamente.",
        tipo: "exito",
      });
    } catch (err) {
      console.error("Error al registrar producto:", err.message);
      setToast({
        mostrar: true,
        mensaje: `Error al registrar producto: ${err.message}`,
        tipo: "error",
      });
    } finally {
      setCargando(false);
    }
  };

  const actualizarProducto = async () => {
    if (!productoEditar) return;

    try {
      if (
        !productoEditar.nombre_producto?.trim() ||
        !productoEditar.categoria_id ||
        !productoEditar.precio_compra ||
        !productoEditar.precio_venta
      ) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar todos los campos obligatorios.",
          tipo: "advertencia",
        });
        return;
      }

      if (!productoEditar.id_tienda) {
        setToast({
          mostrar: true,
          mensaje: "Debes seleccionar a qué tienda pertenece el producto.",
          tipo: "advertencia",
        });
        return;
      }

      // Moderación
      const analisis = analizarSeguridadProducto(productoEditar);
      if (!analisis.aprobado) {
        await registrarInfraccion(analisis);
        setToast({
          mostrar: true,
          mensaje: `🚫 Edición Bloqueada: ${analisis.motivo}`,
          tipo: "error",
        });
        return;
      }

      setCargando(true);

      let urlsPublicas = productoEditar.url_imagenes || [];
      if (
        productoEditar.archivos_imagen &&
        productoEditar.archivos_imagen.length > 0
      ) {
        urlsPublicas = [];
        for (const archivo of productoEditar.archivos_imagen) {
          const url = await subirImagenASupabase(archivo, "productos");
          urlsPublicas.push(url);
        }
      }

      const payload = {
        nombre_producto: productoEditar.nombre_producto.trim(),
        descripcion: productoEditar.descripcion?.trim() || "",
        precio_venta: Number(productoEditar.precio_venta),
        precio_compra: Number(productoEditar.precio_compra),
        categoria_id: Number(productoEditar.categoria_id),
        id_tienda: productoEditar.id_tienda,
        id_estado: Number(productoEditar.id_estado || 2),
        imagen_url: urlsPublicas.length > 0 ? urlsPublicas : null,
        stock:
          productoEditar.stock !== "" && productoEditar.stock !== undefined
            ? parseInt(productoEditar.stock, 10)
            : null,
        tallas:
          productoEditar.tallas && productoEditar.tallas.length > 0
            ? productoEditar.tallas
            : null,
        colores:
          productoEditar.colores && productoEditar.colores.length > 0
            ? productoEditar.colores
            : null,
      };

      const { error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id_producto", productoEditar.id_producto);

      if (error) throw error;

      await cargarProductos();
      setMostrarModalEdicion(false);
      setToast({
        mostrar: true,
        mensaje: "Producto actualizado exitosamente.",
        tipo: "exito",
      });
    } catch (err) {
      console.error("Error al actualizar producto:", err.message);
      setToast({
        mostrar: true,
        mensaje: `Error al actualizar producto: ${err.message}`,
        tipo: "error",
      });
    } finally {
      setCargando(false);
    }
  };

  const eliminarProducto = async () => {
    if (!productoAEliminar) return;

    try {
      const id = productoAEliminar.id_producto;

      const { count: numPedidos, error: errPedidos } = await supabase
        .from("pedidos")
        .select("id_pedido", { count: "exact", head: true })
        .eq("id_producto", id);

      if (errPedidos) throw errPedidos;

      if (numPedidos && numPedidos > 0) {
        setMostrarModalEliminacion(false);
        setToast({
          mostrar: true,
          mensaje: `No se puede eliminar "${productoAEliminar.nombre_producto}" porque tiene ${numPedidos} pedido(s) asociado(s). Puedes dejarlo sin stock o ocultarlo.`,
          tipo: "advertencia",
        });
        return;
      }

      await supabase.from("reseñas_productos").delete().eq("producto_id", id);

      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id_producto", id);

      if (error) throw error;

      await cargarProductos();
      setMostrarModalEliminacion(false);
      setToast({
        mostrar: true,
        mensaje: "Producto eliminado exitosamente.",
        tipo: "exito",
      });
    } catch (err) {
      console.error("Error al eliminar producto:", err.message);
      setToast({
        mostrar: true,
        mensaje:
          err.message?.includes("foreign key") || err.code === "23503"
            ? "No se puede eliminar: el producto está ligado a pedidos u otros registros."
            : `Error al eliminar producto: ${err.message}`,
        tipo: "error",
      });
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelado = false;
    cargarMisTiendas();
    cargarProductos(() => cancelado);
    return () => {
      cancelado = true;
    };
  }, [authLoading, user?.id, role]);

  return (
    <div
      style={{
        backgroundColor: "#f0f7fa",
        minHeight: "100vh",
        paddingBottom: "100px",
      }}
    >
      <Container>
        <Row className="align-items-center mb-3">
          <Col xs={9}>
            <h3>
              <i className="bi bi-box-seam me-2"></i>
              {role === "admin"
                ? "Todos los Productos - Administrador"
                : "Mis Productos"}
            </h3>
          </Col>
          {role === "vendedor" && (
            <Col xs={3} className="text-end">
              <Button
                onClick={() => setMostrarModalRegistro(true)}
                disabled={misTiendas.length === 0}
              >
                <i className="bi bi-plus-lg"></i> Nuevo
              </Button>
            </Col>
          )}
        </Row>
        <hr />

        {misTiendas.length === 0 && role === "vendedor" && (
          <Alert variant="danger" className="text-center mt-4">
            <h5>
              <i className="bi bi-exclamation-triangle-fill me-2"></i> ¡Atención!
            </h5>
            <p className="mb-0">
              Para poder agregar productos, primero debes registrar o tener
              vinculada una <strong>Tienda</strong>. Ve a la sección &quot;Mis
              Tiendas&quot; para crear una.
            </p>
          </Alert>
        )}

        <CuadroBusquedas
          textoBusqueda={textoBusqueda}
          manejarCambioBusqueda={manejarCambioBusqueda}
        />

        {role === "vendedor" && misTiendas.length > 1 && (
          <Form.Select
            className="mb-3"
            value={filtroTienda}
            onChange={(e) => setFiltroTienda(e.target.value)}
            style={{
              backgroundColor: "#e8f4f8",
              border: "none",
              borderRadius: 12,
              maxWidth: 280,
            }}
          >
            <option value="">Todas las tiendas</option>
            {misTiendas.map((t) => (
              <option key={t.id_tienda} value={t.id_tienda}>
                {t.nombre_tienda}
              </option>
            ))}
          </Form.Select>
        )}

        {textoBusqueda.trim() !== "" && productosFiltrados.length === 0 && (
          <Alert variant="warning" className="mt-3">
            No se encontraron productos que coincidan con la búsqueda.
          </Alert>
        )}

        <br />

        <ModalRegistroProducto
          mostrarModal={mostrarModalRegistro}
          setMostrarModal={setMostrarModalRegistro}
          nuevoProducto={nuevoProducto}
          manejoCambioInput={manejoCambioInput}
          manejoCambioArchivo={manejoCambioArchivo}
          agregarProducto={agregarProducto}
          categorias={categorias}
          tiendas={misTiendas}
        />

        <ModalEdicionProducto
          mostrarModalEdicion={mostrarModalEdicion}
          setMostrarModalEdicion={setMostrarModalEdicion}
          productoEditar={productoEditar}
          manejoCambioInputEdicion={manejoCambioInputEdicion}
          manejoCambioArchivoActualizar={manejoCambioArchivoActualizar}
          actualizarProducto={actualizarProducto}
          categorias={categorias}
          tiendas={misTiendas}
        />

        <ModalEliminacionProducto
          mostrarModal={mostrarModalEliminacion}
          setMostrarModal={setMostrarModalEliminacion}
          productoAEliminar={productoAEliminar}
          eliminarProducto={eliminarProducto}
        />

        <ModalDescuentoProducto
          mostrarModal={mostrarModalDescuento}
          setMostrarModal={setMostrarModalDescuento}
          productoSeleccionado={productoSeleccionadoDescuento}
          aplicarDescuento={aplicarDescuento}
        />

        <NotificacionOperacion
          mostrar={toast.mostrar}
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onCerrar={() => setToast({ ...toast, mostrar: false })}
        />

        {procesandoIA && (
          <Alert
            variant="info"
            className="text-center mb-3 border-0 shadow-sm rounded-pill py-2"
          >
            <Spinner animation="grow" size="sm" variant="info" className="me-2" />
            <span className="small fw-bold">
              Optimizando imagen con IA (Borrando fondo y mejorando nitidez)...
            </span>
          </Alert>
        )}

        {cargando ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <>
            <div className="d-lg-none">
              <div className="mt-3">
                <TarjetasProductos
                  productos={productosPaginados}
                  abrirModalEdicion={abrirModalEdicion}
                  abrirModalEliminacion={abrirModalEliminacion}
                  abrirModalDescuento={abrirModalDescuento}
                />
              </div>
            </div>

            <div className="d-none d-lg-block">
              <TablaProductos
                productos={productosPaginados}
                abrirModalEdicion={abrirModalEdicion}
                abrirModalEliminacion={abrirModalEliminacion}
                abrirModalDescuento={abrirModalDescuento}
              />
            </div>

            {productos.length === 0 && (
              <p className="text-center">No hay productos registrados.</p>
            )}
          </>
        )}

        <Paginacion
          registrosPorPagina={registrosPorPagina}
          totalRegistros={productosFiltrados.length}
          paginaActual={paginaActual}
          establecerPaginaActual={establecerPaginaActual}
          establecerRegistrosPorPagina={establecerRegistrosPorPagina}
        />
      </Container>
    </div>
  );
};

export default Productos;