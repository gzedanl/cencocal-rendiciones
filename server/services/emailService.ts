import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';

export async function enviarCorreoRendicionEnviada(rendicionId: string) {
  const rendicion = await prisma.rendicion.findUnique({
    where: { id: rendicionId },
    include: { boletas: true },
  });
  if (!rendicion) return;

  const destinatario = process.env.EMAIL_NAIFFA || 'naiffa.chahuan@cencocal.cl';
  const monto = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(rendicion.montoTotal));
  const asunto = `Nueva Rendición - ${rendicion.nombreRendidor} (${monto})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">🧾 Nueva Rendición de Gastos</h2>
        <p style="color: #bfdbfe; margin: 5px 0 0;">Sistema Cencocal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p>Hola Naiffa,</p>
        <p>Se ha recibido una nueva rendición de gastos que requiere tu autorización:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Rendidor</td><td style="padding: 8px;">${rendicion.nombreRendidor}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Período</td><td style="padding: 8px;">${new Date(rendicion.fechaPeriodoDesde).toLocaleDateString('es-CL')} - ${new Date(rendicion.fechaPeriodoHasta).toLocaleDateString('es-CL')}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Zona</td><td style="padding: 8px;">${rendicion.zona}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Monto Total</td><td style="padding: 8px; font-size: 18px; color: #1e40af; font-weight: bold;">${monto}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">N° Boletas</td><td style="padding: 8px;">${rendicion.boletas.length}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Fecha Envío</td><td style="padding: 8px;">${new Date(rendicion.fechaEnvio).toLocaleString('es-CL')}</td></tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${BASE_URL}/autorizador?id=${rendicionId}" style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Revisar y Autorizar →
          </a>
        </div>
      </div>
      <div style="background: #1e40af; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #bfdbfe; margin: 0; font-size: 12px;">Sistema de Rendición de Gastos Cencocal</p>
      </div>
    </div>
  `;

  await enviarCorreo(destinatario, asunto, html, rendicionId, 'rendicion_enviada');
}

export async function enviarCorreoRendicionAprobada(rendicionId: string) {
  const rendicion = await prisma.rendicion.findUnique({ where: { id: rendicionId } });
  if (!rendicion) return;

  const datosBancarios = rendicion.rutRendidor
    ? await prisma.datosBancarios.findUnique({ where: { rutRendidor: rendicion.rutRendidor } })
    : null;

  const destinatario = process.env.EMAIL_SECRETARIA || 'secretaria@cencocal.cl';
  const monto = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(rendicion.montoTotal));
  const asunto = `Rendición Aprobada - Listo para Pago (${monto})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #166534; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">✅ Rendición Aprobada - Procesar Pago</h2>
        <p style="color: #bbf7d0; margin: 5px 0 0;">Sistema Cencocal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p>Hola,</p>
        <p>Una rendición de gastos ha sido <strong>aprobada por Naiffa</strong> y está lista para procesar el pago:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Rendidor</td><td style="padding: 8px;">${rendicion.nombreRendidor}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">RUT</td><td style="padding: 8px;">${rendicion.rutRendidor || 'No registrado'}</td></tr>
          <tr><td style="padding: 8px; background: #f1f5f9; font-weight: bold;">Monto</td><td style="padding: 8px; font-size: 18px; color: #166534; font-weight: bold;">${monto}</td></tr>
          ${datosBancarios ? `
          <tr><td style="padding: 8px; background: #dcfce7; font-weight: bold;">Banco</td><td style="padding: 8px;">${datosBancarios.nombreBanco}</td></tr>
          <tr><td style="padding: 8px; background: #dcfce7; font-weight: bold;">N° Cuenta</td><td style="padding: 8px;">${datosBancarios.numeroCuenta}</td></tr>
          <tr><td style="padding: 8px; background: #dcfce7; font-weight: bold;">Tipo Cuenta</td><td style="padding: 8px; text-transform: capitalize;">${datosBancarios.tipoCuenta}</td></tr>
          ` : '<tr><td colspan="2" style="padding: 8px; color: #dc2626;">⚠️ Sin datos bancarios registrados</td></tr>'}
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${BASE_URL}/pagos" style="background: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Ir al Portal de Pagos →
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Puedes exportar la nómina o generar remesa bancaria directamente desde el portal.</p>
      </div>
      <div style="background: #166534; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #bbf7d0; margin: 0; font-size: 12px;">Sistema de Rendición de Gastos Cencocal</p>
      </div>
    </div>
  `;

  await enviarCorreo(destinatario, asunto, html, rendicionId, 'rendicion_aprobada');
}

async function enviarCorreo(destinatario: string, asunto: string, html: string, rendicionId: string | null, tipoEvento: string) {
  let estadoEnvio: 'enviado' | 'fallo' = 'fallo';
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Sistema Rendiciones <sistema@cencocal.cl>',
      to: destinatario,
      subject: asunto,
      html,
    });
    estadoEnvio = 'enviado';
    console.log(`✉️  Correo enviado a ${destinatario}: ${asunto}`);
  } catch (error) {
    console.error(`❌ Error enviando correo a ${destinatario}:`, error);
  }

  await prisma.logCorreo.create({
    data: {
      tipoEvento: tipoEvento as any,
      destinatario,
      asunto,
      contenido: html,
      estadoEnvio,
      rendicionId,
    },
  });
}
