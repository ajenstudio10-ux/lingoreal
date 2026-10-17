'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import Image from 'next/image';

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  // Estados para el modal de Paquetes
  const [modalPaqueteAbierto, setModalPaqueteAbierto] = useState(false);
  const [tipoPaqueteElegido, setTipoPaqueteElegido] = useState<2 | 3>(2);
  const [versionPaqueteElegida, setVersionPaqueteElegida] = useState<'std' | 'pro'>('pro');
  const [idiomasSeleccionados, setIdiomasSeleccionados] = useState<string[]>([]);
  const [correoPaquete, setCorreoPaquete] = useState('');
  const [enviandoPaquete, setEnviandoPaquete] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('lingoreal_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }

    // Capturar éxito de paquetes al volver de PayPal de forma segura y dinámica
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      const email = queryParams.get('email');
      const version = queryParams.get('version');
      const lang = queryParams.get('lang'); // Ej: paquete_2_frances,aleman

      if (email && version) {
        // 1. Limpiamos la URL INMEDIATAMENTE para que no se ejecute dos veces en Strict Mode
        window.history.replaceState({}, document.title, window.location.pathname);

        const registrarPaqueteExitoso = async () => {
          let idiomasAInsertar: string[] = [];

          if (lang) {
            // Extraemos la parte final que contiene los idiomas seleccionados (ej: "frances,aleman")
            const partes = lang.split('_');
            const listaIdiomas = partes[partes.length - 1]; 
            if (listaIdiomas.includes(',')) {
              idiomasAInsertar = listaIdiomas.split(',');
            } else if (['ingles', 'frances', 'aleman'].includes(listaIdiomas)) {
              idiomasAInsertar = [listaIdiomas];
            }
          }

          // Respaldo de seguridad por si el parámetro no trae la lista (ej: paquete de 3 completo)
          if (idiomasAInsertar.length === 0) {
            idiomasAInsertar = ['ingles', 'frances', 'aleman'];
          }

          for (const idioma of idiomasAInsertar) {
            await supabase.from('subscribers').insert({
              email: email,
              language: idioma,
              version: version,
            });
            localStorage.setItem(`lingoreal_correo_${idioma}`, email);
            localStorage.setItem(`lingoreal_version_${idioma}`, version);
          }

          alert('¡Paquete adquirido y registrado con éxito con PayPal! Ya puedes entrar a tus idiomas.');
        };

        registrarPaqueteExitoso();
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('lingoreal_theme', newMode ? 'dark' : 'light');
  };

  const abrirModalPaquete = (cant: 2 | 3) => {
    setTipoPaqueteElegido(cant);
    setVersionPaqueteElegida('pro'); // Por defecto sugerimos Pro
    if (cant === 3) {
      setIdiomasSeleccionados(['ingles', 'frances', 'aleman']);
    } else {
      setIdiomasSeleccionados([]);
    }
    setModalPaqueteAbierto(true);
  };

  const handleCheckboxIdioma = (idIdioma: string) => {
    if (tipoPaqueteElegido === 3) return; // Si es el de 3, van fijos todos

    if (idiomasSeleccionados.includes(idIdioma)) {
      setIdiomasSeleccionados(idiomasSeleccionados.filter(i => i !== idIdioma));
    } else {
      if (idiomasSeleccionados.length < 2) {
        setIdiomasSeleccionados([...idiomasSeleccionados, idIdioma]);
      } else {
        alert('Solo puedes seleccionar 2 idiomas para este paquete.');
      }
    }
  };

  // Precios correctos de los paquetes:
  // Paquete 2: Estándar $249, Pro $349
  // Paquete 3: Estándar $329, Pro $459
  const obtenerPrecioPaquete = () => {
    if (tipoPaqueteElegido === 2) {
      return versionPaqueteElegida === 'pro' ? 349 : 249;
    } else {
      return versionPaqueteElegida === 'pro' ? 459 : 329;
    }
  };

  // INTEGRACIÓN DE PAGO CON PAYPAL PARA PAQUETES (Dinámico por idioma seleccionado)
  const comprarPaqueteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tipoPaqueteElegido === 2 && idiomasSeleccionados.length !== 2) {
      alert('Por favor selecciona exactamente 2 idiomas.');
      return;
    }

    setEnviandoPaquete(true);

    try {
      // Unimos los idiomas seleccionados por coma (ejemplo: "frances,aleman")
      const idiomasString = idiomasSeleccionados.join(',');

      // Pedimos la URL de pago a nuestra API de PayPal
      const response = await fetch('/api/paypal-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: correoPaquete,
          language: `paquete_${tipoPaqueteElegido}_${idiomasString}`, // Mandamos la lista real de idiomas
          version: `paquete_${tipoPaqueteElegido}_${versionPaqueteElegida}`,
          customPrice: obtenerPrecioPaquete() * 100,
          productName: `Paquete LingoReal - ${tipoPaqueteElegido} Idiomas (${versionPaqueteElegida.toUpperCase()})`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago del paquete con PayPal.');
      }

      if (data.url) {
        window.location.href = data.url; // Redirige a PayPal
        return;
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Hubo un error al procesar el pago del paquete.');
      setEnviandoPaquete(false);
    }
  };

  const idiomas = [
    { id: 'ingles', nombre: 'Inglés Americano', flag: '🇬🇧', desc: 'Domina el idioma global para negocios y viajes.', color: 'from-blue-500 to-indigo-600', precioStd: 139, precioPro: 199 },
    { id: 'frances', nombre: 'Francés Canadiense', flag: '🇫🇷', desc: 'Aprende el idioma del amor y la diplomacia.', color: 'from-emerald-500 to-teal-600', precioStd: 139, precioPro: 199 },
    { id: 'aleman', nombre: 'Alemán', flag: '🇩🇪', desc: 'Abre puertas profesionales en ingeniería y tecnología.', color: 'from-amber-500 to-orange-600', precioStd: 139, precioPro: 199 },
  ];

  return (
    <main className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Navbar superior */}
      <nav className={`w-full backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4 transition-colors duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image 
                src="/logo.jpg" 
                alt="LingoReal Logo" 
                width={40} 
                height={40} 
                className="h-10 w-auto object-contain"

              />

            <span className="font-extrabold text-xl tracking-tight">Lingo4Real</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full hidden sm:inline-block ${darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
              Idiomas Reales y Prácticos
            </span>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl text-sm border transition ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
              title="Cambiar modo"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className={`inline-block text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-4 shadow-2xs ${darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
          🚀 Versiones Estándar y Pro Disponibles
        </div>
        <h1 className={`text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Aprende y domina expresiones reales <br />
          <span className="text-emerald-500">habla natural desde el día uno.</span>
        </h1>
        <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Libros digitales interactivos con expresiones cotidianas reales, muestras gratis en cada tema y opción de descarga en PDF con audios nativos.
        </p>

        {/* Tarjetas de Idioma Individuales */}
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
          Selecciona tu idioma
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto mb-16">
          {idiomas.map((item) => (
            <Link
              key={item.id}
              href={`/${item.id}`}
              className={`group p-8 rounded-3xl border shadow-xs transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-600' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xl'}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${item.color}`} />
              <div>
                <div className={`text-4xl mb-4 p-3 w-fit rounded-2xl border transition-transform group-hover:scale-110 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {item.flag}
                </div>
                <h3 className={`text-2xl font-bold mb-2 transition-colors ${darkMode ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-600'}`}>
                  {item.nombre}
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.desc}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-4 text-slate-400 border-t pt-3 border-slate-800/20">
                  <span>Estándar: <strong className="text-emerald-500">${item.precioStd}</strong></span>
                  <span>Pro: <strong className="text-emerald-500">${item.precioPro}</strong></span>
                </div>
                <div className="flex items-center text-sm font-bold text-emerald-500 group-hover:translate-x-1 transition-transform">
                  Ver libro y muestras gratis →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* SECCIÓN DE PAQUETES AHORRO */}
        <div className={`rounded-3xl border p-8 md:p-12 shadow-md mb-16 text-left ${darkMode ? 'bg-gradient-to-br from-slate-900 to-emerald-950/30 border-slate-800' : 'bg-gradient-to-br from-emerald-50/50 to-slate-50 border-emerald-200'}`}>
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
              Promociones Especiales 📦
            </span>
            <h3 className={`text-3xl font-extrabold mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Paquetes de Ahorro</h3>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Más libros, más idiomas, más aprendizaje y más ahorro.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>⚡ Paquete 2 Libros</h4>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-500">$349</span>
                    <span className={`block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pro (Estándar: $249)</span>
                  </div>
                </div>
                <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Elige cualquier combinación de 2 idiomas con opción a versión Estándar o Pro.</p>
              </div>
              <button 
                onClick={() => abrirModalPaquete(2)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-xs"
              >
                Elegir y Seleccionar 2 Idiomas →
              </button>
            </div>

            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>🔥 Paquete 3 Libros (Total)</h4>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-500">$459</span>
                    <span className={`block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pro (Estándar: $329)</span>
                  </div>
                </div>
                <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Llévate los tres idiomas (Inglés, Francés y Alemán) en versión Estándar o Pro.</p>
              </div>
              <button 
                onClick={() => abrirModalPaquete(3)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-xs"
              >
                Adquirir Paquete Total 3 Idiomas →
              </button>
            </div>
          </div>
        </div>

        {/* SECCIÓN SOBRE NOSOTROS */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 md:p-14 text-white text-left mb-16 shadow-lg">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
            Acerca de nosotros 🌍
          </span>
          
          <h3 className="text-3xl font-extrabold mt-4 mb-6">
            De una escuela de idiomas a una nueva forma de aprender expresiones reales
          </h3>

          <div className="space-y-4 text-slate-300 leading-relaxed text-sm md:text-base mb-8">
            <p>
              Durante más de 10 años, en Lingolime, la escuelita de idiomas en línea del profesor Yanick, hemos acompañado a estudiantes en su aprendizaje de diferentes idiomas.
            </p>
            <p>
              A lo largo de estos años descubrimos algo muy importante: aprender un idioma no consiste solamente en conocer palabras y reglas gramaticales. También significa entender cómo se expresa realmente la gente.
            </p>
            <p className="font-semibold text-emerald-400">
              Porque una cosa es aprender un idioma en un libro… y otra muy diferente es escucharlo, entenderlo y utilizarlo en situaciones reales.
            </p>
            <p className="text-xl font-extrabold text-white pt-2">
              De esta experiencia nace Lingo4Real.
            </p>
            <p>
              Lingo4Real es la versión digital de nuestra propuesta de expresiones reales, desarrollada a partir de la experiencia de Lingolime y pensada para que los estudiantes puedan descubrir las expresiones que forman parte de la comunicación cotidiana.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 md:p-8 mb-8">
            <h4 className="text-lg font-bold text-emerald-400 mb-3">Nuestra misión</h4>
            <p className="text-slate-300 leading-relaxed mb-4">
              Queremos ayudarte a dar ese paso que muchas veces hace falta para pasar de <span className="italic">“sé el idioma”</span> a <span className="italic">“puedo comunicarme de forma natural”</span>.
            </p>
          </div>

          <div className="text-center md:text-left font-bold text-emerald-300 italic text-lg space-y-1">
            <p>Lingolime nos enseña idiomas.</p>
            <p className="text-white">Lingo4Real a vivirlos.</p>
          </div>
        </div>

        {/* SECCIÓN DE PREGUNTAS FRECUENTES (FAQ) */}
        <div className={`rounded-3xl border p-8 md:p-12 shadow-md mb-16 text-left ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
              Dudas Comunes 💡
            </span>
            <h3 className={`text-3xl font-extrabold mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Preguntas Frecuentes</h3>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Conoce todo lo que necesitas saber sobre nuestros libros y metodología.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Qué encontraré en los libros?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Encontrarás expresiones reales utilizadas por hablantes del idioma, organizadas por temas y explicadas en español. Cada expresión incluye su significado, nivel de formalidad, ejemplo y explicación del contexto.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Son libros para principiantes?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sí. Están pensados para hispanohablantes y las explicaciones están en español. También pueden ser útiles para personas que ya tienen conocimientos y quieren expresarse de una manera más natural.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Las expresiones son realmente utilizadas por hablantes nativos?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sí. El objetivo es enseñarte expresiones naturales y de uso cotidiano, no traducciones literales que normalmente no utilizaría un hablante nativo.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Qué diferencia hay entre los tres libros?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Cada libro está adaptado a una variante específica del idioma: inglés americano, francés canadiense y alemán. Las expresiones y ejemplos se seleccionan teniendo en cuenta el uso real de cada idioma.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Cuántas expresiones contiene cada libro?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Cada libro está dividido en 10 secciones temáticas, con 25 expresiones por sección.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Los libros son digitales o físicos?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Son libros digitales que puedes consultar desde tu celular, tablet o computadora.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Puedo comprar solamente un libro?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sí. Puedes comprar cada libro individualmente o adquirir el paquete si quieres estudiar varios idiomas.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Cómo recibo mi libro después de comprarlo?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Después de completar el pago, recibirás las instrucciones y accesos para consultar o descargar tu libro digital.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Puedo utilizar los libros aunque viva fuera de México?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sí. Los libros están dirigidos principalmente a hispanohablantes, por lo que puedes utilizarlos independientemente de tu ubicación.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>¿Por qué comprar este libro si puedo buscar expresiones gratis en Internet?</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                El valor está en que las expresiones están seleccionadas, organizadas por situaciones y acompañadas de traducción, contexto, ejemplos y nivel de formalidad, ahorrándote tiempo de búsqueda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE PAQUETE */}
      {modalPaqueteAbierto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl p-8 max-w-md w-full shadow-xl border relative max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <button 
              onClick={() => setModalPaqueteAbierto(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 text-xl font-bold"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                Paquete Ahorro Lingo4Real 📦
              </span>
              <h2 className={`text-2xl font-extrabold mt-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {tipoPaqueteElegido === 2 ? 'Selecciona tus 2 Idiomas' : 'Paquete Total 3 Idiomas'}
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {tipoPaqueteElegido === 2 ? 'Marca los 2 idiomas y elige la versión que prefieres.' : 'Se incluirán los 3 idiomas. Elige la versión que deseas.'}
              </p>
            </div>

            <form onSubmit={comprarPaqueteSubmit} className="space-y-5">
              
              {/* Selector de Versión del Paquete */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Elige la Versión del Paquete
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVersionPaqueteElegida('std')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      versionPaqueteElegida === 'std'
                        ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                        : darkMode ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-sm">Estándar</div>
                    <div className="text-xs opacity-80">${tipoPaqueteElegido === 2 ? '249' : '329'}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVersionPaqueteElegida('pro')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      versionPaqueteElegida === 'pro'
                        ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                        : darkMode ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-sm">Pro 🚀</div>
                    <div className="text-xs text-emerald-500 font-semibold">${tipoPaqueteElegido === 2 ? '349' : '459'}</div>
                  </button>
                </div>
              </div>

              {/* Selector de Idiomas */}
              <div className="space-y-3">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tipoPaqueteElegido === 2 ? 'Selecciona 2 Idiomas' : 'Idiomas Incluidos'}
                </label>
                {idiomas.map((item) => {
                  const seleccionado = idiomasSeleccionados.includes(item.id);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleCheckboxIdioma(item.id)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition ${
                        seleccionado 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                      } ${tipoPaqueteElegido === 3 ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.flag}</span>
                        <span className="font-bold text-sm">{item.nombre}</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => {}} 
                        disabled={tipoPaqueteElegido === 3}
                        className="w-5 h-5 accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Correo Electrónico para Registrar el Paquete</label>
                <input 
                  type="email" 
                  placeholder="tu.correo@ejemplo.com"
                  value={correoPaquete}
                  onChange={(e) => setCorreoPaquete(e.target.value)}
                  required
                  className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>

              <button 
                type="submit"
                disabled={enviandoPaquete || (tipoPaqueteElegido === 2 && idiomasSeleccionados.length !== 2)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3.5 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {enviandoPaquete ? 'Redirigiendo a PayPal...' : `Confirmar y Pagar ($${obtenerPrecioPaquete()}) →`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-8 px-6 text-center text-xs transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Lingo4Real 🌍. Todos los derechos reservados.</p>
          <div className="flex gap-6 items-center">
            <Link href="/privacidad" className="hover:text-emerald-500 transition">Aviso de Privacidad</Link>
            <Link href="/terminos" className="hover:text-emerald-500 transition">Términos y Condiciones</Link>
            <Link href="/admin-secreto-lingoreal" className="text-slate-600 hover:text-slate-400 transition" title="Portal Admin">
              ⚙️
            </Link>
          </div>
        </div>
      </footer>

    </main>
  );
}