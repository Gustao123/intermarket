import React, { useState } from "react";
import { Modal, Form, Button, Row, Col, Badge } from "react-bootstrap";
import { obtenerConfigCategoriaPorId } from "../../utils/variantesCategorias";

const ModalRegistroProducto = ({
  mostrarModal,
  setMostrarModal,
  nuevoProducto,
  manejoCambioInput,
  manejoCambioArchivo,
  agregarProducto,
  categorias,
  tiendas = [],
}) => {
  const [deshabilitado, setDeshabilitado] = useState(false);

  const handleAgregar = async () => {
    if (deshabilitado) return;
    setDeshabilitado(true);
    await agregarProducto();
    setDeshabilitado(false);
  };

  // Configuración dinámica según categoría
  const configCategoria = obtenerConfigCategoriaPorId(
    nuevoProducto.categoria_id,
    categorias
  );

  const MEDIDAS = configCategoria?.medidas || [];
  const COLORES = configCategoria?.colores || [];

  const toggleSeleccion = (campo, valor) => {
    const actual = Array.isArray(nuevoProducto[campo]) ? nuevoProducto[campo] : [];
    const nuevo = actual.includes(valor)
      ? actual.filter((v) => v !== valor)
      : [...actual, valor];
    manejoCambioInput({ target: { name: campo, value: nuevo } });
  };

  const handleMedidasChange = (e) => {
    const value = e.target.value;
    const otrasMedidas = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const actuales = Array.isArray(nuevoProducto.tallas) ? nuevoProducto.tallas : [];
    const predefinidasSeleccionadas = actuales.filter((t) => MEDIDAS.includes(t));
    const nuevas = [...new Set([...predefinidasSeleccionadas, ...otrasMedidas])];

    manejoCambioInput({ target: { name: "tallas", value: nuevas } });
  };

  const handleColoresChange = (e) => {
    const value = e.target.value;
    const otrosColores = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const actuales = Array.isArray(nuevoProducto.colores) ? nuevoProducto.colores : [];
    const predefinidosSeleccionados = actuales.filter((c) => COLORES.includes(c));
    const nuevos = [...new Set([...predefinidosSeleccionados, ...otrosColores])];

    manejoCambioInput({ target: { name: "colores", value: nuevos } });
  };

  const labelStyle = {
    color: "#0d5c63",
    fontWeight: 600,
    fontSize: "0.95rem",
    marginBottom: "6px",
  };

  const inputStyle = {
    backgroundColor: "#e8f4f8",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "0.95rem",
    color: "#333",
    boxShadow: "none",
  };

  const inputFocusStyle = {
    backgroundColor: "#e0f0f5",
    boxShadow: "0 0 0 2px rgba(13, 92, 99, 0.15)",
  };

  return (
    <Modal
      show={mostrarModal}
      onHide={() => setMostrarModal(false)}
      backdrop="static"
      keyboard={false}
      centered
      size="md"
      contentClassName="border-0 shadow-lg"
    >
      <Modal.Header className="border-0 pb-0 pt-4 px-4" style={{ background: "transparent" }}>
        <Modal.Title className="fw-bold" style={{ color: "#0d5c63", fontSize: "1.35rem" }}>
          Registrar productos
        </Modal.Title>
        <button
          type="button"
          className="btn-close"
          onClick={() => setMostrarModal(false)}
          aria-label="Cerrar"
          style={{
            filter:
              "invert(15%) sepia(90%) saturate(5000%) hue-rotate(350deg) brightness(0.9)",
            opacity: 0.85,
          }}
        />
      </Modal.Header>

      <Modal.Body className="px-4 pt-3 pb-2">
        <Form>
          {/* Tienda */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Tienda</Form.Label>
            <Form.Select
              name="id_tienda"
              value={nuevoProducto.id_tienda || ""}
              onChange={manejoCambioInput}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            >
              <option value="">Seleccione una tienda</option>
              {tiendas.map((t) => (
                <option key={t.id_tienda} value={t.id_tienda}>
                  {t.nombre_tienda}
                </option>
              ))}
            </Form.Select>
            {tiendas.length === 0 && (
              <Form.Text className="text-danger">
                No tienes tiendas. Crea una primero en Mis Tiendas.
              </Form.Text>
            )}
          </Form.Group>

          {/* Nombre */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Nombre del producto</Form.Label>
            <Form.Control
              type="text"
              name="nombre_producto"
              value={nuevoProducto.nombre_producto}
              onChange={manejoCambioInput}
              placeholder="Ingresa el nombre del producto"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </Form.Group>

          {/* Categoría */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Categoría</Form.Label>
            <Form.Select
              name="categoria_id"
              value={nuevoProducto.categoria_id}
              onChange={manejoCambioInput}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            >
              <option value="">Seleccione una categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id_categoria} value={categoria.id_categoria}>
                  {categoria.nombre_categoria}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Descripción */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Descripcion</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="descripcion"
              value={nuevoProducto.descripcion}
              onChange={manejoCambioInput}
              placeholder="Descripcion del producto"
              style={{ ...inputStyle, resize: "none" }}
              onFocus={(e) =>
                Object.assign(e.target.style, { ...inputFocusStyle, resize: "none" })
              }
              onBlur={(e) =>
                Object.assign(e.target.style, { ...inputStyle, resize: "none" })
              }
            />
          </Form.Group>

          {/* Precios */}
          <Row className="mb-3">
            <Col xs={6}>
              <Form.Group>
                <Form.Label style={labelStyle}>Precio compra</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio_compra"
                  value={nuevoProducto.precio_compra}
                  onChange={manejoCambioInput}
                  placeholder="C$ 499"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                />
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label style={labelStyle}>Precio venta</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio_venta"
                  value={nuevoProducto.precio_venta}
                  onChange={manejoCambioInput}
                  placeholder="Ej: 550"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Stock */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Stock</Form.Label>
            <Form.Control
              type="number"
              min="0"
              name="stock"
              value={nuevoProducto.stock ?? ""}
              onChange={manejoCambioInput}
              placeholder="Ej: 50"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
            <Form.Text style={{ color: "#6c757d", fontSize: "0.8rem", marginTop: "4px" }}>
              Unidades disponibles por venta
            </Form.Text>
          </Form.Group>

          {/* Variantes dinámicas */}
          {configCategoria && (
            <div
              className="mb-3 p-3 rounded-3"
              style={{ backgroundColor: "#f8fafb", border: "1px solid #e8f0f2" }}
            >
              <h6 className="fw-bold mb-3" style={{ color: "#0d5c63", fontSize: "0.95rem" }}>
                <i className={`bi ${configCategoria.icono} me-2`}></i>
                {configCategoria.labelSeccion}
              </h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label className="small fw-semibold text-muted">
                      {configCategoria.labelMedidas}
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {MEDIDAS.map((medida) => (
                        <Button
                          key={medida}
                          variant={
                            Array.isArray(nuevoProducto.tallas) &&
                            nuevoProducto.tallas.includes(medida)
                              ? "primary"
                              : "outline-secondary"
                          }
                          size="sm"
                          className="rounded-pill px-3 py-1"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => toggleSeleccion("tallas", medida)}
                        >
                          {medida}
                        </Button>
                      ))}
                    </div>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder={configCategoria.placeholderMedidas}
                      onChange={handleMedidasChange}
                      value={
                        Array.isArray(nuevoProducto.tallas)
                          ? nuevoProducto.tallas
                              .filter((t) => !MEDIDAS.includes(t))
                              .join(", ")
                          : ""
                      }
                      style={{ ...inputStyle, padding: "8px 12px" }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label className="small fw-semibold text-muted">
                      {configCategoria.labelColores}
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {COLORES.map((color) => (
                        <Button
                          key={color}
                          variant={
                            Array.isArray(nuevoProducto.colores) &&
                            nuevoProducto.colores.includes(color)
                              ? "primary"
                              : "outline-secondary"
                          }
                          size="sm"
                          className="rounded-pill px-3 py-1"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => toggleSeleccion("colores", color)}
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder={configCategoria.placeholderColores}
                      onChange={handleColoresChange}
                      value={
                        Array.isArray(nuevoProducto.colores)
                          ? nuevoProducto.colores
                              .filter((c) => !COLORES.includes(c))
                              .join(", ")
                          : ""
                      }
                      style={{ ...inputStyle, padding: "8px 12px" }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          {/* Imágenes */}
          <Form.Group className="mb-3">
            <Form.Label style={labelStyle}>Imagenes del producto</Form.Label>
            <div
              className="position-relative"
              style={{
                border: "2px dashed #f5c6cb",
                borderRadius: "12px",
                backgroundColor: "#fdf2f2",
                minHeight: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("input-imagenes-producto")?.click()}
            >
              <input
                id="input-imagenes-producto"
                type="file"
                accept="image/*"
                multiple
                onChange={manejoCambioArchivo}
                style={{ display: "none" }}
              />

              {nuevoProducto.archivos_imagen && nuevoProducto.archivos_imagen.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 justify-content-center p-2 w-100">
                  {Array.from(nuevoProducto.archivos_imagen).map((file, idx) => (
                    <div key={idx} className="position-relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Vista previa ${idx + 1}`}
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "2px solid white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        }}
                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                      />
                      <Badge
                        bg="dark"
                        className="position-absolute top-0 end-0 m-1 opacity-75"
                        style={{ fontSize: "0.55rem" }}
                      >
                        {idx + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-image" style={{ fontSize: "1.6rem", color: "#e89a9a" }}></i>
                  <div style={{ fontSize: "0.85rem", marginTop: "4px", color: "#b07a7a" }}>
                    Toca para seleccionar imágenes
                  </div>
                </div>
              )}
            </div>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0 pb-4 px-4">
        <Button
          onClick={handleAgregar}
          disabled={deshabilitado}
          className="w-100 border-0 fw-semibold"
          style={{
            backgroundColor: "#a8e0ef",
            color: "#0d5c63",
            borderRadius: "50px",
            padding: "12px",
            fontSize: "1rem",
            boxShadow: "none",
          }}
          onMouseOver={(e) => {
            if (!deshabilitado) e.currentTarget.style.backgroundColor = "#8fd4e8";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#a8e0ef";
          }}
        >
          {deshabilitado ? "Publicando..." : "Publicar producto"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalRegistroProducto;