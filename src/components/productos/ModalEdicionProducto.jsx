import React, { useState } from "react";
import { Modal, Form, Button, Row, Col } from "react-bootstrap";
import { obtenerConfigCategoriaPorId } from "../../utils/variantesCategorias";

const ModalEdicionProducto = ({
  mostrarModalEdicion,
  setMostrarModalEdicion,
  productoEditar,
  manejoCambioInputEdicion,
  manejoCambioArchivoActualizar,
  actualizarProducto,
  categorias = [],
  tiendas = [],
}) => {
  const [deshabilitado, setDeshabilitado] = useState(false);

  const handleActualizar = async () => {
    if (deshabilitado) return;
    setDeshabilitado(true);
    await actualizarProducto();
    setDeshabilitado(false);
  };

  if (!productoEditar) return null;

  // Configuración dinámica según categoría
  const configCategoria = obtenerConfigCategoriaPorId(
    productoEditar.categoria_id,
    categorias
  );

  const MEDIDAS = configCategoria?.medidas || [];
  const COLORES = configCategoria?.colores || [];

  const toggleSeleccionEdicion = (campo, valor) => {
    const actual = Array.isArray(productoEditar[campo]) ? productoEditar[campo] : [];
    const nuevo = actual.includes(valor)
      ? actual.filter((v) => v !== valor)
      : [...actual, valor];

    manejoCambioInputEdicion({ target: { name: campo, value: nuevo } });
  };

  const handleMedidasChange = (e) => {
    const value = e.target.value;
    const otrasMedidas = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const actuales = Array.isArray(productoEditar.tallas) ? productoEditar.tallas : [];
    const predefinidasSeleccionadas = actuales.filter((t) => MEDIDAS.includes(t));
    const nuevas = [...new Set([...predefinidasSeleccionadas, ...otrasMedidas])];

    manejoCambioInputEdicion({ target: { name: "tallas", value: nuevas } });
  };

  const handleColoresChange = (e) => {
    const value = e.target.value;
    const otrosColores = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const actuales = Array.isArray(productoEditar.colores) ? productoEditar.colores : [];
    const predefinidosSeleccionados = actuales.filter((c) => COLORES.includes(c));
    const nuevos = [...new Set([...predefinidosSeleccionados, ...otrosColores])];

    manejoCambioInputEdicion({ target: { name: "colores", value: nuevos } });
  };

  return (
    <Modal
      show={mostrarModalEdicion}
      onHide={() => setMostrarModalEdicion(false)}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
    >
      <Modal.Header
        closeButton
        className="border-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primario) 0%, #1a7a8a 100%)",
          padding: "0.65rem 1.25rem",
        }}
      >
        <Modal.Title
          className="fw-bold text-white d-flex align-items-center gap-2"
          style={{ fontSize: "1rem" }}
        >
          <i className="bi bi-pencil-square"></i>
          Editar Producto
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre del Producto *</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre_producto"
                  value={productoEditar.nombre_producto || ""}
                  onChange={manejoCambioInputEdicion}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría *</Form.Label>
                <Form.Select
                  name="categoria_id"
                  value={productoEditar.categoria_id || ""}
                  onChange={manejoCambioInputEdicion}
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="bi bi-shop me-1"></i>
              Tienda *
            </Form.Label>
            <Form.Select
              name="id_tienda"
              value={productoEditar.id_tienda || ""}
              onChange={manejoCambioInputEdicion}
              disabled={tiendas.length === 0}
            >
              <option value="">
                {tiendas.length === 0
                  ? "No tienes tiendas registradas"
                  : "Selecciona una tienda"}
              </option>
              {tiendas.map((tienda) => (
                <option key={tienda.id_tienda} value={tienda.id_tienda}>
                  {tienda.nombre_tienda}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted small">
              Puedes mover el producto a otra de tus tiendas.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="descripcion"
              value={productoEditar.descripcion || ""}
              onChange={manejoCambioInputEdicion}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio de Compra *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio_compra"
                  value={productoEditar.precio_compra || ""}
                  onChange={manejoCambioInputEdicion}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio de Venta *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio_venta"
                  value={productoEditar.precio_venta || ""}
                  onChange={manejoCambioInputEdicion}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  name="id_estado"
                  value={productoEditar.id_estado || "2"}
                  onChange={manejoCambioInputEdicion}
                >
                  <option value="1">Entregado</option>
                  <option value="2">Proceso</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Stock Disponible</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  name="stock"
                  value={productoEditar.stock ?? ""}
                  onChange={manejoCambioInputEdicion}
                  placeholder="Ej: 50"
                />
                <Form.Text className="text-muted small">
                  Unidades disponibles actualmente.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* Variantes dinámicas */}
          {configCategoria && (
            <div className="bg-light p-3 rounded-4 mb-3 border border-secondary border-opacity-10">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <i className={`bi ${configCategoria.icono} text-primary`}></i>
                {configCategoria.labelSeccion}
              </h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-muted">
                      {configCategoria.labelMedidas}
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {MEDIDAS.map((medida) => (
                        <Button
                          key={medida}
                          variant={
                            Array.isArray(productoEditar.tallas) &&
                            productoEditar.tallas.includes(medida)
                              ? "primary"
                              : "outline-secondary"
                          }
                          size="sm"
                          className="rounded-pill px-3 py-1"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => toggleSeleccionEdicion("tallas", medida)}
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
                        Array.isArray(productoEditar.tallas)
                          ? productoEditar.tallas
                              .filter((t) => !MEDIDAS.includes(t))
                              .join(", ")
                          : ""
                      }
                      className="rounded-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-muted">
                      {configCategoria.labelColores}
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {COLORES.map((color) => (
                        <Button
                          key={color}
                          variant={
                            Array.isArray(productoEditar.colores) &&
                            productoEditar.colores.includes(color)
                              ? "primary"
                              : "outline-secondary"
                          }
                          size="sm"
                          className="rounded-pill px-3 py-1"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => toggleSeleccionEdicion("colores", color)}
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
                        Array.isArray(productoEditar.colores)
                          ? productoEditar.colores
                              .filter((c) => !COLORES.includes(c))
                              .join(", ")
                          : ""
                      }
                      className="rounded-3"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nuevas Imágenes (reemplazan actuales)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={manejoCambioArchivoActualizar}
                />
              </Form.Group>
            </Col>
          </Row>

          {productoEditar.archivos_imagen &&
            productoEditar.archivos_imagen.length > 0 && (
              <div className="mb-3">
                <Form.Label className="small text-muted">
                  Nuevas imágenes seleccionadas:
                </Form.Label>
                <div className="d-flex flex-wrap gap-2 justify-content-center p-2 border rounded bg-light">
                  {Array.from(productoEditar.archivos_imagen).map(
                    (file, idx) => (
                      <div key={idx} className="position-relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Nueva ${idx + 1}`}
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "2px solid white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                          onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {productoEditar.url_imagenes &&
            productoEditar.url_imagenes.length > 0 && (
              <div className="text-center mb-3">
                <p className="small text-muted mb-2">Imágenes actuales:</p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  {Array.isArray(productoEditar.url_imagenes) ? (
                    productoEditar.url_imagenes.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Actual ${idx + 1}`}
                        style={{
                          maxWidth: "100px",
                          maxHeight: "100px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    ))
                  ) : (
                    <img
                      src={productoEditar.url_imagenes}
                      alt="Actual"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "220px",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
              </div>
            )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setMostrarModalEdicion(false)}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleActualizar}
          disabled={deshabilitado}
        >
          {deshabilitado ? "Actualizando..." : "Actualizar Producto"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalEdicionProducto;