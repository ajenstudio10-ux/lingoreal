'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function AdminPanel() {
  const [idioma, setIdioma] = useState('ingles');
  const [tema, setTema] = useState('');
  const [fraseOriginal, setFraseOriginal] = useState('');
  const [traduccion, setTraduccion] = useState('');
  const [ejemplo, setEjemplo] = useState('');
  const [traduccionEjemplo, setTraduccionEjemplo] = useState('');
  const [tipUso, setTipUso] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [esGratis, setEsGratis] = useState(false);
  
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const nuevaExpresion = {
      language: idioma,
      topic_title: tema,
      phrase: fraseOriginal,
      translation: traduccion,
      example: ejemplo,
      example_translation: traduccionEjemplo,
      usage_tip: tipUso,
      audio_url: audioUrl,
      is_free: esGratis,
    };

    const { error } = await supabase.from('expressions').insert([nuevaExpresion]);

    setGuardando(false);

    if (error) {
      console.error('Error al guardar:', error);
      alert('Hubo un error al guardar la expresión.');
    } else {
      alert('¡Expresión guardada correctamente!');
      // Limpiar campos del formulario
      setFraseOriginal('');
      setTraduccion('');
      setEjemplo('');
      setTraduccionEjemplo('');
      setTipUso('');
      setAudioUrl('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full flex justify-between items-center mb-8">
        <div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Panel de Control 🛠️
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">
            Administrador de LingoReal
          </h1>
        </div>
        <Link 
          href="/" 
          className="text-emerald-600 hover:text-emerald-700 font-bold text-sm transition"
        >
          Ver Sitio Web →
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-4xl w-full">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          Agregar Nueva Expresión o Tema
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Fila 1: Idioma y Tema */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Idioma
              </label>
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ingles">Inglés</option>
                <option value="frances">Francés</option>
                <option value="aleman">Alemán</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Título del Tema / Capítulo
              </label>
              <input
                type="text"
                placeholder="Ej. Saludos, Presentaciones y Small Talk"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 2: Frase original y Traducción */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Frase en el idioma original
              </label>
              <input
                type="text"
                placeholder="Ej. What's up?"
                value={fraseOriginal}
                onChange={(e) => setFraseOriginal(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Traducción al Español
              </label>
              <input
                type="text"
                placeholder="Ej. ¿Qué tal? / ¿Qué pasa?"
                value={traduccion}
                onChange={(e) => setTraduccion(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 3: Ejemplo y Traducción del Ejemplo */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Ejemplo (en el idioma original)
              </label>
              <input
                type="text"
                placeholder="Ej. Hey bro, what's up with you today?"
                value={ejemplo}
                onChange={(e) => setEjemplo(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Traducción del Ejemplo (al Español)
              </label>
              <input
                type="text"
                placeholder="Ej. Hola bro, ¿qué onda contigo hoy?"
                value={traduccionEjemplo}
                onChange={(e) => setTraduccionEjemplo(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 4: Tip de uso y URL de Audio */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Tip de Uso
              </label>
              <input
                type="text"
                placeholder="Ej. Muy informal, úsalo solo con amigos."
                value={tipUso}
                onChange={(e) => setTipUso(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                URL del Audio (Supabase Storage)
              </label>
              <input
                type="text"
                placeholder="https://tu-proyecto.supabase.co/storage/v1/object/public/audios/..."
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Checkbox Muestra Gratuita */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="muestra"
              checked={esGratis}
              onChange={(e) => setEsGratis(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="muestra" className="text-sm font-semibold text-slate-700 cursor-pointer">
              ¿Es contenido gratuito (Muestra)?
            </label>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-md disabled:opacity-50"
          >
            {guardando ? 'Guardando Expresión...' : 'Guardar Expresión'}
          </button>

        </form>
      </div>
    </main>
  );
}