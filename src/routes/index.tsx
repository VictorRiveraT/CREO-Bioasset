import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
import { AppShell } from "@/components/bioasset/AppShell";
import { DueBadge, StatusBadge } from "@/components/bioasset/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatDate, useBio } from "@/lib/bioasset/store";
import { EQUIPMENT_STATUSES } from "@/lib/bioasset/types";
import { encryptUrlParam } from "@/lib/bioasset/security";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | BIOASSET — Gestión de equipos biomédicos" },
      {
        name: "description",
        content: "Indicadores de inventario, trazabilidad y mantenimiento de equipos biomédicos.",
      },
      { property: "og:title", content: "Dashboard | BIOASSET" },
      {
        property: "og:description",
        content: "Inventario, trazabilidad y mantenimiento de equipos biomédicos.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  to,
  search,
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  tone: string;
  to?: string;
  search?: Record<string, any>;
}) {
  const card = (
    <Card
      className={`shadow-[var(--shadow-card)] transition-all ${to ? "hover:border-primary/50 hover:shadow-md cursor-pointer group" : ""}`}
    >
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} search={search} className="block no-underline">
        {card}
      </Link>
    );
  }

  return card;
}

function Dashboard() {
  const { db, locationName, user } = useBio();
  const eq = db.equipment;

  const temporalSedesList = useMemo(() => {
    if (!user?.sedeTemporal || user.sedeTemporal === "Ninguna" || user.sedeTemporal === "[]") {
      return [];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      if (user.sedeTemporal.startsWith("[")) {
        const parsed = JSON.parse(user.sedeTemporal);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => {
            if (!item || !item.sede || item.sede === "Ninguna") return false;
            if (!item.hasta) return true;
            return new Date(item.hasta) >= today;
          });
        }
      }
    } catch {
      // not JSON
    }

    if (user.sedeTemporalHasta && new Date(user.sedeTemporalHasta) < today) {
      return [];
    }

    return [{ sede: user.sedeTemporal, hasta: user.sedeTemporalHasta || "" }];
  }, [user?.sedeTemporal, user?.sedeTemporalHasta]);

  const count = (s: string) => {
    if (s === "Fuera de servicio") {
      return eq.filter((e) => e.estado === "Fuera de servicio" || e.estado === "Inoperativo").length;
    }
    return eq.filter((e) => e.estado === s).length;
  };
  const proximos = eq.filter(
    (e) =>
      e.estado !== "De baja" &&
      daysUntil(e.proximoMantenimiento) >= 0 &&
      daysUntil(e.proximoMantenimiento) <= 30,
  );
  const vencidos = eq.filter(
    (e) => e.estado !== "De baja" && daysUntil(e.proximoMantenimiento) < 0,
  );

  const porEstado = EQUIPMENT_STATUSES.map((s) => ({ name: s, value: count(s) })).filter(
    (d) => d.value > 0,
  );
  const porCategoria = Object.entries(
    eq.reduce<Record<string, number>>((acc, e) => {
      acc[e.categoria] = (acc[e.categoria] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    return {
      name: d.toLocaleDateString("es-PE", { month: "short" }),
      value: (db.maintenance || []).filter((m) => {
        const mFecha = (m?.fecha || "").substring(0, 7);
        return mFecha === key;
      }).length,
    };
  });

  const chartColors = [
    "#22c55e", // Operativo (green)
    "#eab308", // En mantenimiento (amber/yellow)
    "#ef4444", // Fuera de servicio (red)
    "#64748b", // De baja (slate)
    "#3b82f6", // Default / other
  ];

  const [mantenimientoTab, setMantenimientoTab] = useState<"proximos" | "vencidos">("proximos");

  // Equipos con fecha futura o vigente (verdaderamente próximos)
  const proximosFuturos = useMemo(() => {
    return [...eq]
      .filter((e) => e.estado !== "De baja" && daysUntil(e.proximoMantenimiento) >= 0)
      .sort((a, b) => daysUntil(a.proximoMantenimiento) - daysUntil(b.proximoMantenimiento))
      .slice(0, 8);
  }, [eq]);

  // Equipos con fecha vencida que requieren atención
  const vencidosUrgentes = useMemo(() => {
    return [...eq]
      .filter((e) => e.estado !== "De baja" && daysUntil(e.proximoMantenimiento) < 0)
      .sort((a, b) => daysUntil(a.proximoMantenimiento) - daysUntil(b.proximoMantenimiento))
      .slice(0, 8);
  }, [eq]);

  const listaMantenimientos = mantenimientoTab === "proximos" ? proximosFuturos : vencidosUrgentes;

  return (
    <AppShell title="Dashboard" description="Resumen en tiempo real de equipos e indicadores">
      {user && (
        <Card className="mb-6 shadow-[var(--shadow-card)] border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">¡Hola, {user.nombre}!</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="font-semibold">Rol:</span>{" "}
                  <span className="capitalize">{user.rol}</span>
                </div>
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="font-semibold">Sede Principal:</span> {user.sede || "Todas"}
                </div>
                {temporalSedesList.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800"
                  >
                    <span className="font-semibold">Sede Temporal:</span>
                    <span>{item.sede}</span>
                    {item.hasta && (
                      <span className="text-blue-700/80 dark:text-blue-300/80 font-normal">
                        (hasta {formatDate(item.hasta)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Total de equipos"
          value={eq.length}
          icon={Boxes}
          tone="bg-primary/10 text-primary"
          to="/equipos"
        />
        <Kpi
          label="Equipos operativos"
          value={count("Operativo")}
          icon={CheckCircle2}
          tone="bg-success/15 text-success"
          to="/equipos"
          search={{ estado: "Operativo" }}
        />
        <Kpi
          label="En mantenimiento"
          value={count("En mantenimiento")}
          icon={Wrench}
          tone="bg-warning/20 text-warning-foreground"
          to="/equipos"
          search={{ estado: "En mantenimiento" }}
        />
        <Kpi
          label="Fuera de servicio"
          value={count("Fuera de servicio")}
          icon={XCircle}
          tone="bg-destructive/15 text-destructive"
          to="/equipos"
          search={{ estado: "Fuera de servicio" }}
        />
        <Kpi
          label="Mantenimientos próximos (30 d)"
          value={proximos.length}
          icon={Clock}
          tone="bg-info/15 text-info"
          to="/equipos"
          search={{ mantenimiento: "proximo" }}
        />
        <Kpi
          label="Mantenimientos vencidos"
          value={vencidos.length}
          icon={AlertTriangle}
          tone="bg-destructive/15 text-destructive"
          to="/equipos"
          search={{ mantenimiento: "vencido" }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card className="shadow-[var(--shadow-card)] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Equipos por estado</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porEstado}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                >
                  {porEstado.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [val, "Cantidad"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t">
            {porEstado.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: chartColors[i % chartColors.length] }}
                />
                <span className="text-muted-foreground">{item.name}:</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Equipos por categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCategoria}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [val, "Cantidad"]} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Mantenimientos por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [val, "Cantidad"]} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Overdue Maintenance Table */}
      <Card className="shadow-[var(--shadow-card)] mt-4">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
          <CardTitle className="text-base">
            {mantenimientoTab === "proximos"
              ? "Próximos mantenimientos programados"
              : "Mantenimientos vencidos (requieren atención)"}
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMantenimientoTab("proximos")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                mantenimientoTab === "proximos"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Próximos ({proximosFuturos.length})
            </button>
            <button
              type="button"
              onClick={() => setMantenimientoTab("vencidos")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                mantenimientoTab === "vencidos"
                  ? "bg-card text-destructive shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vencidos ({vencidosUrgentes.length})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Próximo mantenimiento</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaMantenimientos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    {e && e.id ? (
                      <Link
                        to="/equipos/$id"
                        params={{ id: encryptUrlParam(e.id) }}
                        className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {e.codigo}
                      </Link>
                    ) : (
                      <span className="font-semibold text-muted-foreground">{e?.codigo || "N/A"}</span>
                    )}
                  </TableCell>
                  <TableCell>{e.nombre}</TableCell>
                  <TableCell>{locationName(e.ubicacionId)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 items-start">
                      <StatusBadge status={e.estado} />
                      {e.estado === "Operativo" && daysUntil(e.proximoMantenimiento) < 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Requiere calibración
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(e.proximoMantenimiento)}</TableCell>
                  <TableCell>
                    <DueBadge days={daysUntil(e.proximoMantenimiento)} status={e.estado} />
                  </TableCell>
                </TableRow>
              ))}
              {listaMantenimientos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                    {mantenimientoTab === "proximos"
                      ? "Sin mantenimientos futuros programados."
                      : "Sin mantenimientos vencidos pendientes."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
