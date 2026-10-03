using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.Infrastructure;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;

using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text.Json;
using System.Threading.Channels;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddDbContext<AlertasDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHostedService<RabbitMqListener>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"])),
            ValidateIssuer = false, ValidateAudience = false
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseCors(b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/alertas", [Authorize] async (AlertasDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var sedeTemporal = ctx.User.FindFirst("sedeTemporal")?.Value;
    var sedes = new List<string>();
    if(sede != null) sedes.Add(sede);
    if(!string.IsNullOrEmpty(sedeTemporal) && sedeTemporal != "[]" && sedeTemporal != "Ninguna") {
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<string>>(sedeTemporal); if(temp != null) sedes.AddRange(temp); } catch {}
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(sedeTemporal); 
              foreach(var t in temp) { if(t.TryGetProperty("sede", out var s)) sedes.Add(s.GetString()); } } catch {}
    }

    var q = db.Alertas.AsQueryable();
    if (rol != "admin" && sede != "Todas") {
        var allowedUbicaciones = await db.Ubicaciones.Where(u => sedes.Contains(u.Sede)).Select(u => u.Id).ToListAsync();
        var allowedActivos = await db.Activos.Where(a => allowedUbicaciones.Contains(a.UbicacionId)).Select(a => a.Id).ToListAsync();
        q = q.Where(a => allowedActivos.Contains(a.ActivoId));
    }

    var items = await q.ToListAsync();
    return Results.Ok(new { alertas = items });
});
app.MapPut("/alertas/{id}", [Authorize] async (Guid id, Alerta dto, AlertasDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var alerta = await db.Alertas.FindAsync(id);
    if(alerta != null && rol != "admin" && sede != "Todas") {
        var a = await db.Activos.FindAsync(alerta.ActivoId);
        if(a != null) {
            var u = await db.Ubicaciones.FindAsync(a.UbicacionId);
            if(u == null || u.Sede != sede) return Results.Forbid();
        }
    }
    if (alerta == null) return Results.NotFound();
    alerta.Estado = dto.Estado;
    await db.SaveChangesAsync();
    return Results.Ok(alerta);
});

app.MapPost("/trigger-daily", async (AlertasDb db, HttpContext ctx) => {
    string? userIdStr = ctx.Request.Query["userId"].FirstOrDefault();
    
    if (string.IsNullOrEmpty(userIdStr) && ctx.User?.Identity?.IsAuthenticated == true) {
        userIdStr = ctx.User.Claims.FirstOrDefault(c => c.Type == "id" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type.EndsWith("/id"))?.Value;
    }
    
    if (string.IsNullOrEmpty(userIdStr)) {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT TOP 1 Id FROM auth.Usuarios";
        var result = await cmd.ExecuteScalarAsync();
        if (result != null) userIdStr = result.ToString();
    }
    
    if (!string.IsNullOrEmpty(userIdStr)) {
        await DailyReportTrigger.Trigger(db, userIdStr);
        return Results.Ok(new { message = "Reporte diario enviado exitosamente.", userId = userIdStr });
    }
    
    return Results.BadRequest(new { error = "No se pudo determinar el usuario para enviar el reporte." });
});

using (var scope = app.Services.CreateScope()) { 
    var dbContext = scope.ServiceProvider.GetRequiredService<AlertasDb>();
    try {
        var creator = (DatabaseFacade)dbContext.Database;
        var relationalCreator = creator.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        relationalCreator.EnsureCreated();
        relationalCreator.CreateTables();
    } catch {}
}
app.Run();

public class AlertasDb : DbContext {
    public AlertasDb(DbContextOptions<AlertasDb> options) : base(options) { }
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<InvUbicacion> Ubicaciones => Set<InvUbicacion>();
    public DbSet<InvActivo> Activos => Set<InvActivo>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) { 
        modelBuilder.HasDefaultSchema("alertas"); 
        modelBuilder.Entity<InvUbicacion>().ToTable("Ubicaciones", "inventario");
        modelBuilder.Entity<InvActivo>().ToTable("Activos", "inventario");
    }
}
public class InvUbicacion { [System.ComponentModel.DataAnnotations.Key] public Guid Id { get; set; } public string Sede { get; set; } = ""; }
public class InvActivo { [System.ComponentModel.DataAnnotations.Key] public Guid Id { get; set; } public Guid UbicacionId { get; set; } }

public class Alerta {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    public string Tipo { get; set; } = "";
    public string Mensaje { get; set; } = "";
    public string Severidad { get; set; } = "";
    public string Estado { get; set; } = "";
}

public class RabbitMqListener : BackgroundService {
    private readonly IServiceProvider _sp;
    private IConnection _connection;
    private IModel _channel;
    public RabbitMqListener(IServiceProvider sp) { _sp = sp; }
    
    protected override Task ExecuteAsync(CancellationToken stoppingToken) {
        try {
            var factory = new ConnectionFactory() { HostName = "rabbitmq" };
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
            
            var queues = new[] { "activos_q", "mantenimientos_q", "incidencias_q" };
            foreach(var q in queues) {
                _channel.QueueDeclare(queue: q, durable: false, exclusive: false, autoDelete: false, arguments: null);
                var consumer = new EventingBasicConsumer(_channel);
                consumer.Received += (model, ea) => {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    ProcessMessage(q, message);
                };
                _channel.BasicConsume(queue: q, autoAck: true, consumer: consumer);
            }
        } catch (Exception e) {
            Console.WriteLine($"RabbitMQ Listener Error: {e.Message}");
        }
        return Task.CompletedTask;
    }
    
    private void ProcessMessage(string queue, string message) {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AlertasDb>();
        try {
            var doc = JsonDocument.Parse(message);
            var action = doc.RootElement.GetProperty("Action").GetString();
            var data = doc.RootElement.GetProperty("Data");
            
            if (queue == "activos_q" && action == "Updated") {
                var estado = data.GetProperty("Estado").GetString();
                if (estado == "De baja") {
                    var id = data.GetProperty("Id").GetGuid();
                    db.Alertas.Add(new Alerta {
                        ActivoId = id,
                        Tipo = "Equipo de baja",
                        Mensaje = "Un equipo ha sido dado de baja.",
                        Severidad = "Alta",
                        Estado = "No Leída"
                    });
                    db.SaveChanges();
                }
            }
            if (queue == "incidencias_q" && action == "Created") {
                var id = data.GetProperty("ActivoId").GetGuid();
                var titulo = data.GetProperty("Titulo").GetString();
                db.Alertas.Add(new Alerta {
                    ActivoId = id,
                    Tipo = "Incidencia Reportada",
                    Mensaje = $"Incidencia: {titulo}",
                    Severidad = "Media",
                    Estado = "No Leída"
                });
                db.SaveChanges();
            }
            if (queue == "mantenimientos_q" && action == "Created") {
                var tipo = data.GetProperty("Tipo").GetString();
                
                string html = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd;'>
                    <div style='background-color: #22c55e; padding: 20px; text-align: center;'>
                        <h1 style='color: #fff; margin: 0;'>BioAsset Services</h1>
                    </div>
                    <div style='padding: 30px; background-color: #fcfcfc;'>
                        <p style='color: #666; font-size: 12px; font-weight: bold;'>ACTUALIZACIÓN DE TICKET</p>
                        <h2 style='color: #333;'>Hola Victor Rivera</h2>
                        <p style='color: #555;'>Tu servicio cambió de estado. Un nuevo mantenimiento ha sido registrado en el portal.</p>
                        
                        <div style='background-color: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-top: 20px;'>
                            <p style='color: #888; font-size: 12px; margin: 0;'>Tipo de Mantenimiento</p>
                            <h3 style='margin-top: 5px; color: #333;'>{tipo}</h3>
                            
                            <p style='color: #888; font-size: 12px; margin: 0; margin-top: 15px;'>Estado actual</p>
                            <span style='display: inline-block; background-color: #eab308; color: #fff; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-top: 5px;'>En progreso</span>
                        </div>
                    </div>
                </div>";
                
                _ = EmailSender.SendEmail("victor.rivera@upch.pe", "Actualización de Ticket de Mantenimiento - BioAsset", html);
            }
        } catch (Exception e) {
            Console.WriteLine($"Error processing message: {e.Message}");
        }
    }
}

public class DailyReportTrigger {
    private static string EncryptUrlParam(string text) {
        if (string.IsNullOrEmpty(text)) return "";
        string secretKey = "BioAsset_Secret_Url_Key_2026_Secure!";
        string rawData = $"{text}::{secretKey}";
        string urlEncoded = Uri.EscapeDataString(rawData)
            .Replace("%21", "!")
            .Replace("%27", "'")
            .Replace("%28", "(")
            .Replace("%29", ")")
            .Replace("%2A", "*")
            .Replace("%7E", "~");
        byte[] bytes = System.Text.Encoding.UTF8.GetBytes(urlEncoded);
        string base64 = Convert.ToBase64String(bytes);
        return base64.Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    public static async Task Trigger(AlertasDb db, string userIdStr) {
        if (!Guid.TryParse(userIdStr, out var userId)) return;
        
        string frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:8081";
        
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        
        // 1. Fetch User details
        using var cmdUser = conn.CreateCommand();
        cmdUser.CommandText = "SELECT Nombre, Email, Sede FROM auth.Usuarios WHERE Id = @id";
        var pId = cmdUser.CreateParameter(); pId.ParameterName = "@id"; pId.Value = userId; cmdUser.Parameters.Add(pId);
        
        string userName = "Usuario";
        string userEmail = "victor.rivera@upch.pe";
        string userSede = "Todas";
        
        using (var reader = await cmdUser.ExecuteReaderAsync()) {
            if (await reader.ReadAsync()) {
                userName = reader.IsDBNull(0) ? "Usuario" : reader.GetString(0);
                userEmail = reader.IsDBNull(1) ? "victor.rivera@upch.pe" : reader.GetString(1);
                userSede = reader.IsDBNull(2) ? "Todas" : reader.GetString(2);
            }
        }
        
        // 2. Query Equipment Statistics (KPI Badges)
        int totalEquipos = 0;
        int operativos = 0;
        int enMantenimiento = 0;
        int fueraDeServicio = 0;
        
        try {
            using var cmdStats = conn.CreateCommand();
            cmdStats.CommandText = @"
                SELECT 
                    COUNT(e.Id) AS TotalEquipos,
                    SUM(CASE WHEN e.Estado = 'Operativo' THEN 1 ELSE 0 END) AS Operativos,
                    SUM(CASE WHEN e.Estado = 'En Mantenimiento' THEN 1 ELSE 0 END) AS EnMantenimiento,
                    SUM(CASE WHEN e.Estado NOT IN ('Operativo', 'En Mantenimiento') THEN 1 ELSE 0 END) AS FueraDeServicio
                FROM inventario.Activos e
                JOIN inventario.Ubicaciones u ON e.UbicacionId = u.Id
                WHERE 1=1
            " + (userSede == "Todas" ? "" : " AND u.Sede = @sede ");
            
            if (userSede != "Todas") {
                var pSede = cmdStats.CreateParameter(); pSede.ParameterName = "@sede"; pSede.Value = userSede; cmdStats.Parameters.Add(pSede);
            }
            
            using var rStats = await cmdStats.ExecuteReaderAsync();
            if (await rStats.ReadAsync()) {
                totalEquipos = rStats.IsDBNull(0) ? 0 : rStats.GetInt32(0);
                operativos = rStats.IsDBNull(1) ? 0 : rStats.GetInt32(1);
                enMantenimiento = rStats.IsDBNull(2) ? 0 : rStats.GetInt32(2);
                fueraDeServicio = rStats.IsDBNull(3) ? 0 : rStats.GetInt32(3);
            }
        } catch (Exception ex) {
            Console.WriteLine($"Error fetching equipment stats: {ex.Message}");
        }
        
        // 3. Query Active Alerts
        using var cmdAlerts = conn.CreateCommand();
        cmdAlerts.CommandText = @"
            SELECT a.Mensaje, a.Severidad, e.Nombre, u.Nombre, e.Id, a.Tipo
            FROM alertas.Alertas a
            JOIN inventario.Activos e ON a.activo_id = e.Id
            JOIN inventario.Ubicaciones u ON e.UbicacionId = u.Id
            WHERE a.Estado = 'Activa'
        " + (userSede == "Todas" ? "" : " AND u.Sede = @sede ") +
        " ORDER BY CASE WHEN a.Severidad = 'Alta' THEN 1 WHEN a.Severidad = 'Media' THEN 2 ELSE 3 END";
            
        if (userSede != "Todas") {
            var pSede = cmdAlerts.CreateParameter(); pSede.ParameterName = "@sede"; pSede.Value = userSede; cmdAlerts.Parameters.Add(pSede);
        }
        
        var alertsHtml = "";
        int totalAlertas = 0;
        int alertasAltas = 0;
        int alertasMedias = 0;
        int alertasBajas = 0;
        
        using (var reader = await cmdAlerts.ExecuteReaderAsync()) {
            while (await reader.ReadAsync()) {
                totalAlertas++;
                var msg = reader.GetString(0);
                var sev = reader.GetString(1);
                var eq = reader.GetString(2);
                var ubi = reader.GetString(3);
                var activoId = reader.GetGuid(4);
                var tipoAlert = reader.IsDBNull(5) ? "Mantenimiento" : reader.GetString(5);
                
                if (sev == "Alta") alertasAltas++;
                else if (sev == "Media") alertasMedias++;
                else alertasBajas++;
                
                var eqUrl = $"{frontendUrl}/equipos/{activoId}";
                
                var isAlta = sev == "Alta";
                var isBaja = sev == "Baja";
                var color = isAlta ? "#ef4444" : (isBaja ? "#3b82f6" : "#f59e0b");
                var badgeBg = isAlta ? "#fee2e2" : (isBaja ? "#dbeafe" : "#fef3c7");
                
                alertsHtml += $@"
                <div style='background-color: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid {color}; border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);'>
                    <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td valign='top'>
                                <div style='margin-bottom: 6px;'>
                                    <a href='{eqUrl}' style='color: #111827; text-decoration: none; font-size: 15px; font-weight: 700;'>
                                        {eq}
                                    </a>
                                </div>
                                <p style='margin: 0 0 10px 0; color: #4b5563; font-size: 13px; line-height: 1.5;'>{msg}</p>
                                <div>
                                    <span style='background-color: #f3f4f6; color: #374151; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; margin-right: 6px;'>Ubicación: {ubi}</span>
                                    <span style='background-color: #f3f4f6; color: #374151; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;'>Categoría: {tipoAlert}</span>
                                </div>
                            </td>
                            <td valign='top' align='right' width='110'>
                                <span style='background-color: {badgeBg}; color: {color}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; display: inline-block; margin-bottom: 10px;'>
                                    {sev}
                                </span>
                                <div>
                                    <a href='{eqUrl}' style='display: inline-block; background-color: #f9fafb; border: 1px solid #d1d5db; color: #2563eb; text-decoration: none; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 4px;'>
                                        Ver Equipo &rarr;
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>";
            }
        }
        
        if (totalAlertas == 0) {
            alertsHtml = @"
            <div style='text-align: center; padding: 28px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;'>
                <p style='margin: 0; color: #166534; font-size: 14px; font-weight: 600;'>No hay alertas activas registradas en tu sede.</p>
                <p style='margin: 4px 0 0 0; color: #15803d; font-size: 12px;'>Todos los equipos están operando dentro de los parámetros esperados.</p>
            </div>";
        }

        // 4. Query Upcoming / Pending Maintenances
        var mantHtml = "";
        int totalMantenimientos = 0;
        try {
            using var cmdMant = conn.CreateCommand();
            cmdMant.CommandText = @"
                SELECT TOP 5 m.Tipo, m.Estado, m.proxima_fecha, e.Nombre, u.Nombre, e.Id
                FROM mantenimiento.Mantenimientos m
                JOIN inventario.Activos e ON m.activo_id = e.Id
                JOIN inventario.Ubicaciones u ON e.UbicacionId = u.Id
                WHERE (m.Estado = 'Pendiente' OR m.Estado = 'Programado' OR m.Estado IS NULL)
            " + (userSede == "Todas" ? "" : " AND u.Sede = @sede ") +
            " ORDER BY m.proxima_fecha ASC";

            if (userSede != "Todas") {
                var pSede = cmdMant.CreateParameter(); pSede.ParameterName = "@sede"; pSede.Value = userSede; cmdMant.Parameters.Add(pSede);
            }

            using var rMant = await cmdMant.ExecuteReaderAsync();
            while (await rMant.ReadAsync()) {
                totalMantenimientos++;
                var tipo = rMant.IsDBNull(0) ? "Mantenimiento" : rMant.GetString(0);
                var estado = rMant.IsDBNull(1) ? "Pendiente" : rMant.GetString(1);
                var proxFecha = rMant.IsDBNull(2) ? "Por programar" : rMant.GetString(2);
                var eqNombre = rMant.GetString(3);
                var ubiNombre = rMant.GetString(4);
                var activoId = rMant.GetGuid(5);
                var eqUrl = $"{frontendUrl}/equipos/{activoId}";

                mantHtml += $@"
                <tr style='border-bottom: 1px solid #f3f4f6;'>
                    <td style='padding: 10px 8px; font-size: 13px;'>
                        <a href='{eqUrl}' style='color: #111827; text-decoration: none; font-weight: 600;'>{eqNombre}</a>
                        <div style='color: #6b7280; font-size: 11px;'>{ubiNombre}</div>
                    </td>
                    <td style='padding: 10px 8px; font-size: 12px; color: #4b5563;'>{tipo}</td>
                    <td style='padding: 10px 8px; font-size: 12px; color: #1e40af; font-weight: 600;'>{proxFecha}</td>
                    <td style='padding: 10px 8px; font-size: 12px;' align='right'>
                        <a href='{eqUrl}' style='color: #2563eb; text-decoration: none; font-weight: 600; font-size: 11px;'>Ver &rarr;</a>
                    </td>
                </tr>";
            }
        } catch (Exception ex) {
            Console.WriteLine($"Error fetching upcoming maintenances: {ex.Message}");
        }

        if (conn.State == System.Data.ConnectionState.Open) await conn.CloseAsync();

        if (totalMantenimientos == 0) {
            mantHtml = @"
            <tr>
                <td colspan='4' style='padding: 16px; text-align: center; color: #6b7280; font-size: 13px;'>
                    No hay mantenimientos pendientes programados próximamente.
                </td>
            </tr>";
        }
        
        string fechaHoy = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        int pctOperativos = totalEquipos > 0 ? (int)Math.Round((double)operativos / totalEquipos * 100) : 100;
        
        string html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: auto; background-color: #f4f6f8; padding: 20px;'>
            <div style='background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);'>
                
                <!-- HEADER BANNER -->
                <div style='background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; color: #ffffff;'>
                    <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td valign='middle'>
                                <div style='background-color: #f59e0b; color: #0f172a; font-weight: 900; font-size: 18px; padding: 5px 12px; border-radius: 6px; display: inline-block; letter-spacing: -0.5px;'>
                                    CREO<span style='font-weight: 400;'>+</span>
                                </div>
                                <span style='color: #94a3b8; font-size: 14px; font-weight: 600; margin-left: 8px; letter-spacing: 0.5px;'>BIOASSET</span>
                            </td>
                            <td align='right' valign='middle'>
                                <span style='background-color: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;'>
                                    SEDE: {userSede.ToUpper()}
                                </span>
                            </td>
                        </tr>
                    </table>
                    <div style='margin-top: 16px;'>
                        <h1 style='margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;'>Reporte Diario de Operaciones</h1>
                        <p style='margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;'>Emitido el {fechaHoy} hrs</p>
                    </div>
                </div>

                <!-- MAIN BODY -->
                <div style='padding: 28px;'>
                    <p style='margin-top: 0; color: #1e293b; font-size: 15px; line-height: 1.5;'>
                        Hola <strong>{userName}</strong>, aquí tienes la síntesis operativa y el estado actualizado de tu sede en el sistema <strong>CREO+ BioAsset</strong>:
                    </p>
                    
                    <!-- KPI BADGES METRICS -->
                    <div style='margin: 24px 0;'>
                        <table width='100%' cellpadding='0' cellspacing='6' border='0'>
                            <tr>
                                <td width='25%' style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;'>
                                    <div style='color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;'>Total Equipos</div>
                                    <div style='color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 2px;'>{totalEquipos}</div>
                                </td>
                                <td width='25%' style='background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;'>
                                    <div style='color: #166534; font-size: 10px; font-weight: 700; text-transform: uppercase;'>Operativos</div>
                                    <div style='color: #15803d; font-size: 22px; font-weight: 800; margin-top: 2px;'>{operativos}</div>
                                    <div style='color: #166534; font-size: 10px;'>({pctOperativos}%)</div>
                                </td>
                                <td width='25%' style='background-color: {(totalAlertas > 0 ? "#fef2f2" : "#f8fafc")}; border: 1px solid {(totalAlertas > 0 ? "#fecaca" : "#e2e8f0")}; border-radius: 8px; padding: 12px; text-align: center;'>
                                    <div style='color: {(totalAlertas > 0 ? "#991b1b" : "#64748b")}; font-size: 10px; font-weight: 700; text-transform: uppercase;'>Alertas</div>
                                    <div style='color: {(totalAlertas > 0 ? "#dc2626" : "#0f172a")}; font-size: 22px; font-weight: 800; margin-top: 2px;'>{totalAlertas}</div>
                                    <div style='color: #dc2626; font-size: 10px;'>{(alertasAltas > 0 ? $"{alertasAltas} Críticas" : "Sin Críticas")}</div>
                                </td>
                                <td width='25%' style='background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;'>
                                    <div style='color: #1e40af; font-size: 10px; font-weight: 700; text-transform: uppercase;'>Mant. Pend.</div>
                                    <div style='color: #2563eb; font-size: 22px; font-weight: 800; margin-top: 2px;'>{totalMantenimientos}</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- ALERTAS ACTIVAS SECTION -->
                    <div style='margin-top: 28px;'>
                        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom: 12px;'>
                            <tr>
                                <td>
                                    <h3 style='margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;'>
                                        Alertas Activas ({totalAlertas})
                                    </h3>
                                </td>
                                <td align='right'>
                                    <a href='{frontendUrl}/alertas' style='color: #2563eb; text-decoration: none; font-size: 12px; font-weight: 600;'>
                                        Ver todas en el sistema &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                        {alertsHtml}
                    </div>

                    <!-- MANTENIMIENTOS PENDIENTES SECTION -->
                    <div style='margin-top: 28px;'>
                        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom: 12px;'>
                            <tr>
                                <td>
                                    <h3 style='margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;'>
                                        Mantenimientos Programados
                                    </h3>
                                </td>
                                <td align='right'>
                                    <a href='{frontendUrl}/mantenimiento' style='color: #2563eb; text-decoration: none; font-size: 12px; font-weight: 600;'>
                                        Ir a Mantenimiento &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                        <div style='background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;'>
                            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                                <thead>
                                    <tr style='background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;'>
                                        <th style='padding: 8px; font-size: 11px; color: #64748b; font-weight: 700;'>EQUIPO / UBICACIÓN</th>
                                        <th style='padding: 8px; font-size: 11px; color: #64748b; font-weight: 700;'>TIPO</th>
                                        <th style='padding: 8px; font-size: 11px; color: #64748b; font-weight: 700;'>FECHA</th>
                                        <th style='padding: 8px; font-size: 11px; color: #64748b; font-weight: 700;' align='right'>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mantHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ACTION BUTTONS -->
                    <div style='margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;'>
                        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                            <tr>
                                <td align='center'>
                                    <a href='{frontendUrl}/alertas' style='display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 6px; margin: 4px;'>
                                        Ver Panel de Alertas
                                    </a>
                                    <a href='{frontendUrl}/mantenimiento' style='display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 6px; margin: 4px;'>
                                        Ver Mantenimientos
                                    </a>
                                    <a href='{frontendUrl}' style='display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 6px; margin: 4px;'>
                                        Abrir Dashboard BioAsset
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style='background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; text-align: center;'>
                    <p style='margin: 0; color: #64748b; font-size: 12px;'>
                        Este es un reporte consolidado automatizado del sistema <strong>CREO+ BioAsset</strong>.
                    </p>
                    <p style='margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;'>
                        © 2026 CREO+ BioAsset • Plataforma de Gestión Biomédica Hospitalaria.
                    </p>
                </div>
            </div>
        </div>";
        
        await EmailSender.SendEmail(userEmail, $"Reporte Diario BioAsset - Sede {userSede}", html);
    }
}
