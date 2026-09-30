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

app.MapGet("/alertas", [Authorize] async (AlertasDb db) => Results.Ok(new { alertas = await db.Alertas.ToListAsync() }));
app.MapPut("/alertas/{id}", [Authorize] async (Guid id, Alerta dto, AlertasDb db) => {
    var alerta = await db.Alertas.FindAsync(id);
    if (alerta == null) return Results.NotFound();
    alerta.Estado = dto.Estado;
    await db.SaveChangesAsync();
    return Results.Ok(alerta);
});

app.MapPost("/trigger-daily", [Authorize] async (AlertasDb db, ClaimsPrincipal user) => {
    var userIdStr = user.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
    if(userIdStr != null) await DailyReportTrigger.Trigger(db, userIdStr);
    return Results.Ok(new { message = "Reporte diario enviado." });
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
    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("alertas"); }
}

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
    public static async Task Trigger(AlertasDb db, string userIdStr) {
        if (!Guid.TryParse(userIdStr, out var userId)) return;
        
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        
        using var cmdUser = conn.CreateCommand();
        cmdUser.CommandText = "SELECT Nombre, Email, Sede FROM auth.Usuarios WHERE Id = @id";
        var pId = cmdUser.CreateParameter(); pId.ParameterName = "@id"; pId.Value = userId; cmdUser.Parameters.Add(pId);
        
        string userName = "Usuario";
        string userEmail = "victor.rivera@upch.pe";
        string userSede = "Todas";
        
        using (var reader = await cmdUser.ExecuteReaderAsync()) {
            if(await reader.ReadAsync()) {
                userName = reader.GetString(0);
                userEmail = reader.GetString(1);
                userSede = reader.IsDBNull(2) ? "Todas" : reader.GetString(2);
            }
        }
        
        using var cmdAlerts = conn.CreateCommand();
        cmdAlerts.CommandText = @"
            SELECT a.Mensaje, a.Severidad, e.Nombre, u.Nombre, e.Id
            FROM alertas.Alertas a
            JOIN inventario.Activos e ON a.activo_id = e.Id
            JOIN inventario.Ubicaciones u ON e.UbicacionId = u.Id
            WHERE a.Estado = 'Activa'
        " + (userSede == "Todas" ? "" : " AND u.Sede = @sede ");
            
        if(userSede != "Todas") {
            var pSede = cmdAlerts.CreateParameter(); pSede.ParameterName = "@sede"; pSede.Value = userSede; cmdAlerts.Parameters.Add(pSede);
        }
        
        var alertsHtml = "";
        int count = 0;
        using (var reader = await cmdAlerts.ExecuteReaderAsync()) {
            while(await reader.ReadAsync()) {
                count++;
                var msg = reader.GetString(0);
                var sev = reader.GetString(1);
                var eq = reader.GetString(2);
                var ubi = reader.GetString(3);
                var activoId = reader.GetGuid(4);
                
                var isAlta = sev == "Alta";
                var color = isAlta ? "#ef4444" : (sev == "Baja" ? "#3b82f6" : "#eab308");
                var badgeBg = isAlta ? "#fee2e2" : (sev == "Baja" ? "#dbeafe" : "#fef3c7");
                
                alertsHtml += $@"
                <div style='background-color: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid {color}; border-radius: 6px; padding: 16px; margin-bottom: 12px;'>
                    <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td valign='top'>
                                <a href='http://localhost:5173/equipos/{activoId}' style='text-decoration: none;'>
                                    <h4 style='margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 600;'>{eq}</h4>
                                </a>
                                <p style='margin: 0 0 8px 0; color: #4b5563; font-size: 13px;'>{msg}</p>
                                <span style='background-color: #f3f4f6; color: #4b5563; padding: 2px 8px; border-radius: 12px; font-size: 11px;'>Ubicación: {ubi}</span>
                            </td>
                            <td valign='top' align='right' width='100'>
                                <span style='background-color: {badgeBg}; color: {color}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;'>{sev}</span>
                            </td>
                        </tr>
                    </table>
                </div>";
            }
        }
        await conn.CloseAsync();

        if (count == 0) {
            alertsHtml = @"
            <div style='text-align: center; padding: 30px; background-color: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db;'>
                <p style='margin: 0; color: #6b7280; font-size: 14px;'>🎉 ¡Excelente! No tienes alertas activas en tu sede.</p>
            </div>";
        }
        
        string html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f8f9fa; padding: 20px;'>
            <div style='background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                
                <!-- HEADER -->
                <div style='background-color: #1f2937; padding: 20px 30px;'>
                    <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td width='100'>
                                <div style='background-color: #f59e0b; color: #111827; font-weight: 900; font-size: 20px; padding: 6px 12px; border-radius: 4px; text-align: center; letter-spacing: -0.5px; display: inline-block;'>
                                    CREO<span style='font-weight: 400;'>+</span>
                                </div>
                            </td>
                            <td align='right' style='color: #9ca3af; font-size: 12px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;'>
                                BioAsset
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- BODY -->
                <div style='padding: 30px;'>
                    <p style='color: #f59e0b; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;'>REPORTE DIARIO • SEDE {userSede.ToUpper()}</p>
                    <h2 style='color: #111827; margin-top: 0; font-size: 22px;'>Hola {userName},</h2>
                    <p style='color: #4b5563; font-size: 14px; line-height: 1.6;'>Aquí tienes el resumen automatizado de equipos biomédicos y alertas pendientes que requieren tu atención hoy.</p>
                    
                    <div style='margin-top: 30px;'>
                        <h3 style='color: #111827; font-size: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-bottom: 16px;'>Alertas Pendientes ({count})</h3>
                        {alertsHtml}
                    </div>
                    
                    <div style='margin-top: 30px; text-align: center;'>
                        <a href='http://localhost:5173' style='display: inline-block; background-color: #1f2937; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 6px;'>Abrir BioAsset Dashboard</a>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style='background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;'>
                    <p style='margin: 0; color: #9ca3af; font-size: 12px;'>Este es un correo automático generado por el sistema <strong>CREO+ BioAsset</strong>.</p>
                    <p style='margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;'>Por favor, no respondas a este mensaje.</p>
                </div>
            </div>
        </div>";
        
        await EmailSender.SendEmail(userEmail, $"Reporte Diario BioAsset - Sede {userSede}", html);
    }
}
