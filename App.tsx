import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface Producto {
  id: number;
  nombre: string;
  talla?: string;
  costo: number;
  precio_venta: number;
  stock_actual: number;
}


interface ItemCarrito extends Producto {
  cantidadCarrito: number;
}

interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
  saldo_pendiente: number;
}

interface Venta {
  id: number;
  created_at: string;
  total: number;
  tipo: string;
  detalles: any[];
}

export default function App() {
  const [pestana, setPestana] = useState<
    'pos' | 'inventario' | 'clientes' | 'caja'
  >('pos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);

  // Tasa BCV
  const [tasaBcv, setTasaBcv] = useState<number>(0);
  const [cargandoTasa, setCargandoTasa] = useState<boolean>(false);

  // Buscadores y Filtros
  const [busquedaPos, setBusquedaPos] = useState('');
  const [busquedaStock, setBusquedaStock] = useState('');
  const [filtroTallaStock, setFiltroTallaStock] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // POS Venta
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'credito'>('contado');
  const [metodoPago, setMetodoPago] = useState<
    'pago_movil' | 'efectivo_usd' | 'efectivo_bs' | 'punto'
  >('pago_movil');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');

  // Inventario Nuevo Producto
  const [nombre, setNombre] = useState('');
  const [talla, setTalla] = useState('');
  const [costo, setCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('');

  // Abonos
  const [clienteAbono, setClienteAbono] = useState<Cliente | null>(null);
  const [montoAbono, setMontoAbono] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    obtenerProductos();
    obtenerClientes();
    obtenerVentas();
    obtenerTasaBCV();
  }, []);

  const obtenerTasaBCV = async () => {
    setCargandoTasa(true);
    try {
      const res = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
      const data = await res.json();
      if (data && data.monitors && data.monitors.usd) {
        setTasaBcv(data.monitors.usd.price);
      } else {
        // Tasa por defecto si falla el llamado
        setTasaBcv(842.21);
      }
    } catch (e) {
      console.log('Error obteniendo tasa BCV:', e);
      if (tasaBcv === 0) setTasaBcv(842.21);
    } finally {
      setCargandoTasa(false);
    }
  };

  const obtenerProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      if (data) setProductos(data);
    } catch (err: any) {
      console.error('Error cargando productos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const obtenerClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      if (data) setClientes(data);
    } catch (err: any) {
      console.error('Error cargando clientes:', err.message);
    }
  };

  const obtenerVentas = async () => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setVentas(data);
    } catch (err: any) {
      console.error('Error cargando ventas:', err.message);
    }
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precioVenta) {
      alert('Ingresa el nombre y precio de venta');
      return;
    }

    try {
      setLoading(true);
      const nuevoProducto = {
        nombre,
        talla: talla.trim() || 'Única',
        costo: parseFloat(costo) || 0,
        precio_venta: parseFloat(precioVenta),
        stock_actual: parseInt(stock) || 0,
      };

      const { error } = await supabase
        .from('productos')
        .insert([nuevoProducto]);
      if (error) throw error;

      alert('¡Producto guardado!');
      setNombre('');
      setTalla('');
      setCosto('');
      setPrecioVenta('');
      setStock('');
      obtenerProductos();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    if (producto.stock_actual <= 0) {
      alert('Sin stock disponible.');
      return;
    }

    const existe = carrito.find((item) => item.id === producto.id);
    if (existe) {
      if (existe.cantidadCarrito >= producto.stock_actual) {
        alert('Límite de stock alcanzado.');
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidadCarrito: item.cantidadCarrito + 1 }
            : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidadCarrito: 1 }]);
    }
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito(
      carrito
        .map((item) => {
          if (item.id === id) {
            const nuevaCant = item.cantidadCarrito + delta;
            if (nuevaCant > item.stock_actual) {
              alert('Sin más stock disponible.');
              return item;
            }
            return nuevaCant > 0
              ? { ...item, cantidadCarrito: nuevaCant }
              : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[]
    );
  };

  const totalVentaUsd = carrito.reduce(
    (sum, item) => sum + item.precio_venta * item.cantidadCarrito,
    0
  );
  const totalVentaBs = totalVentaUsd * (tasaBcv || 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return;

    let targetClienteId: number | null = null;
    let clienteNombre = 'Contado';

    if (tipoVenta === 'credito') {
      if (clienteSeleccionado === 'nuevo') {
        if (!nuevoClienteNombre) {
          alert('Por favor ingresa el nombre del cliente.');
          return;
        }
        const { data: newCli, error: errCli } = await supabase
          .from('clientes')
          .insert([
            {
              nombre: nuevoClienteNombre,
              telefono: nuevoClienteTelefono,
              saldo_pendiente: totalVentaUsd,
            },
          ])
          .select()
          .single();

        if (errCli) {
          alert('Error registrando cliente: ' + errCli.message);
          return;
        }
        targetClienteId = newCli.id;
        clienteNombre = newCli.nombre;
      } else if (clienteSeleccionado) {
        targetClienteId = parseInt(clienteSeleccionado);
        const cliActual = clientes.find((c) => c.id === targetClienteId);
        clienteNombre = cliActual?.nombre || 'Cliente';
        const nuevoSaldo = (cliActual?.saldo_pendiente || 0) + totalVentaUsd;

        await supabase
          .from('clientes')
          .update({ saldo_pendiente: nuevoSaldo })
          .eq('id', targetClienteId);
      } else {
        alert('Selecciona o registra un cliente para la venta a crédito.');
        return;
      }
    }

    try {
      setLoading(true);

      for (const item of carrito) {
        const nuevoStock = item.stock_actual - item.cantidadCarrito;
        await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock })
          .eq('id', item.id);
      }

      await supabase.from('ventas').insert([
        {
          total: totalVentaUsd,
          metodo_pago: tipoVenta === 'credito' ? 'credito' : metodoPago,
          cliente_nombre: clienteNombre,
          detalles: carrito.map((i) => ({
            nombre: i.nombre,
            talla: i.talla,
            cantidad: i.cantidadCarrito,
            precio: i.precio_venta,
          })),
        },
      ]);

      alert(
        tipoVenta === 'credito'
          ? '📌 Venta a Crédito registrada'
          : '💵 Venta registrada con éxito'
      );
      setCarrito([]);
      setClienteSeleccionado('');
      setNuevoClienteNombre('');
      setNuevoClienteTelefono('');
      setTipoVenta('contado');
      obtenerProductos();
      obtenerClientes();
      obtenerVentas();
    } catch (err: any) {
      alert('Error procesando venta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteAbono || !montoAbono) return;

    const monto = parseFloat(montoAbono);
    if (monto <= 0) return;

    try {
      setLoading(true);
      await supabase
        .from('abonos')
        .insert([
          {
            cliente_id: clienteAbono.id,
            monto: monto,
            nota: 'Abono realizado',
          },
        ]);
      const nuevoSaldo = Math.max(0, clienteAbono.saldo_pendiente - monto);
      await supabase
        .from('clientes')
        .update({ saldo_pendiente: nuevoSaldo })
        .eq('id', clienteAbono.id);

      alert('✅ Abono registrado correctamente');
      setClienteAbono(null);
      setMontoAbono('');
      obtenerClientes();
    } catch (err: any) {
      alert('Error registrando abono: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtros
  const productosPosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busquedaPos.toLowerCase()) ||
      p.talla?.toLowerCase().includes(busquedaPos.toLowerCase())
  );

  const productosStockFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre
      .toLowerCase()
      .includes(busquedaStock.toLowerCase());
    const coincideTalla =
      filtroTallaStock === '' ||
      p.talla?.toLowerCase() === filtroTallaStock.toLowerCase();
    return coincideNombre && coincideTalla;
  });

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.telefono?.includes(busquedaCliente)
  );

  const tallasDisponibles = Array.from(
    new Set(productos.map((p) => p.talla).filter(Boolean))
  );

  // Cálculos Caja
  const totalContado = ventas
    .filter((v) => v.tipo === 'contado' || v.metodo_pago !== 'credito')
    .reduce((s, v) => s + v.total, 0);
  const totalCredito = ventas
    .filter((v) => v.tipo === 'credito' || v.metodo_pago === 'credito')
    .reduce((s, v) => s + v.total, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-3 font-sans max-w-md mx-auto pb-10">
      <header className="bg-purple-600 text-white p-3 rounded-xl shadow-md mb-2 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">vemos</h1>
          <p className="text-[10px] text-purple-200">Acuarela Kids - POS</p>
        </div>
        <button
          onClick={() => {
            obtenerProductos();
            obtenerClientes();
            obtenerVentas();
            obtenerTasaBCV();
          }}
          className="text-xs bg-purple-700 hover:bg-purple-800 px-2.5 py-1 rounded-lg border border-purple-400 flex items-center gap-1"
        >
          🔄 Actualizar
        </button>
      </header>

      {/* BARRA TASA BCV */}
      <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-sm mb-3 flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5">
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
            BCV Hoy
          </span>
          <span className="font-extrabold text-slate-800">
            1 USD = Bs. {tasaBcv.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            value={tasaBcv || ''}
            onChange={(e) => setTasaBcv(parseFloat(e.target.value) || 0)}
            className="w-16 p-1 border rounded text-right text-xs font-bold"
            title="Editar Tasa Manualmente"
          />
          <span className="text-[10px] text-slate-400">Manual</span>
        </div>
      </div>

      {/* Navegación (4 pestañas) */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        <button
          onClick={() => setPestana('pos')}
          className={`py-2 text-[11px] font-bold rounded-lg border ${
            pestana === 'pos'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-slate-600'
          }`}
        >
          🛒 Vender
        </button>
        <button
          onClick={() => setPestana('inventario')}
          className={`py-2 text-[11px] font-bold rounded-lg border ${
            pestana === 'inventario'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-slate-600'
          }`}
        >
          📦 Stock
        </button>
        <button
          onClick={() => setPestana('clientes')}
          className={`py-2 text-[11px] font-bold rounded-lg border ${
            pestana === 'clientes'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-slate-600'
          }`}
        >
          👥 Fiados
        </button>
        <button
          onClick={() => setPestana('caja')}
          className={`py-2 text-[11px] font-bold rounded-lg border ${
            pestana === 'caja'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-slate-600'
          }`}
        >
          📊 Caja
        </button>
      </div>

      {/* SECCIÓN POS */}
      {pestana === 'pos' && (
        <div className="space-y-3">
          <section className="bg-white p-3.5 rounded-xl shadow-sm border border-purple-200">
            <h2 className="text-xs font-bold text-slate-700 mb-2 flex justify-between items-center">
              <span>🛍️ Carrito</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                {carrito.reduce((s, i) => s + i.cantidadCarrito, 0)} prendas
              </span>
            </h2>

            {carrito.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Toca una prenda abajo para agregarla.
              </p>
            ) : (
              <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                {carrito.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.nombre}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Talla: {item.talla} | ${item.precio_venta.toFixed(2)}{' '}
                        (Bs. {(item.precio_venta * tasaBcv).toFixed(2)})
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => cambiarCantidad(item.id, -1)}
                        className="w-5 h-5 bg-slate-200 text-slate-700 rounded text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold px-1">
                        {item.cantidadCarrito}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.id, 1)}
                        className="w-5 h-5 bg-purple-100 text-purple-700 rounded text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {carrito.length > 0 && (
              <div className="border-t pt-2.5 mt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipoVenta('contado')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                      tipoVenta === 'contado'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                        : 'bg-slate-50'
                    }`}
                  >
                    💵 Contado
                  </button>
                  <button
                    onClick={() => setTipoVenta('credito')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                      tipoVenta === 'credito'
                        ? 'bg-amber-100 text-amber-800 border-amber-400'
                        : 'bg-slate-50'
                    }`}
                  >
                    📌 Fiado / Crédito
                  </button>
                </div>

                {tipoVenta === 'contado' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setMetodoPago('pago_movil')}
                      className={`p-1.5 text-[10px] font-bold rounded border ${
                        metodoPago === 'pago_movil'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-50'
                      }`}
                    >
                      📲 Pago Móvil
                    </button>
                    <button
                      onClick={() => setMetodoPago('efectivo_usd')}
                      className={`p-1.5 text-[10px] font-bold rounded border ${
                        metodoPago === 'efectivo_usd'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-50'
                      }`}
                    >
                      💵 Efectivo $
                    </button>
                    <button
                      onClick={() => setMetodoPago('efectivo_bs')}
                      className={`p-1.5 text-[10px] font-bold rounded border ${
                        metodoPago === 'efectivo_bs'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-50'
                      }`}
                    >
                      💸 Efectivo Bs.
                    </button>
                    <button
                      onClick={() => setMetodoPago('punto')}
                      className={`p-1.5 text-[10px] font-bold rounded border ${
                        metodoPago === 'punto'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-50'
                      }`}
                    >
                      💳 Punto de Venta
                    </button>
                  </div>
                )}

                {tipoVenta === 'credito' && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 space-y-2">
                    <label className="block text-[11px] font-bold text-amber-900">
                      Cliente:
                    </label>
                    <select
                      value={clienteSeleccionado}
                      onChange={(e) => setClienteSeleccionado(e.target.value)}
                      className="w-full p-2 text-xs border rounded bg-white"
                    >
                      <option value="">-- Selecciona un cliente --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} (Deuda: ${c.saldo_pendiente.toFixed(2)})
                        </option>
                      ))}
                      <option value="nuevo">➕ Registrar Nuevo Cliente</option>
                    </select>

                    {clienteSeleccionado === 'nuevo' && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          placeholder="Nombre del cliente *"
                          value={nuevoClienteNombre}
                          onChange={(e) =>
                            setNuevoClienteNombre(e.target.value)
                          }
                          className="w-full p-2 text-xs border rounded bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Teléfono (opcional)"
                          value={nuevoClienteTelefono}
                          onChange={(e) =>
                            setNuevoClienteTelefono(e.target.value)
                          }
                          className="w-full p-2 text-xs border rounded bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MOSTRAR AMBAS MONEDAS EN EL TOTAL */}
            <div className="border-t pt-2 mt-2 bg-slate-50 p-2 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-600">
                  Total en Dólares ($):
                </span>
                <span className="text-lg font-extrabold text-emerald-600">
                  ${totalVentaUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                <span className="text-xs font-bold text-slate-600">
                  Total en Bolívares (Bs.):
                </span>
                <span className="text-sm font-extrabold text-purple-700">
                  Bs. {totalVentaBs.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={procesarVenta}
              disabled={carrito.length === 0 || loading}
              className={`w-full mt-2.5 py-2.5 rounded-lg font-bold text-xs transition ${
                carrito.length === 0 || loading
                  ? 'bg-slate-200 text-slate-400'
                  : tipoVenta === 'credito'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {loading
                ? 'Procesando...'
                : tipoVenta === 'credito'
                ? '📌 Registrar Crédito'
                : `💵 Cobrar $${totalVentaUsd.toFixed(
                    2
                  )} / Bs. ${totalVentaBs.toFixed(2)}`}
            </button>
          </section>

          <input
            type="text"
            placeholder="🔍 Buscar prenda o talla..."
            value={busquedaPos}
            onChange={(e) => setBusquedaPos(e.target.value)}
            className="w-full p-2 text-xs border rounded-lg bg-white"
          />

          <div className="grid grid-cols-2 gap-2">
            {productosPosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                disabled={p.stock_actual <= 0}
                className={`p-2.5 text-left rounded-xl border transition ${
                  p.stock_actual <= 0
                    ? 'bg-slate-100 opacity-60'
                    : 'bg-white hover:border-purple-400 shadow-sm'
                }`}
              >
                <p className="text-xs font-bold text-slate-800 truncate">
                  {p.nombre}
                </p>
                <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-semibold inline-block my-1">
                  Talla: {p.talla || 'Única'}
                </span>
                <div className="mt-1">
                  <div className="text-xs font-extrabold text-emerald-600">
                    ${p.precio_venta.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-purple-700">
                    Bs. {(p.precio_venta * (tasaBcv || 0)).toFixed(2)}
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                    <span
                      className={`text-[9px] ${
                        p.stock_actual > 0
                          ? 'text-slate-500'
                          : 'text-red-500 font-bold'
                      }`}
                    >
                      {p.stock_actual > 0
                        ? `Stock: ${p.stock_actual}`
                        : 'Agotado'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN INVENTARIO / STOCK */}
      {pestana === 'inventario' && (
        <div className="space-y-3">
          <section className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-semibold text-purple-700 mb-2">
              ➕ Nuevo Producto
            </h2>
            <form onSubmit={guardarProducto} className="space-y-2">
              <input
                type="text"
                placeholder="Prenda (ej. Conjunto Short) *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Talla (ej. 2T, 4, 6)"
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Stock inicial"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Costo ($)"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Venta ($) *"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white font-medium py-2 text-xs rounded-lg"
              >
                {loading ? 'Guardando...' : '💾 Guardar Producto'}
              </button>
            </form>
          </section>

          {/* BUSCADOR Y FILTROS DE INVENTARIO */}
          <section className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-700 mb-2 flex justify-between items-center">
              <span>📦 Inventario Total</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                {productosStockFiltrados.length} / {productos.length}
              </span>
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="🔍 Buscar..."
                value={busquedaStock}
                onChange={(e) => setBusquedaStock(e.target.value)}
                className="col-span-2 p-1.5 text-xs border rounded-lg bg-slate-50"
              />
              <select
                value={filtroTallaStock}
                onChange={(e) => setFiltroTallaStock(e.target.value)}
                className="p-1.5 text-xs border rounded-lg bg-slate-50"
              >
                <option value="">Tallas</option>
                {tallasDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {productosStockFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No se encontraron productos.
                </p>
              ) : (
                productosStockFiltrados.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 border rounded-lg bg-slate-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {p.nombre}{' '}
                        {p.talla && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-semibold ml-1">
                            Talla: {p.talla}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Costo: ${p.costo?.toFixed(2)} | Stock:{' '}
                        <span
                          className={
                            p.stock_actual > 0
                              ? 'font-bold'
                              : 'text-red-500 font-bold'
                          }
                        >
                          {p.stock_actual}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-emerald-600">
                        ${p.precio_venta?.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold text-purple-700">
                        Bs. {(p.precio_venta * tasaBcv).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* SECCIÓN CLIENTES / FIADOS */}
      {pestana === 'clientes' && (
        <div className="space-y-3">
          <section className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-800 mb-2 flex justify-between items-center">
              <span>👥 Cuentas por Cobrar</span>
              <div className="text-right">
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold block">
                  $
                  {clientes
                    .reduce((s, c) => s + c.saldo_pendiente, 0)
                    .toFixed(2)}
                </span>
                <span className="text-[10px] text-purple-700 font-bold block">
                  Bs.{' '}
                  {(
                    clientes.reduce((s, c) => s + c.saldo_pendiente, 0) *
                    tasaBcv
                  ).toFixed(2)}
                </span>
              </div>
            </h2>

            <input
              type="text"
              placeholder="🔍 Buscar cliente..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              className="w-full p-2 text-xs border rounded-lg bg-slate-50 mb-2"
            />

            <div className="space-y-1.5">
              {clientesFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No se encontraron clientes.
                </p>
              ) : (
                clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-slate-50 rounded-lg border flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {c.nombre}
                      </p>
                      {c.telefono && (
                        <p className="text-[10px] text-slate-400">
                          📱 {c.telefono}
                        </p>
                      )}
                      <p className="text-xs font-extrabold text-red-600">
                        ${c.saldo_pendiente.toFixed(2)}{' '}
                        <span className="text-[10px] text-purple-700 font-normal">
                          (Bs. {(c.saldo_pendiente * tasaBcv).toFixed(2)})
                        </span>
                      </p>
                    </div>
                    {c.saldo_pendiente > 0 ? (
                      <button
                        onClick={() => setClienteAbono(c)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg"
                      >
                        💵 Abonar
                      </button>
                    ) : (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                        Al día
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {clienteAbono && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl shadow-md space-y-2">
              <h3 className="text-xs font-bold text-emerald-900 flex justify-between">
                <span>Abonar a: {clienteAbono.nombre}</span>
                <button
                  onClick={() => setClienteAbono(null)}
                  className="text-slate-400"
                >
                  ✖
                </button>
              </h3>
              <p className="text-[10px] text-emerald-800 font-semibold">
                Deuda actual: ${clienteAbono.saldo_pendiente.toFixed(2)} / Bs.{' '}
                {(clienteAbono.saldo_pendiente * tasaBcv).toFixed(2)}
              </p>
              <form onSubmit={registrarAbono} className="space-y-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto en $ USD"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full p-2 text-xs border rounded bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white font-bold py-1.5 text-xs rounded-lg"
                >
                  Registrar Abono
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN CAJA / HISTORIAL */}
      {pestana === 'caja' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
              <p className="text-[9px] text-emerald-700 font-bold uppercase">
                Contado / Cobrado
              </p>
              <p className="text-base font-extrabold text-emerald-600">
                ${totalContado.toFixed(2)}
              </p>
              <p className="text-[10px] font-bold text-purple-700">
                Bs. {(totalContado * tasaBcv).toFixed(2)}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
              <p className="text-[9px] text-amber-700 font-bold uppercase">
                Total Fiado
              </p>
              <p className="text-base font-extrabold text-amber-600">
                ${totalCredito.toFixed(2)}
              </p>
              <p className="text-[10px] font-bold text-purple-700">
                Bs. {(totalCredito * tasaBcv).toFixed(2)}
              </p>
            </div>
          </div>

          <section className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-800 mb-2">
              📋 Historial de Ventas
            </h2>
            {ventas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Aún no hay ventas registradas.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {ventas.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        ${v.total.toFixed(2)} -{' '}
                        <span className="text-purple-700 font-normal">
                          Bs. {(v.total * tasaBcv).toFixed(2)}
                        </span>
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(v.created_at).toLocaleDateString()}{' '}
                        {new Date(v.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        v.tipo === 'credito' || v.metodo_pago === 'credito'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {v.metodo_pago
                        ? v.metodo_pago.replace('_', ' ').toUpperCase()
                        : 'CONTADO'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
