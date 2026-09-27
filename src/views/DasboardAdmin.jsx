import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";

const DEPTOS_NI = [
  "Managua",
  "León",
  "Chinándega",
  "Masaya",
  "Granada",
  "Carazo",
  "Rivas",
  "Matagalpa",
  "Jinotega",
  "Estelí",
  "Madriz",
  "Nueva Segovia",
  "Boaco",
  "Chontales",
  "Río San Juan",
  "Costa Caribe Norte",
  "Costa Caribe Sur",
];

const COLORES = [
  "#0d5c63",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#10b981",
];

const formatearDinero = (n) =>
  `C$ ${Number(n || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const normalizarDepto = (texto = "") => {
  const t = String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!t) return null;

  const mapa = [
    ["managua", "Managua"],
    ["leon", "León"],
    ["chinandega", "Chinándega"],
    ["masaya", "Masaya"],
    ["granada", "Granada"],
    ["carazo", "Carazo"],
    ["rivas", "Rivas"],
    ["matagalpa", "Matagalpa"],
    ["jinotega", "Jinotega"],
    ["esteli", "Estelí"],
    ["madriz", "Madriz"],
    ["nueva segovia", "Nueva Segovia"],
    ["boaco", "Boaco"],
    ["chontales", "Chontales"],
    ["rio san juan", "Río San Juan"],
    ["costa caribe norte", "Costa Caribe Norte"],
    ["racn", "Costa Caribe Norte"],
    ["costa caribe sur", "Costa Caribe Sur"],
    ["racs", "Costa Caribe Sur"],
  ];

  for (const [key, nombre] of mapa) {
    if (t.includes(key)) return nombre;
  }
  return null;
};

const porcentajeCambio = (actual, anterior) => {
  if (!anterior) return actual ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
};

export const DasboardAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState(30);

  const [kpis, setKpis] = useState({
    ingresos: 0,
    ingresosAnterior: 0,
    nuevosClientes: 0,
    nuevosClientesAnterior: 0,
    pedidos: 0,
    pedidosAnterior: 0,
  });

  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [usuariosPorDepto, setUsuariosPorDepto] = useState([]);
  const [ventasPorDepto, setVentasPorDepto] = useState([]);

  // Interactividad
  const [deptoHover, setDeptoHover] = useState(null);
  const [deptoSeleccionado, setDeptoSeleccionado] = useState(null);
  const [diaHover, setDiaHover] = useState(null);
  const [productoHover, setProductoHover] = useState(null);
  const [ventaDeptoHover, setVentaDeptoHover] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      if (!user) return;

      try {
        setCargando(true);

        const ahora = new Date();
        const desde = new Date(ahora);
        desde.setDate(desde.getDate() - rango);

        const desdeAnterior = new Date(desde);
        desdeAnterior.setDate(desdeAnterior.getDate() - rango);

        let listaPedidos = [];
        const { data: pedidos, error: errPedidos } = await supabase
          .from("pedidos")
          .select(
            `
            id_pedido,
            creado_en,
            estado,
            total,
            monto_total,
            id_perfil,
            id_producto,
            productos ( id_producto, nombre_producto, precio_venta )
          `
          )
          .gte("creado_en", desdeAnterior.toISOString())
          .order("creado_en", { ascending: true });

        if (errPedidos) {
          console.warn("Consulta pedidos ampliada falló:", errPedidos.message);
          const { data: pedidos2 } = await supabase
            .from("pedidos")
            .select("*, productos(nombre_producto, precio_venta)")
            .gte("creado_en", desdeAnterior.toISOString())
            .order("creado_en", { ascending: true });
          listaPedidos = pedidos2 || [];
        } else {
          listaPedidos = pedidos || [];
        }

        const montoPedido = (p) => {
          const t = p.total ?? p.monto_total ?? p.productos?.precio_venta ?? 0;
          return Number(t) || 0;
        };

        const enRango = listaPedidos.filter(
          (p) => new Date(p.creado_en) >= desde
        );
        const enAnterior = listaPedidos.filter((p) => {
          const d = new Date(p.creado_en);
          return d >= desdeAnterior && d < desde;
        });

        const ingresos = enRango.reduce((s, p) => s + montoPedido(p), 0);
        const ingresosAnterior = enAnterior.reduce(
          (s, p) => s + montoPedido(p),
          0
        );

        const mapaDias = {};
        for (let i = 0; i < rango; i++) {
          const d = new Date(desde);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          mapaDias[key] = 0;
        }
        enRango.forEach((p) => {
          const key = new Date(p.creado_en).toISOString().slice(0, 10);
          if (mapaDias[key] != null) mapaDias[key] += montoPedido(p);
        });
        setVentasPorDia(
          Object.entries(mapaDias).map(([fecha, total]) => ({ fecha, total }))
        );

        const prodMap = {};
        enRango.forEach((p) => {
          const id = p.id_producto || p.productos?.id_producto || "x";
          const nombre = p.productos?.nombre_producto || "Producto";
          if (!prodMap[id]) {
            prodMap[id] = { id, nombre, cantidad: 0, total: 0 };
          }
          prodMap[id].cantidad += 1;
          prodMap[id].total += montoPedido(p);
        });
        setTopProductos(
          Object.values(prodMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6)
        );

        const { data: perfiles } = await supabase
          .from("perfiles")
          .select("perfil_id, creado_en")
          .gte("creado_en", desdeAnterior.toISOString());

        const nuevosClientes = (perfiles || []).filter(
          (p) => new Date(p.creado_en) >= desde
        ).length;
        const nuevosClientesAnterior = (perfiles || []).filter((p) => {
          const d = new Date(p.creado_en);
          return d >= desdeAnterior && d < desde;
        }).length;

        setKpis({
          ingresos,
          ingresosAnterior,
          nuevosClientes,
          nuevosClientesAnterior,
          pedidos: enRango.length,
          pedidosAnterior: enAnterior.length,
        });

        const { data: dirs } = await supabase
          .from("direcciones")
          .select(
            "id_direccion, departamento, ciudad, direccion, perfil_id, pais"
          );

        const contUsuarios = {};
        (dirs || []).forEach((d) => {
          const pais = String(d.pais || "nicaragua").toLowerCase();
          if (pais && !pais.includes("nicar") && pais !== "ni") return;

          const depto =
            normalizarDepto(d.departamento) ||
            normalizarDepto(d.ciudad) ||
            normalizarDepto(d.direccion) ||
            "Sin departamento";

          contUsuarios[depto] = (contUsuarios[depto] || 0) + 1;
        });

        let listaUsuarios = Object.entries(contUsuarios)
          .map(([nombre, valor]) => ({ nombre, valor }))
          .sort((a, b) => b.valor - a.valor);

        if (listaUsuarios.length === 0) {
          listaUsuarios = DEPTOS_NI.slice(0, 6).map((nombre) => ({
            nombre,
            valor: 0,
          }));
        }
        setUsuariosPorDepto(listaUsuarios.slice(0, 8));

        const dirPorPerfil = {};
        (dirs || []).forEach((d) => {
          if (!d.perfil_id) return;
          if (!dirPorPerfil[d.perfil_id]) dirPorPerfil[d.perfil_id] = d;
        });

        const contVentas = {};
        enRango.forEach((p) => {
          const dir = dirPorPerfil[p.id_perfil] || dirPorPerfil[p.perfil_id];
          let depto = "Sin departamento";
          if (dir) {
            depto =
              normalizarDepto(dir.departamento) ||
              normalizarDepto(dir.ciudad) ||
              normalizarDepto(dir.direccion) ||
              "Sin departamento";
          }
          contVentas[depto] = (contVentas[depto] || 0) + montoPedido(p);
        });

        let listaVentas = Object.entries(contVentas)
          .map(([nombre, valor]) => ({ nombre, valor }))
          .sort((a, b) => b.valor - a.valor);

        if (listaVentas.length === 0) {
          listaVentas = DEPTOS_NI.slice(0, 5).map((nombre) => ({
            nombre,
            valor: 0,
          }));
        }
        setVentasPorDepto(listaVentas.slice(0, 8));
      } catch (err) {
        console.error("Error dashboard:", err);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [user, rango]);

  const crecimientoVentas = porcentajeCambio(
    kpis.ingresos,
    kpis.ingresosAnterior
  );
  const crecimientoClientes = porcentajeCambio(
    kpis.nuevosClientes,
    kpis.nuevosClientesAnterior
  );
  const ticketPromedio =
    kpis.pedidos > 0 ? kpis.ingresos / kpis.pedidos : 0;
  const ticketAnterior =
    kpis.pedidosAnterior > 0
      ? kpis.ingresosAnterior / kpis.pedidosAnterior
      : 0;

  const maxDia = useMemo(
    () => Math.max(1, ...ventasPorDia.map((d) => d.total)),
    [ventasPorDia]
  );
  const maxProd = useMemo(
    () => Math.max(1, ...topProductos.map((p) => p.total)),
    [topProductos]
  );
  const maxVentaDepto = useMemo(
    () => Math.max(1, ...ventasPorDepto.map((d) => d.valor)),
    [ventasPorDepto]
  );
  const totalUsuariosDepto = useMemo(
    () => usuariosPorDepto.reduce((s, d) => s + d.valor, 0) || 1,
    [usuariosPorDepto]
  );

  const pieSlices = useMemo(() => {
    let ang = -90;
    return usuariosPorDepto.map((d, i) => {
      const porcion = (d.valor / totalUsuariosDepto) * 360;
      const start = ang;
      ang += porcion;
      return { ...d, start, porcion, color: COLORES[i % COLORES.length] };
    });
  }, [usuariosPorDepto, totalUsuariosDepto]);

  const polar = (cx, cy, r, deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (cx, cy, r, startDeg, endDeg) => {
    const s = polar(cx, cy, r, startDeg);
    const e = polar(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  const toggleDepto = (nombre) => {
    setDeptoSeleccionado((prev) => (prev === nombre ? null : nombre));
  };

  const tarjeta = {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 2px 10px rgba(13, 92, 99, 0.06)",
  };

  if (cargando) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh", backgroundColor: "#f0f7fa" }}
      >
        <Spinner animation="border" style={{ color: "#0d5c63" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f0f7fa",
        minHeight: "100vh",
        paddingBottom: 100,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{ maxWidth: 1100, margin: "0 auto" }}
        className="px-3 px-md-4 pt-4"
      >
        {/* Encabezado */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn p-0 border-0 bg-transparent"
              onClick={() => navigate(-1)}
            >
              <i
                className="bi bi-arrow-left"
                style={{ fontSize: "1.35rem", color: "#0f172a" }}
              />
            </button>
            <div>
              <h1
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "#0d5c63",
                  margin: 0,
                }}
              >
                Panel de estadísticas
              </h1>
              <small style={{ color: "#64748b" }}>
                Nicaragua · últimos {rango} días
              </small>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <select
              value={rango}
              onChange={(e) => setRango(Number(e.target.value))}
              style={{
                background: "white",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "8px 12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <span
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "8px 12px",
                color: "#0d5c63",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Región: Nicaragua
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="row g-3 mb-3">
          {[
            {
              etiqueta: "Ingresos totales",
              valor: formatearDinero(kpis.ingresos),
              delta: crecimientoVentas,
              icono: "currency-dollar",
            },
            {
              etiqueta: "Clientes nuevos",
              valor: kpis.nuevosClientes,
              delta: crecimientoClientes,
              icono: "people",
            },
            {
              etiqueta: "Crecimiento de ventas",
              valor: `${crecimientoVentas}%`,
              delta: crecimientoVentas,
              icono: "graph-up-arrow",
            },
            {
              etiqueta: "Ticket promedio",
              valor: formatearDinero(ticketPromedio),
              delta: porcentajeCambio(ticketPromedio, ticketAnterior),
              icono: "bag-check",
            },
          ].map((k) => (
            <div className="col-6 col-lg-3" key={k.etiqueta}>
              <div
                style={{
                  ...tarjeta,
                  transition: "transform 0.15s, box-shadow 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(13, 92, 99, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = tarjeta.boxShadow;
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <small style={{ color: "#64748b", fontWeight: 500 }}>
                    {k.etiqueta}
                  </small>
                  <i
                    className={`bi bi-${k.icono}`}
                    style={{ color: "#0d5c63" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginTop: 8,
                  }}
                >
                  {k.valor}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    marginTop: 6,
                    color: k.delta >= 0 ? "#059669" : "#dc2626",
                    fontWeight: 600,
                  }}
                >
                  {k.delta >= 0 ? "+" : ""}
                  {k.delta}% vs periodo anterior
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3 mb-3">
          {/* Resumen de ventas — interactivo */}
          <div className="col-lg-8">
            <div style={{ ...tarjeta, height: "100%", position: "relative" }}>
              <div className="d-flex justify-content-between mb-2">
                <strong style={{ color: "#0f172a" }}>Resumen de ventas</strong>
                <small style={{ color: "#64748b" }}>
                  {diaHover
                    ? `${diaHover.fecha} · ${formatearDinero(diaHover.total)}`
                    : "Pasa el cursor sobre la línea"}
                </small>
              </div>
              <svg
                viewBox="0 0 600 220"
                width="100%"
                height="220"
                style={{ minWidth: 280 }}
                onMouseLeave={() => setDiaHover(null)}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="40"
                    x2="580"
                    y1={30 + i * 40}
                    y2={30 + i * 40}
                    stroke="#e2e8f0"
                  />
                ))}
                {ventasPorDia.length > 1 && (
                  <>
                    <path
                      d={
                        `M 40 ${190 - (ventasPorDia[0].total / maxDia) * 150} ` +
                        ventasPorDia
                          .map((d, i) => {
                            const x =
                              40 +
                              (i / Math.max(1, ventasPorDia.length - 1)) * 540;
                            const y = 190 - (d.total / maxDia) * 150;
                            return `L ${x} ${y}`;
                          })
                          .join(" ") +
                        ` L 580 190 L 40 190 Z`
                      }
                      fill="url(#gradAreaClaro)"
                      opacity="0.5"
                    />
                    <path
                      d={
                        `M 40 ${190 - (ventasPorDia[0].total / maxDia) * 150} ` +
                        ventasPorDia
                          .map((d, i) => {
                            const x =
                              40 +
                              (i / Math.max(1, ventasPorDia.length - 1)) * 540;
                            const y = 190 - (d.total / maxDia) * 150;
                            return `L ${x} ${y}`;
                          })
                          .join(" ")
                      }
                      fill="none"
                      stroke="#0d5c63"
                      strokeWidth="3"
                    />
                    {/* Puntos interactivos */}
                    {ventasPorDia.map((d, i) => {
                      const x =
                        40 +
                        (i / Math.max(1, ventasPorDia.length - 1)) * 540;
                      const y = 190 - (d.total / maxDia) * 150;
                      const activo =
                        diaHover && diaHover.fecha === d.fecha;
                      return (
                        <g key={d.fecha}>
                          <circle
                            cx={x}
                            cy={y}
                            r={activo ? 7 : 14}
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setDiaHover(d)}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r={activo ? 6 : 3}
                            fill={activo ? "#0d5c63" : "#14b8a6"}
                            stroke="#fff"
                            strokeWidth="2"
                            style={{
                              pointerEvents: "none",
                              transition: "r 0.15s",
                            }}
                          />
                        </g>
                      );
                    })}
                  </>
                )}
                <defs>
                  <linearGradient id="gradAreaClaro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d5c63" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0d5c63" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Usuarios por departamento — interactivo */}
          <div className="col-lg-4">
            <div style={{ ...tarjeta, height: "100%" }}>
              <strong style={{ color: "#0f172a" }}>
                Usuarios por departamento
              </strong>
              <small className="d-block mb-2" style={{ color: "#64748b" }}>
                Clic en un departamento para resaltar
              </small>
              <div className="d-flex align-items-center gap-2">
                <svg width="130" height="130" viewBox="0 0 120 120">
                  {pieSlices.map((s, i) => {
                    if (s.porcion <= 0) return null;
                    const end = s.start + Math.max(s.porcion, 0.5);
                    const activo =
                      deptoHover === s.nombre ||
                      deptoSeleccionado === s.nombre;
                    return (
                      <path
                        key={i}
                        d={arcPath(60, 60, activo ? 56 : 54, s.start, end)}
                        fill={s.color}
                        opacity={
                          deptoSeleccionado && deptoSeleccionado !== s.nombre
                            ? 0.35
                            : 1
                        }
                        style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                        onMouseEnter={() => setDeptoHover(s.nombre)}
                        onMouseLeave={() => setDeptoHover(null)}
                        onClick={() => toggleDepto(s.nombre)}
                      >
                        <title>
                          {s.nombre}: {s.valor} usuarios
                        </title>
                      </path>
                    );
                  })}
                  <circle cx="60" cy="60" r="28" fill="white" />
                  <text
                    x="60"
                    y="52"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="7"
                  >
                    {deptoHover || deptoSeleccionado || "Total"}
                  </text>
                  <text
                    x="60"
                    y="70"
                    textAnchor="middle"
                    fill="#0d5c63"
                    fontSize="13"
                    fontWeight="700"
                  >
                    {deptoHover || deptoSeleccionado
                      ? usuariosPorDepto.find(
                          (d) =>
                            d.nombre === (deptoHover || deptoSeleccionado)
                        )?.valor ?? 0
                      : totalUsuariosDepto}
                  </text>
                </svg>
                <div style={{ flex: 1, fontSize: "0.75rem" }}>
                  {usuariosPorDepto.slice(0, 5).map((d, i) => {
                    const activo =
                      deptoHover === d.nombre ||
                      deptoSeleccionado === d.nombre;
                    return (
                      <div
                        key={d.nombre}
                        className="d-flex justify-content-between mb-1"
                        style={{
                          padding: "2px 4px",
                          borderRadius: 6,
                          background: activo ? "#e6f4f6" : "transparent",
                          cursor: "pointer",
                          fontWeight: activo ? 700 : 400,
                        }}
                        onMouseEnter={() => setDeptoHover(d.nombre)}
                        onMouseLeave={() => setDeptoHover(null)}
                        onClick={() => toggleDepto(d.nombre)}
                      >
                        <span style={{ color: "#334155" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: COLORES[i % COLORES.length],
                              marginRight: 6,
                            }}
                          />
                          {d.nombre}
                        </span>
                        <strong style={{ color: "#0f172a" }}>{d.valor}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-3">
          {/* Productos más vendidos — interactivo */}
          <div className="col-lg-6">
            <div style={tarjeta}>
              <strong style={{ color: "#0f172a" }}>
                Productos más vendidos
              </strong>
              <div className="mt-3 d-flex flex-column gap-3">
                {topProductos.length === 0 && (
                  <small style={{ color: "#94a3b8" }}>
                    Sin ventas en el periodo
                  </small>
                )}
                {topProductos.map((p, i) => {
                  const activo = productoHover === p.id;
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setProductoHover(p.id)}
                      onMouseLeave={() => setProductoHover(null)}
                      style={{ cursor: "default" }}
                    >
                      <div className="d-flex justify-content-between mb-1">
                        <span
                          style={{
                            fontSize: "0.88rem",
                            color: "#334155",
                            fontWeight: activo ? 700 : 400,
                          }}
                        >
                          {p.nombre}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: activo ? "#0d5c63" : "#64748b",
                            fontWeight: activo ? 700 : 400,
                          }}
                        >
                          {formatearDinero(p.total)}
                          {activo && p.cantidad
                            ? ` · ${p.cantidad} pedidos`
                            : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          height: activo ? 12 : 10,
                          borderRadius: 8,
                          background: "#e2e8f0",
                          overflow: "hidden",
                          transition: "height 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: `${(p.total / maxProd) * 100}%`,
                            height: "100%",
                            borderRadius: 8,
                            background: `linear-gradient(90deg, ${COLORES[i % COLORES.length]}, #0d5c63)`,
                            opacity: activo ? 1 : 0.85,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ventas por departamento — interactivo */}
          <div className="col-lg-6">
            <div style={tarjeta}>
              <strong style={{ color: "#0f172a" }}>
                Ventas por departamento
              </strong>
              <small className="d-block mb-3" style={{ color: "#64748b" }}>
                Solo Nicaragua · pasa el cursor para detalle
              </small>
              <div className="d-flex flex-column gap-2">
                {ventasPorDepto.map((d, i) => {
                  const activo = ventaDeptoHover === d.nombre;
                  return (
                    <div
                      key={d.nombre}
                      onMouseEnter={() => setVentaDeptoHover(d.nombre)}
                      onMouseLeave={() => setVentaDeptoHover(null)}
                      style={{
                        padding: "4px 6px",
                        borderRadius: 8,
                        background: activo ? "#e6f4f6" : "transparent",
                        cursor: "default",
                      }}
                    >
                      <div className="d-flex justify-content-between mb-1">
                        <span
                          style={{
                            fontSize: "0.88rem",
                            color: "#334155",
                            fontWeight: activo ? 700 : 400,
                          }}
                        >
                          <i
                            className="bi bi-geo-alt-fill me-1"
                            style={{ color: COLORES[i % COLORES.length] }}
                          />
                          {d.nombre}
                        </span>
                        <strong
                          style={{
                            fontSize: "0.85rem",
                            color: "#0d5c63",
                          }}
                        >
                          {formatearDinero(d.valor)}
                        </strong>
                      </div>
                      <div
                        style={{
                          height: activo ? 10 : 8,
                          borderRadius: 8,
                          background: "#e2e8f0",
                          transition: "height 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: `${(d.valor / maxVentaDepto) * 100}%`,
                            height: "100%",
                            borderRadius: 8,
                            background: COLORES[i % COLORES.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Barras de productos — interactivo */}
        <div style={tarjeta}>
          <strong style={{ color: "#0f172a" }}>
            Productos más vendidos · volumen
          </strong>
          <div
            className="d-flex align-items-end gap-2 mt-3"
            style={{ height: 160 }}
          >
            {topProductos.length === 0 && (
              <small style={{ color: "#94a3b8" }}>Sin datos</small>
            )}
            {topProductos.map((p, i) => {
              const activo = productoHover === p.id;
              return (
                <div
                  key={p.id}
                  className="d-flex flex-column align-items-center"
                  style={{ flex: 1, cursor: "pointer" }}
                  onMouseEnter={() => setProductoHover(p.id)}
                  onMouseLeave={() => setProductoHover(null)}
                  title={`${p.nombre}: ${formatearDinero(p.total)}`}
                >
                  <div
                    style={{
                      width: activo ? "80%" : "70%",
                      maxWidth: 52,
                      height: `${(p.total / maxProd) * 130}px`,
                      minHeight: p.total > 0 ? 8 : 2,
                      borderRadius: "8px 8px 4px 4px",
                      background: `linear-gradient(180deg, ${COLORES[i % COLORES.length]}, #0d5c63)`,
                      transform: activo ? "scaleY(1.05)" : "none",
                      transformOrigin: "bottom",
                      transition: "all 0.15s",
                      boxShadow: activo
                        ? "0 4px 12px rgba(13,92,99,0.25)"
                        : "none",
                    }}
                  />
                  <small
                    style={{
                      fontSize: "0.65rem",
                      color: activo ? "#0d5c63" : "#64748b",
                      fontWeight: activo ? 700 : 400,
                      marginTop: 6,
                      textAlign: "center",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.nombre}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DasboardAdmin;