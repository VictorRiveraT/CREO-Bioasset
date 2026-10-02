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

app.MapGet("/mantenimientos", [Authorize] async (MantDb db, HttpContext ctx, int page = 1, int limit = 1000) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var sedeTemporal = ctx.User.FindFirst("sedeTemporal")?.Value;
    var sedes = new List<string>();
    if(sede != null) sedes.Add(sede);
    if(!string.IsNullOrEmpty(sedeTemporal) && sedeTemporal != "[]" && sedeTemporal != "Ninguna") {
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<string>>(sedeTemporal); if(temp != null) sedes.AddRange(temp); } catch {}
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(sedeTemporal); foreach(var t in temp) { if(t.TryGetProperty("sede", out var s)) sedes.Add(s.GetString()); } } catch {}
    }
    var q = db.Mantenimientos.AsQueryable();
    if (rol != "admin" && sede != "Todas") {
        var allowedUbicaciones = await db.Ubicaciones.Where(u => sedes.Contains(u.Sede)).Select(u => u.Id).ToListAsync();
        var allowedActivos = await db.Activos.Where(a => allowedUbicaciones.Contains(a.UbicacionId)).Select(a => a.Id).ToListAsync();
        q = q.Where(m => allowedActivos.Contains(m.ActivoId));
    }
    var total = await q.CountAsync();
    var items = await q.OrderByDescending(m => m.Fecha).Skip((page - 1) * limit).Take(limit).ToListAsync();
    return Results.Ok(new { mantenimientos = items, total, page, limit });
});
app.MapGet("/mantenimientos/{id}", [Authorize] async (Guid id, MantDb db) => {
    var m = await db.Mantenimientos.FindAsync(id);
    return m != null ? Results.Ok(new { mantenimiento = m }) : Results.NotFound();
});
app.MapPost("/mantenimientos", [Authorize(Roles = "admin,biomedico")] async (Mantenimiento dto, MantDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    if (rol != "admin" && sede != "Todas") {
        var a = await db.Activos.FindAsync(dto.ActivoId);
        if (a != null) {
            var u = await db.Ubicaciones.FindAsync(a.UbicacionId);
            if (u == null || u.Sede != sede) return Results.Forbid();
        }
    }
    dto.Id = Guid.NewGuid();
    db.Mantenimientos.Add(dto);
    await db.SaveChangesAsync();
    EventBus.Publish("mantenimientos_q", new { Action = "Created", Data = dto });
    return Results.Created($"/mantenimientos/{dto.Id}", dto);
});
app.MapPut("/mantenimientos/{id}", [Authorize(Roles = "admin,biomedico")] async (Guid id, Mantenimiento dto, MantDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var m = await db.Mantenimientos.FindAsync(id);
    if(m != null && rol != "admin" && sede != "Todas") {
        var a = await db.Activos.FindAsync(m.ActivoId);
        if(a != null) {
            var u = await db.Ubicaciones.FindAsync(a.UbicacionId);
            if(u == null || u.Sede != sede) return Results.Forbid();
        }
    }
    if (m == null) return Results.NotFound();
    m.Estado = dto.Estado;
    m.Descripcion = dto.Descripcion;
    m.ProximaFecha = dto.ProximaFecha;
    m.Fecha = dto.Fecha;
    m.Observaciones = dto.Observaciones;
    m.Costo = dto.Costo;
    m.Proveedor = dto.Proveedor;
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

app.MapGet("/incidencias", [Authorize] async (MantDb db, HttpContext ctx, int page = 1, int limit = 1000) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var sedeTemporal = ctx.User.FindFirst("sedeTemporal")?.Value;
    var sedes = new List<string>();
    if(sede != null) sedes.Add(sede);
    if(!string.IsNullOrEmpty(sedeTemporal) && sedeTemporal != "[]" && sedeTemporal != "Ninguna") {
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<string>>(sedeTemporal); if(temp != null) sedes.AddRange(temp); } catch {}
        try { var temp = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(sedeTemporal); foreach(var t in temp) { if(t.TryGetProperty("sede", out var s)) sedes.Add(s.GetString()); } } catch {}
    }
    var q = db.Incidencias.AsQueryable();
    if (rol != "admin" && sede != "Todas") {
        var allowedUbicaciones = await db.Ubicaciones.Where(u => sedes.Contains(u.Sede)).Select(u => u.Id).ToListAsync();
        var allowedActivos = await db.Activos.Where(a => allowedUbicaciones.Contains(a.UbicacionId)).Select(a => a.Id).ToListAsync();
        q = q.Where(i => allowedActivos.Contains(i.ActivoId));
    }
    var total = await q.CountAsync();
    var items = await q.Skip((page - 1) * limit).Take(limit).ToListAsync();
    return Results.Ok(new { incidencias = items, total, page, limit });
});
app.MapGet("/incidencias/{id}", [Authorize] async (Guid id, MantDb db) => {
    var i = await db.Incidencias.FindAsync(id);
    return i != null ? Results.Ok(new { incidencia = i }) : Results.NotFound();
});
app.MapPost("/incidencias", [Authorize] async (Incidencia dto, MantDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    if (rol != "admin" && sede != "Todas") {
        var a = await db.Activos.FindAsync(dto.ActivoId);
        if (a != null) {
            var u = await db.Ubicaciones.FindAsync(a.UbicacionId);
            if (u == null || u.Sede != sede) return Results.Forbid();
        }
    }
    dto.Id = Guid.NewGuid();
    db.Incidencias.Add(dto);
    await db.SaveChangesAsync();
    EventBus.Publish("incidencias_q", new { Action = "Created", Data = dto });
    return Results.Created($"/incidencias/{dto.Id}", dto);
});
app.MapPut("/incidencias/{id}", [Authorize] async (Guid id, Incidencia dto, MantDb db, HttpContext ctx) => {
    var sede = ctx.User.FindFirst("sede")?.Value;
    var rol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var i = await db.Incidencias.FindAsync(id);
    if(i != null && rol != "admin" && sede != "Todas") {
        var a = await db.Activos.FindAsync(i.ActivoId);
        if(a != null) {
            var u = await db.Ubicaciones.FindAsync(a.UbicacionId);
            if(u == null || u.Sede != sede) return Results.Forbid();
        }
    }
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
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Costo' AND Object_ID = Object_ID(N'[mantenimiento].[Mantenimientos]'))
            BEGIN
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Costo DECIMAL(18,2) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Proveedor NVARCHAR(100) NULL
            END
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'RelacionadaId' AND Object_ID = Object_ID(N'[mantenimiento].[Incidencias]'))
            BEGIN
                ALTER TABLE [mantenimiento].[Incidencias] ADD RelacionadaId UNIQUEIDENTIFIER NULL
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
    public DbSet<InvUbicacion> Ubicaciones => Set<InvUbicacion>();
    public DbSet<InvActivo> Activos => Set<InvActivo>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) { 
        modelBuilder.HasDefaultSchema("mantenimiento"); 
        modelBuilder.Entity<InvUbicacion>().ToTable("Ubicaciones", "inventario");
        modelBuilder.Entity<InvActivo>().ToTable("Activos", "inventario");
    }
}
public class InvUbicacion { [System.ComponentModel.DataAnnotations.Key] public Guid Id { get; set; } public string Sede { get; set; } = ""; }
public class InvActivo { [System.ComponentModel.DataAnnotations.Key] public Guid Id { get; set; } public Guid UbicacionId { get; set; } }
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
    public decimal? Costo { get; set; }
    public string? Proveedor { get; set; }
}

public class Incidencia {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    public string Titulo { get; set; } = "";
    public string Estado { get; set; } = "";
    [Column("relacionada_id"), JsonPropertyName("relacionada_id")] public Guid? RelacionadaId { get; set; }
}
