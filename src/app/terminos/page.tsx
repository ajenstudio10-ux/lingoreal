import Link from 'next/link';

export default function TerminosYCondiciones() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
        <Link href="/" className="text-emerald-600 hover:underline font-medium text-sm mb-6 inline-block">
          ← Volver al inicio
        </Link>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Términos y Condiciones</h1>
        
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>Bienvenido a <strong>LingoLime</strong>. Al adquirir nuestros temarios digitales y utilizar nuestra plataforma, aceptas los siguientes términos:</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">1. Licencia de Uso</h2>
          <p>Los libros digitales, expresiones y audios de pronunciación son para uso personal y educativo del alumno comprador. Queda prohibida su reproducción masiva o redistribución no autorizada.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">2. Compras por Temario</h2>
          <p>Las compras se realizan por módulos o temarios individuales por idioma. Cada compra otorga al usuario acceso permanente e ilimitado al contenido de dicho temario mediante inicio de sesión con su correo registrado.</p>
          
          <h2 className="text-lg font-bold text-slate-900 pt-4">3. Modificaciones</h2>
          <p>LingoLime se reserva el derecho de actualizar, modificar o expandir el contenido de los temarios de manera continua para mejorar la experiencia de aprendizaje.</p>
        </div>
      </div>
    </main>
  );
}