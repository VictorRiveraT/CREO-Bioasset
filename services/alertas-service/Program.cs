using Microsoft.EntityFrameworkCore;
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
        } catch (Exception e) {
            Console.WriteLine($"Error processing message: {e.Message}");
        }
    }
}
