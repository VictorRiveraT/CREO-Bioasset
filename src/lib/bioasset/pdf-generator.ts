import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import type { MaintenanceRecord, Equipment, User } from "./types";

import { format } from "date-fns";



export function generateMaintenancePDF(

  maintenance: MaintenanceRecord,

  equipo: Equipment | undefined,

  user: User | undefined,

  sede: string,

  ubicacion: string

) {

  const doc = new jsPDF();

  

  // Try to parse structured observations

  let data = {

    actividad: maintenance.tipo,

    encargadoArea: user?.nombre || "No asignado",

    perturbacionReportada: "",

    proveedorInstalacion: "Clínica CREO",

    causasObservaciones: "",

    accionesInmediatas: "",

    recomendacionesFuturas: "",

  };



  try {

    const parsed = JSON.parse(maintenance.observaciones || "{}");

    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {

      data.causasObservaciones = parsed.causas || "";

      data.perturbacionReportada = parsed.perturbacion || "";

      data.accionesInmediatas = parsed.acciones || "";

      data.recomendacionesFuturas = parsed.recomendaciones || "";

    } else {

      data.causasObservaciones = maintenance.observaciones || "";

    }

  } catch {

    data.causasObservaciones = maintenance.observaciones || "";

  }



  // Header Title

  doc.setFontSize(16);

  doc.setFont("helvetica", "bold");

  doc.text("INFORME TÉCNICO", 105, 20, { align: "center" });



  doc.setFontSize(12);

  doc.setTextColor(255, 0, 0);

  doc.text("Creo+", 160, 20);

  doc.setTextColor(0, 0, 0);



  // General Info Table

  autoTable(doc, {

    startY: 30,

    theme: "grid",

    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },

    body: [

      [

        { content: "Nº REQUERIMIENTO", styles: { fontStyle: "bold" as any } },

        maintenance.id.substring(0, 8).toUpperCase(),

        { content: "FECHA", styles: { fontStyle: "bold" as any } },

        format(new Date(maintenance.fecha), "dd/MM/yyyy"),

      ],

      [

        { content: "UNIDAD", styles: { fontStyle: "bold" as any } },

        sede,

        { content: "ÁREA", styles: { fontStyle: "bold" as any } },

        ubicacion,

      ],

      [

        { content: "ACTIVIDAD", styles: { fontStyle: "bold" as any } },

        { content: data.actividad, colSpan: 3 },

      ],

      [

        { content: "ENCARGADO DEL ÁREA", styles: { fontStyle: "bold" as any } },

        { content: data.encargadoArea, colSpan: 3 },

      ],

      [

        { content: "EQUIPO / INSTALACIÓN INVOLUCRADA", styles: { fontStyle: "bold" as any } },

        { content: equipo?.nombre || "", colSpan: 3 },

      ],

      [

        { content: "MARCA:", styles: { fontStyle: "bold" as any } },

        equipo?.marca || "",

        { content: "MODELO:", styles: { fontStyle: "bold" as any } },

        equipo?.modelo || "",

      ],

      [

        { content: "SERIE:", styles: { fontStyle: "bold" as any } },

        { content: equipo?.serie || "", colSpan: 3 },

      ],

      [

        { content: "PERTURBACIÓN REPORTADA", styles: { fontStyle: "bold" as any } },

        { content: data.perturbacionReportada, colSpan: 3 },

      ],

      [

        { content: "PROVEEDOR DE INSTALACIÓN", styles: { fontStyle: "bold" as any } },

        { content: data.proveedorInstalacion, colSpan: 3 },

      ],

    ],

  });



  const finalY = (doc as any).lastAutoTable.finalY + 10;



  // Sections

  autoTable(doc, {

    startY: finalY,

    theme: "grid",

    headStyles: { fillColor: [150, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },

    head: [["A. CAUSAS / OBSERVACIONES:"]],

    body: [[data.causasObservaciones || "Ninguna"]],

  });



  const finalY2 = (doc as any).lastAutoTable.finalY + 5;



  autoTable(doc, {

    startY: finalY2,

    theme: "grid",

    headStyles: { fillColor: [150, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },

    head: [["B. ACCIONES INMEDIATAS TOMADAS"]],

    body: [[data.accionesInmediatas || "Ninguna"]],

  });



  const finalY3 = (doc as any).lastAutoTable.finalY + 5;



  autoTable(doc, {

    startY: finalY3,

    theme: "grid",

    headStyles: { fillColor: [150, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },

    head: [["C. RECOMENDACIONES FUTURAS / ACCIONES CORRECTIVAS"]],

    body: [[data.recomendacionesFuturas || "Ninguna"]],

  });



  // Footer Signatures

  const footerY = (doc as any).lastAutoTable.finalY + 40;

  

  if (footerY > 270) {

    doc.addPage();

    doc.setFont("helvetica", "bold");

    doc.text("INFORME TÉCNICO ELABORADO POR", 20, 30);

    doc.setFont("helvetica", "normal");

    doc.line(70, 30, 180, 30);

    doc.setFont("helvetica", "bold");

    doc.text("NOMBRE:", 70, 40);

    doc.setFont("helvetica", "normal");

    doc.text(user?.nombre || "____________________", 100, 40);

    doc.setFont("helvetica", "bold");

    doc.text("CARGO:", 70, 50);

    doc.setFont("helvetica", "normal");

    doc.text(user?.rol?.toUpperCase() || "____________________", 100, 50);

  } else {

    doc.setFont("helvetica", "bold");

    doc.text("INFORME TÉCNICO", 20, footerY);

    doc.setFont("helvetica", "normal");

    doc.setFont("helvetica", "bold");

    doc.text("ELABORADO POR:", 20, footerY + 5);

    doc.setFont("helvetica", "normal");

    doc.line(70, footerY, 180, footerY);

    doc.setFont("helvetica", "bold");

    doc.text("NOMBRE:", 70, footerY + 10);

    doc.setFont("helvetica", "normal");

    doc.text(user?.nombre || "____________________", 100, footerY + 10);

    doc.setFont("helvetica", "bold");

    doc.text("CARGO:", 70, footerY + 20);

    doc.setFont("helvetica", "normal");

    doc.text(user?.rol?.toUpperCase() || "____________________", 100, footerY + 20);

  }



  doc.save(`Informe_Tecnico_${maintenance.id.substring(0,8)}.pdf`);

}

