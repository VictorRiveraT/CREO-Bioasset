import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | BIOASSET — Gestión de equipos biomédicos" },
      {
        name: "description",
        content:
          "Indicadores de inventario, trazabilidad y mantenimiento de equipos biomédicos.",
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
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  tone: string;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`flex size-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { db, locationName, user } = useBio();
  const eq = db.equipment;

  const count = (s: string) => eq.filter((e) => e.estado === s).length;
  const proximos = eq.filter(
    (e) => e.estado !== "De baja" && daysUntil(e.proximoMantenimiento) >= 0 && daysUntil(e.proximoMantenimiento) <= 30,
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
    const key = d.toISOString().slice(0, 7);
    return {
      name: d.toLocaleDateString("es-PE", { month: "short" }),
      value: (db.maintenance || []).filter((m) => (m?.fecha || "").slice(0, 7) === key).length,
    };
  });

  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const proximosOrdenados = [...eq]
    .filter((e) => e.estado !== "De baja")
    .sort((a, b) => daysUntil(a.proximoMantenimiento) - daysUntil(b.proximoMantenimiento))
    .slice(0, 8);

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
                  <span className="font-semibold">Rol:</span> <span className="capitalize">{user.rol}</span>
                </div>
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="font-semibold">Sede Principal:</span> {user.sede || "Todas"}
                </div>
                {user.sedeTemporal && user.sedeTemporal !== "Ninguna" && (
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    <span className="font-semibold">Sede Temporal:</span> {user.sedeTemporal} 
                    {user.sedeTemporalHasta ? ` (hasta ${user.sedeTemporalHasta.substring(0, 10)})` : ""}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Total de equipos" value={eq.length} icon={Boxes} tone="bg-primary/10 text-primary" />
        <Kpi label="Equipos operativos" value={count("Operativo")} icon={CheckCircle2} tone="bg-success/15 text-success" />
        <Kpi label="En mantenimiento" value={count("En mantenimiento")} icon={Wrench} tone="bg-warning/20 text-warning-foreground" />
        <Kpi label="Fuera de servicio" value={count("Fuera de servicio")} icon={XCircle} tone="bg-destructive/15 text-destructive" />
        <Kpi label="Mantenimientos próximos (30 d)" value={proximos.length} icon={Clock} tone="bg-info/15 text-info" />
        <Kpi label="Mantenimientos vencidos" value={vencidos.length} icon={AlertTriangle} tone="bg-destructive/15 text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Equipos por estado</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porEstado} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {porEstado.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [val, "Cantidad"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Equipos por categoría</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Mantenimientos por mes</CardTitle></CardHeader>
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

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Próximos mantenimientos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
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
              {proximosOrdenados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link to="/equipos/$id" params={{ id: e.id }} className="font-medium text-yellow-500 hover:underline">
                      {e.codigo}
                    </Link>
                  </TableCell>
                  <TableCell>{e.nombre}</TableCell>
                  <TableCell>{locationName(e.ubicacionId)}</TableCell>
                  <TableCell><StatusBadge status={e.estado} /></TableCell>
                  <TableCell>{formatDate(e.proximoMantenimiento)}</TableCell>
                  <TableCell><DueBadge days={daysUntil(e.proximoMantenimiento)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
