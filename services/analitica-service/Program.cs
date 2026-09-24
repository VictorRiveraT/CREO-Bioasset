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
builder.Services.AddDbContext<AnaliticaDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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

app.MapGet("/metricas", [Authorize] async (AnaliticaDb db) => Results.Ok(new { metricas = await db.Metricas.ToListAsync() }));

using (var scope = app.Services.CreateScope()) { 
    var dbContext = scope.ServiceProvider.GetRequiredService<AnaliticaDb>();
    try {
        var creator = (DatabaseFacade)dbContext.Database;
        var relationalCreator = creator.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        relationalCreator.EnsureCreated();
        relationalCreator.CreateTables();
    } catch {}
}
app.Run();

public class AnaliticaDb : DbContext {
    public AnaliticaDb(DbContextOptions<AnaliticaDb> options) : base(options) { }
    public DbSet<Metrica> Metricas => Set<Metrica>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("analitica"); }
}

public class Metrica {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = "";
    public double Valor { get; set; }
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
            
            var queues = new[] { "activos_q", "mantenimientos_q", "movimientos_q" };
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
        var db = scope.ServiceProvider.GetRequiredService<AnaliticaDb>();
        try {
            var doc = JsonDocument.Parse(message);
            var action = doc.RootElement.GetProperty("Action").GetString();
            
            var metricName = queue == "activos_q" ? "Total_Activos_Nuevos" : 
                             queue == "mantenimientos_q" ? "Total_Mantenimientos" : 
                             "Total_Movimientos";

            if (action == "Created") {
                var metric = db.Metricas.FirstOrDefault(m => m.Nombre == metricName);
                if (metric == null) {
                    metric = new Metrica { Nombre = metricName, Valor = 1 };
                    db.Metricas.Add(metric);
                } else {
                    metric.Valor += 1;
                }
                db.SaveChanges();
            }
        } catch (Exception e) {
            Console.WriteLine($"Error processing message: {e.Message}");
        }
    }
}
