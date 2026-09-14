using System;
using System.Linq;
using System.Text;
using System.Drawing;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.Infrastructure;
using QRCoder;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<InvDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddCors();
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

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/ubicaciones", [Authorize] async (InvDb db) => Results.Ok(new { ubicaciones = await db.Ubicaciones.ToListAsync() }));
app.MapPost("/ubicaciones", [Authorize(Roles = "admin")] async (Ubicacion dto, InvDb db) => { db.Ubicaciones.Add(dto); await db.SaveChangesAsync(); return Results.Created("", dto); });
app.MapPut("/ubicaciones/{id}", [Authorize(Roles = "admin")] async (Guid id, Ubicacion dto, InvDb db) => {
    var u = await db.Ubicaciones.FindAsync(id);
    if(u!=null) { u.Nombre = dto.Nombre; u.Descripcion = dto.Descripcion; u.Activo = dto.Activo; u.Sede = dto.Sede; u.Piso = dto.Piso; await db.SaveChangesAsync(); }
    return Results.Ok();
});
app.MapDelete("/ubicaciones/{id}", [Authorize(Roles = "admin")] async (Guid id, InvDb db) => {
    var u = await db.Ubicaciones.FindAsync(id);
    if(u!=null) { db.Ubicaciones.Remove(u); await db.SaveChangesAsync(); }
    return Results.Ok();
});

app.MapGet("/marcas", [Authorize] async (InvDb db) => Results.Ok(new { marcas = await db.Marcas.ToListAsync() }));
app.MapPost("/marcas", [Authorize(Roles = "admin")] async (Marca dto, InvDb db) => { db.Marcas.Add(dto); await db.SaveChangesAsync(); return Results.Created("", dto); });
app.MapPut("/marcas/{id}", [Authorize(Roles = "admin")] async (Guid id, Marca dto, InvDb db) => {
    var m = await db.Marcas.FindAsync(id);
    if(m!=null) { m.Nombre = dto.Nombre; m.ModelosJson = dto.ModelosJson; await db.SaveChangesAsync(); }
    return Results.Ok();
});
app.MapDelete("/marcas/{id}", [Authorize(Roles = "admin")] async (Guid id, InvDb db) => {
    var m = await db.Marcas.FindAsync(id);
    if(m!=null) { db.Marcas.Remove(m); await db.SaveChangesAsync(); }
    return Results.Ok();
});

app.MapGet("/activos", [Authorize] async (InvDb db, string? ubicacion, string? estado) => {
    var q = db.Activos.AsQueryable();
    if(!string.IsNullOrEmpty(ubicacion) && ubicacion != "todas") q = q.Where(a => a.UbicacionId.ToString() == ubicacion);
    if(!string.IsNullOrEmpty(estado) && estado != "todos") q = q.Where(a => a.Estado == estado);
    return Results.Ok(new { activos = await q.ToListAsync() });
});

app.MapGet("/activos/{id}", [Authorize] async (Guid id, InvDb db) => {
    var a = await db.Activos.FindAsync(id);
    return a != null ? Results.Ok(new { activo = a }) : Results.NotFound();
});

app.MapPut("/activos/{id}", [Authorize(Roles = "admin,biomedico")] async (Guid id, Activo dto, InvDb db) => {
    var a = await db.Activos.FindAsync(id);
    if(a != null) { 
        a.Nombre = dto.Nombre; 
        a.Categoria = dto.Categoria; 
        await db.SaveChangesAsync(); 
    }
    return Results.Ok();
});



app.MapPost("/activos", [Authorize(Roles = "admin,biomedico")] async (Activo dto, InvDb db) => {
    dto.Id = Guid.NewGuid();
    db.Activos.Add(dto);
    await db.SaveChangesAsync();
    
    // Generate QR
    var qrGenerator = new QRCodeGenerator();
    var qrData = qrGenerator.CreateQrCode("http://localhost:5173/equipos/" + dto.Id, QRCodeGenerator.ECCLevel.Q);
    var qrCode = new PngByteQRCode(qrData);
    var qrBytes = qrCode.GetGraphic(20);
    var qrBase64 = "data:image/png;base64," + Convert.ToBase64String(qrBytes);
    
    return Results.Created("", new { activo = dto, qrImage = qrBase64 });
});

app.MapMethods("/activos/{id}", new[]{"PATCH"}, [Authorize(Roles = "admin,biomedico")] async (Guid id, System.Text.Json.Nodes.JsonObject patch, InvDb db) => {
    var a = await db.Activos.FindAsync(id);
    if(a==null) return Results.NotFound();
    
    if (patch.TryGetPropertyValue("codigo", out var codigo) && codigo != null) a.Codigo = codigo.ToString();
    if (patch.TryGetPropertyValue("nombre", out var nombre) && nombre != null) a.Nombre = nombre.ToString();
    if (patch.TryGetPropertyValue("categoria", out var cat) && cat != null) a.Categoria = cat.ToString();
    if (patch.TryGetPropertyValue("marca", out var marca) && marca != null) a.Marca = marca.ToString();
    if (patch.TryGetPropertyValue("modelo", out var modelo) && modelo != null) a.Modelo = modelo.ToString();
    if (patch.TryGetPropertyValue("serie", out var serie) && serie != null) a.Serie = serie.ToString();
    if (patch.TryGetPropertyValue("ubicacionId", out var ubi) && ubi != null) {
        if (Guid.TryParse(ubi.ToString(), out var guid)) a.UbicacionId = guid;
    }
    if (patch.TryGetPropertyValue("estado", out var est) && est != null) a.Estado = est.ToString();
    if (patch.TryGetPropertyValue("fechaAdquisicion", out var fa) && fa != null) a.FechaAdquisicion = fa.ToString();
    if (patch.TryGetPropertyValue("proximoMantenimiento", out var pm) && pm != null) a.ProximoMantenimiento = pm.ToString();
    if (patch.TryGetPropertyValue("criticidad", out var crit) && crit != null) a.Criticidad = crit.ToString();

    await db.SaveChangesAsync();
    return Results.Ok(new { activo = a });
});

app.MapGet("/movimientos", [Authorize] async (InvDb db) => Results.Ok(new { movimientos = await db.Movimientos.ToListAsync() }));
app.MapPost("/movimientos", [Authorize] async (Movimiento dto, InvDb db) => {
    db.Movimientos.Add(dto);
    var activo = await db.Activos.FindAsync(dto.EquipoId);
    if (activo != null) {
        activo.UbicacionId = dto.DestinoId;
    }
    await db.SaveChangesAsync();
    return Results.Created("", dto);
});

using (var scope = app.Services.CreateScope()) { 
    var dbContext = scope.ServiceProvider.GetRequiredService<InvDb>();
    try {
        var creator = (Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade)dbContext.Database;
        var relationalCreator = creator.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        relationalCreator.EnsureCreated();
        relationalCreator.CreateTables();
    } catch {}
    try {
        dbContext.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[inventario].[Marcas]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [inventario].[Marcas] (
                    [Id] uniqueidentifier NOT NULL,
                    [Nombre] nvarchar(max) NOT NULL,
                    [ModelosJson] nvarchar(max) NOT NULL,
                    CONSTRAINT [PK_Marcas] PRIMARY KEY ([Id])
                )
            END
        ");
        if (!dbContext.Marcas.Any()) {
            dbContext.Marcas.Add(new Marca { Nombre = "Philips", ModelosJson = "[\"IntelliVue MX400\", \"IntelliVue MX450\", \"Efficia CM100\", \"Epiq 7\", \"Sparq\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Mindray", ModelosJson = "[\"BeneVision N12\", \"BeneHeart D3\", \"PM-8000\", \"Resona 7\", \"SV300\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Drager", ModelosJson = "[\"Evita V500\", \"Savina 300\", \"Fabius Plus\", \"Infinity Delta\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Zoll", ModelosJson = "[\"R Series\", \"X Series\", \"AED Plus\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "B. Braun", ModelosJson = "[\"Infusomat Space\", \"Perfusor Space\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Baxter", ModelosJson = "[\"Sigma Spectrum\", \"Colleague 3 CX\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Puritan Bennett", ModelosJson = "[\"980\", \"840\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "GE Healthcare", ModelosJson = "[\"CARESCAPE B450\", \"Vivid T8\", \"MAC 2000\", \"LOGIQ E9\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Nihon Kohden", ModelosJson = "[\"Life Scope TR\", \"Cardiofax S\"]" });
            dbContext.Marcas.Add(new Marca { Nombre = "Medtronic", ModelosJson = "[\"PB 980\", \"Lifepak 15\"]" });
            dbContext.SaveChanges();
        }
    } catch (Exception e) {
        Console.WriteLine(e);
    }
    try {
        dbContext.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Sede' AND Object_ID = Object_ID(N'[inventario].[Ubicaciones]'))
            BEGIN
                ALTER TABLE [inventario].[Ubicaciones] ADD Sede NVARCHAR(MAX) NULL
                ALTER TABLE [inventario].[Ubicaciones] ADD Piso NVARCHAR(MAX) NULL
            END
        ");
        dbContext.Database.ExecuteSqlRaw(@"
            UPDATE [inventario].[Ubicaciones] SET Sede = 'Sede Principal' WHERE Sede IS NULL;
            UPDATE [inventario].[Ubicaciones] SET Piso = 'Piso 1' WHERE Piso IS NULL;
        ");
    } catch (Exception e) {
        Console.WriteLine(e);
    }
}
app.Run();

public class InvDb : DbContext {
    public InvDb(DbContextOptions<InvDb> options) : base(options) {}
    public DbSet<Ubicacion> Ubicaciones { get; set; }
    public DbSet<Activo> Activos { get; set; }
    public DbSet<Movimiento> Movimientos { get; set; }
    public DbSet<Marca> Marcas { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("inventario"); }
}
public class Ubicacion { [Key] public Guid Id { get; set; } = Guid.NewGuid(); public string Nombre { get; set; } = ""; public string? Descripcion { get; set; } public bool Activo { get; set; } = true; public string Sede { get; set; } = "Sede Principal"; public string Piso { get; set; } = "Piso 1"; }
public class Marca { [Key] public Guid Id { get; set; } = Guid.NewGuid(); public string Nombre { get; set; } = ""; public string ModelosJson { get; set; } = "[]"; }
public class Activo { 
    [Key] public Guid Id { get; set; } = Guid.NewGuid(); 
    public string Codigo { get; set; } = ""; public string Nombre { get; set; } = ""; public string Categoria { get; set; } = ""; 
    public string Marca { get; set; } = ""; public string Modelo { get; set; } = ""; public string Serie { get; set; } = ""; 
    public Guid UbicacionId { get; set; } public string Estado { get; set; } = ""; public string? FechaAdquisicion { get; set; } 
    public string? ProximoMantenimiento { get; set; } public string Criticidad { get; set; } = "Media"; 
    [Column("activo"), JsonPropertyName("activo")] public bool IsActivo { get; set; } = true; 
}
public class Movimiento { [Key] public Guid Id { get; set; } = Guid.NewGuid(); public Guid EquipoId { get; set; } public Guid? OrigenId { get; set; } public Guid DestinoId { get; set; } public string Fecha { get; set; } = ""; public Guid UsuarioId { get; set; } public string Motivo { get; set; } = ""; public string? Observaciones { get; set; } }
