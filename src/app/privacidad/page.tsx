import Link from 'next/link';

export default function AvisoPrivacidad() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
        <Link href="/" className="text-emerald-600 hover:underline font-medium text-sm mb-6 inline-block">
          ← Volver al inicio
        </Link>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Aviso de Privacidad</h1>
        
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>En <strong>LingoLime</strong> nos comprometemos a proteger y respetar tu privacidad. Este documento explica cómo recopilamos y usamos tu información personal.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">1. Información que recopilamos</h2>
          <p>Únicamente solicitamos tu correo electrónico cuando decides registrarte para obtener una muestra gratuita, comprar un temario o iniciar sesión para recuperar tus accesos previos.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">2. Uso de los datos</h2>
          <p>Tu correo se utiliza estrictamente para validar tus compras de temarios, permitirte el acceso a los audios y libros digitales de los idiomas adquiridos, y enviarte notificaciones importantes sobre tu cuenta.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">3. Protección de datos</h2>
          <p>Tus datos son almacenados de forma segura a través de nuestros servicios en la nube (Supabase) y bajo ningún motivo comercializamos o compartimos tu información con terceros.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">4. Contacto</h2>
          <p>Si tienes dudas sobre este aviso de privacidad, puedes ponerte en contacto con el equipo de soporte o con tu profesor encargado.</p>
        </div>
      </div>
    </main>
  );
}