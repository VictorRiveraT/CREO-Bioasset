using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using RabbitMQ.Client;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.Infrastructure;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddDbContext<MantDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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

var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions {
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

static class EventBus {
    public static void Publish(string queue, object message) {
        try {
            var factory = new ConnectionFactory() { HostName = "rabbitmq" };
            using var connection = factory.CreateConnection();
            using var channel = connection.CreateModel();
            channel.QueueDeclare(queue: queue, durable: false, exclusive: false, autoDelete: false, arguments: null);
            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
            channel.BasicPublish(exchange: "", routingKey: queue, basicProperties: null, body: body);
        } catch (Exception e) {
            Console.WriteLine($"RabbitMQ Publish Error: {e.Message}");
        }
    }
}

app.MapGet("/mantenimientos", [Authorize] async (MantDb db) => Results.Ok(new { mantenimientos = await db.Mantenimientos.ToListAsync() }));
app.MapGet("/mantenimientos/{id}", [Authorize] async (Guid id, MantDb db) => {
    var m = await db.Mantenimientos.FindAsync(id);
    return m != null ? Results.Ok(new { mantenimiento = m }) : Results.NotFound();
});
app.MapPost("/mantenimientos", [Authorize(Roles = "admin,biomedico")] async (Mantenimiento dto, MantDb db) => {
    dto.Id = Guid.NewGuid();
    db.Mantenimientos.Add(dto);
    await db.SaveChangesAsync();
    EventBus.Publish("mantenimientos_q", new { Action = "Created", Data = dto });
    return Results.Created($"/mantenimientos/{dto.Id}", dto);
});
app.MapPut("/mantenimientos/{id}", [Authorize(Roles = "admin,biomedico")] async (Guid id, Mantenimiento dto, MantDb db) => {
    var m = await db.Mantenimientos.FindAsync(id);
    if (m == null) return Results.NotFound();
    m.Estado = dto.Estado;
    m.Descripcion = dto.Descripcion;
    m.ProximaFecha = dto.ProximaFecha;
    m.Fecha = dto.Fecha;
    m.Observaciones = dto.Observaciones;
    if (!string.IsNullOrEmpty(dto.ArchivoBase64) && dto.ArchivoBase64.StartsWith("data:")) {
        // Extract base64 and extension
        var parts = dto.ArchivoBase64.Split(',');
        var meta = parts[0];
        var base64Data = parts[1];
        var ext = meta.Contains("application/pdf") ? ".pdf" : 
                  meta.Contains("image/png") ? ".png" : 
                  meta.Contains("image/jpeg") ? ".jpg" : ".bin";
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsPath, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, Convert.FromBase64String(base64Data));
        m.ArchivoBase64 = $"/api/mantenimiento/uploads/{fileName}";
    } else if (!string.IsNullOrEmpty(dto.ArchivoBase64)) {
        // If it's already a URL from a previous save, don't overwrite it with bad data
        m.ArchivoBase64 = dto.ArchivoBase64;
    }
    await db.SaveChangesAsync();
    EventBus.Publish("mantenimientos_q", new { Action = "Updated", Data = m });
    return Results.NoContent();
});

app.MapGet("/incidencias", [Authorize] async (MantDb db) => Results.Ok(new { incidencias = await db.Incidencias.ToListAsync() }));
app.MapGet("/incidencias/{id}", [Authorize] async (Guid id, MantDb db) => {
    var i = await db.Incidencias.FindAsync(id);
    return i != null ? Results.Ok(new { incidencia = i }) : Results.NotFound();
});
app.MapPost("/incidencias", [Authorize] async (Incidencia dto, MantDb db) => {
    dto.Id = Guid.NewGuid();
    db.Incidencias.Add(dto);
    await db.SaveChangesAsync();
    EventBus.Publish("incidencias_q", new { Action = "Created", Data = dto });
    return Results.Created($"/incidencias/{dto.Id}", dto);
});
app.MapPut("/incidencias/{id}", [Authorize] async (Guid id, Incidencia dto, MantDb db) => {
    var i = await db.Incidencias.FindAsync(id);
    if (i == null) return Results.NotFound();
    i.Estado = dto.Estado;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

using (var scope = app.Services.CreateScope()) { 
    var dbContext = scope.ServiceProvider.GetRequiredService<MantDb>();
    try {
        var creator = (DatabaseFacade)dbContext.Database;
        var relationalCreator = creator.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        relationalCreator.EnsureCreated();
        relationalCreator.CreateTables();
    } catch {}
    
    // Auto-migrate new columns
    try {
        dbContext.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Fecha' AND Object_ID = Object_ID(N'[mantenimiento].[Mantenimientos]'))
            BEGIN
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Fecha NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Observaciones NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD ArchivoBase64 NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD IncidenciaId UNIQUEIDENTIFIER NULL
            END
        ");
    } catch (Exception e) {
        Console.WriteLine(e);
    }
}
app.Run();

public class MantDb : DbContext {
    public MantDb(DbContextOptions<MantDb> options) : base(options) { }
    public DbSet<Mantenimiento> Mantenimientos => Set<Mantenimiento>();
    public DbSet<Incidencia> Incidencias => Set<Incidencia>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("mantenimiento"); }
}

public class Mantenimiento {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    [Column("biomedico_id"), JsonPropertyName("biomedico_id")] public Guid BiomedicoId { get; set; }
    public string Tipo { get; set; } = "";
    public string Estado { get; set; } = "";
    public string Descripcion { get; set; } = "";
    [Column("proxima_fecha"), JsonPropertyName("proxima_fecha")] public string? ProximaFecha { get; set; }
    public string? Fecha { get; set; }
    public string? Observaciones { get; set; }
    public string? ArchivoBase64 { get; set; }
    [Column("incidencia_id"), JsonPropertyName("incidencia_id")] public Guid? IncidenciaId { get; set; }
}

public class Incidencia {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    public string Titulo { get; set; } = "";
    public string Estado { get; set; } = "";
}
