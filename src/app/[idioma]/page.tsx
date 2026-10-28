'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type Expression = {
  id: number;
  topic_title: string;
  phrase: string;
  translation: string;
  example?: string;
  example_translation?: string;
  usage_tip?: string;
  audio_url: string;
};

export default function PaginaIdioma({ params }: { params: Promise<{ idioma: string }> }) {
  const resolvedParams = use(params);
  const idiomaActual = resolvedParams.idioma.toLowerCase();
  const nombreIdioma = resolvedParams.idioma.toUpperCase();

  const [darkMode, setDarkMode] = useState(false);
  const [expresiones, setExpresiones] = useState<Expression[]>([]);
  const [loading, setLoading] = useState(true);
  const [temaSeleccionado, setTemaSeleccionado] = useState<string>('todos');

  // Estado del usuario y su compra
  const [versionComprada, setVersionComprada] = useState<string | null>(null);
  const [correoUsuario, setCorreoUsuario] = useState('');

  // Modales
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  
  const [correoInput, setCorreoInput] = useState('');
  const [tipoVersionElegida, setTipoVersionElegida] = useState<'standard' | 'pro'>('standard');
  const [enviando, setEnviando] = useState(false);
  const [exitoRegistro, setExitoRegistro] = useState(false);
  const [mensajeLogin, setMensajeLogin] = useState('');

  // Validar si el usuario tiene acceso pro (individual o en paquete)
  const esPro = versionComprada ? versionComprada.toLowerCase().includes('pro') : false;

useEffect(() => {
    const savedTheme = localStorage.getItem('lingoreal_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }

    async function cargarDatos() {
      const { data, error } = await supabase
        .from('expressions')
        .select('*')
        .eq('language', idiomaActual);

      if (error) {
        console.error('Error al cargar de Supabase:', error);
      } else {
        setExpresiones(data || []);
      }
      setLoading(false);
    }

    // Capturar retorno exitoso de PayPal de forma segura
// Capturar retorno exitoso de PayPal y ejecutar la CAPTURA
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('success') === 'true') {
      const email = queryParams.get('email');
      const version = queryParams.get('version');
      const token = queryParams.get('token'); // ID de la orden enviado por PayPal

      if (email && version && token) {
        // Limpiamos la URL para evitar ejecuciones dobles
        window.history.replaceState({}, document.title, window.location.pathname);

        const procesarCapturaYRegistro = async () => {
          try {
            // 1. Ejecutar la captura del pago en PayPal
            const captureRes = await fetch('/api/paypal-checkout', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });

            const captureData = await captureRes.json();

            if (!captureRes.ok || !captureData.success) {
              throw new Error(captureData.error || 'No se pudo completar el cobro con PayPal.');
            }

            // 2. Si PayPal confirmó la captura exitosa, guardamos en Supabase
            const { error } = await supabase.from('subscribers').insert([
              {
                email: email,
                language: idiomaActual,
                version: version,
              }
            ]);

            localStorage.setItem(`lingoreal_correo_${idiomaActual}`, email);
            localStorage.setItem(`lingoreal_version_${idiomaActual}`, version);
            setCorreoUsuario(email);
            setVersionComprada(version);

            alert(`¡Pago de $${version === 'pro' ? '199' : '139'} MXN capturado con éxito! Ya tienes acceso a ${nombreIdioma}.`);

          } catch (err: any) {
            console.error('Error procesando pago:', err);
            alert(`Hubo un problema al confirmar tu cobro: ${err.message}`);
          }
        };

        procesarCapturaYRegistro();
      }
    }

    const correoGuardado = localStorage.getItem(`lingoreal_correo_${idiomaActual}`);
    const versionGuardada = localStorage.getItem(`lingoreal_version_${idiomaActual}`);

    if (correoGuardado) {
      setCorreoUsuario(correoGuardado);
    }
    if (versionGuardada) {
      setVersionComprada(versionGuardada);
    }

    cargarDatos();
  }, [idiomaActual]);

  
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('lingoreal_theme', newMode ? 'dark' : 'light');
  };

  const reproducirAudio = (url: string) => {
    if (!url) {
      alert('Esta expresión aún no tiene audio registrado.');
      return;
    }
    const audio = new Audio(url);
    audio.play().catch((err) => console.error('Error al reproducir audio:', err));
  };

  // INTEGRACIÓN DE PAGO CON PAYPAL (Segura sin registrar antes de pagar)
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    try {
      // Solicitamos la URL de pago a nuestra API de PayPal sin tocar Supabase todavía
      const response = await fetch('/api/paypal-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: correoInput,
          language: idiomaActual,
          version: tipoVersionElegida,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago con PayPal.');
      }

      if (data.url) {
        window.location.href = data.url; // Redirige a PayPal
        return;
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Hubo un error al procesar el pago.');
      setEnviando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeLogin('');

    const { data, error } = await supabase
      .from('subscribers')
      .select('version, language')
      .eq('email', correoInput);

    setEnviando(false);

    if (error) {
      setMensajeLogin('❌ Ocurrió un error al verificar el correo.');
      return;
    }

    const compraIdioma = data?.find((item: any) => item.language === idiomaActual || item.language.includes('paquete'));

    if (compraIdioma) {
      const ver = compraIdioma.version || 'pro'; 
      setVersionComprada(ver);
      setCorreoUsuario(correoInput);

      localStorage.setItem(`lingoreal_correo_${idiomaActual}`, correoInput);
      localStorage.setItem(`lingoreal_version_${idiomaActual}`, ver);

      setModalLoginAbierto(false);
      setCorreoInput('');
      alert(`¡Sesión restaurada con éxito! Bienvenido de nuevo.`);
    } else {
      setMensajeLogin('⚠️ No encontramos compras registradas para este idioma con este correo.');
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem(`lingoreal_correo_${idiomaActual}`);
    localStorage.removeItem(`lingoreal_version_${idiomaActual}`);
    setVersionComprada(null);
    setCorreoUsuario('');
    alert('Has cerrado tu sesión.');
  };

  const descargarLibroPDF = () => {
    if (expresiones.length === 0) {
      alert('No hay expresiones para exportar.');
      return;
    }

    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text(`Libro de Expresiones: ${nombreIdioma}`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado por LingoReal - Contenido Completo`, 14, 28);

      const tableColumn = ["Tema", "Frase / Expresión", "Traducción", "Ejemplo"];
      const tableRows: any[] = [];

      expresiones.forEach((item) => {
        const tema = item.topic_title || 'General';
        const fraseOriginal = item.phrase || '';
        const traduccion = item.translation || '';
        const ejemplo = item.example ? `"${item.example}"\n(${item.example_translation || ''})` : '';

        tableRows.push([tema, fraseOriginal, traduccion, ejemplo]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 55 }
        }
      });

      doc.save(`Libro_LingoReal_${nombreIdioma}.pdf`);

    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar el PDF.');
    }
  };

  const descargarAudiosZIP = async () => {
    try {
      if (!expresiones || expresiones.length === 0) {
        alert(`No hay expresiones cargadas para ${nombreIdioma}. Intenta recargar la página.`);
        return;
      }

      alert(`Generando archivo ZIP con los audios de ${nombreIdioma}, por favor espera un momento...`);
      
      const zip = new JSZip();
      const folder = zip.folder(`audios_${idiomaActual}`);
      let contadorAudios = 0;

      for (const item of expresiones) {
        const urlAudio = item.audio_url; 
        
        if (urlAudio) {
          try {
            const response = await fetch(urlAudio);
            if (response.ok) {
              const blob = await response.blob();
              const nombreArchivo = urlAudio.split('/').pop()?.split('?')[0] || `audio_${item.id}.mp3`;
              
              folder?.file(nombreArchivo, blob);
              contadorAudios++;
            } else {
              console.warn(`No se pudo descargar el archivo (Status ${response.status}): ${urlAudio}`);
            }
          } catch (fetchErr) {
            console.warn(`Error de red al intentar descargar: ${urlAudio}`);
          }
        }
      }

      if (contadorAudios === 0) {
        alert(`No se encontraron enlaces de audio válidos registrados en la base de datos para ${nombreIdioma}. Revisa que las expresiones tengan su campo de audio.`);
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Audios_Lingo4Real_${nombreIdioma}.zip`);


    } catch (err) {
      
      console.error(err);
      alert('Hubo un error al empaquetar los audios.');
    }
  };

  const temasDisponibles = ['todos', ...Array.from(new Set(expresiones.map(item => item.topic_title || 'General')))];

  const expresionesFiltradas = temaSeleccionado === 'todos' 
    ? expresiones 
    : expresiones.filter(item => (item.topic_title || 'General') === temaSeleccionado);

  return (
    <main className={`min-h-screen p-6 md:p-16 relative transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-3xl mx-auto">
        
        {/* Barra superior */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-emerald-500 hover:underline font-medium text-sm">
            ← Volver al inicio
          </Link>

          <div className="flex items-center gap-3">
            {correoUsuario ? (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-semibold ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-emerald-200 text-slate-800'}`}>
                <span className="text-emerald-400">🟢 {correoUsuario} ({versionComprada?.toUpperCase()})</span>
                <button onClick={cerrarSesion} className="text-red-400 hover:underline">
                  Salir
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setModalLoginAbierto(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}
              >
                🔑 Iniciar Sesión / Restaurar
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl text-sm border transition ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}
              title="Cambiar modo"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        {/* Encabezado e indicador de descargas */}
        <div className={`p-8 rounded-2xl border mb-8 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
            Libro Digital Lingo4Real
          </span>
          <h1 className={`text-3xl md:text-4xl font-extrabold mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Libro de {nombreIdioma}
          </h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Cada tema incluye 2 expresiones de muestra gratis. Desbloquea el idioma completo para acceder a todo el contenido.
          </p>

          {versionComprada ? (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? 'bg-slate-950 border-emerald-900/50' : 'bg-emerald-50/50 border-emerald-200'}`}>
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase">📦 Contenido Disponible para Descarga</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {esPro ? 'Tienes acceso a la Versión Pro (Libro + Audios)' : 'Tienes acceso a la Versión Estándar (Libro en PDF)'}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={descargarLibroPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                >
                  📥 Descargar Libro PDF
                </button>
                {esPro && (
                  <button 
                    onClick={descargarAudiosZIP}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    🎵 Descargar Audios ZIP
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-amber-500/10 border-amber-500/30">
              <p className={`text-xs ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                ⚠️ No has adquirido este idioma. Puedes ver las 2 muestras gratis por tema o comprar el acceso completo.
              </p>
              <button 
                onClick={() => setModalPagoAbierto(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl whitespace-nowrap shadow-xs transition"
              >
                Comprar Libro Completo →
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-slate-500 py-12">Cargando contenido desde Supabase...</p>
        ) : expresiones.length === 0 ? (
          <div className={`rounded-xl border p-8 text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Aún no hay expresiones registradas para este idioma.</p>
          </div>
        ) : (
          <>
            {/* Pestañas de filtrado de temas */}
            <div className="flex flex-wrap gap-2 mb-8">
              {temasDisponibles.map((tema) => (
                <button
                  key={tema}
                  onClick={() => setTemaSeleccionado(tema)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                    temaSeleccionado === tema
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : darkMode 
                        ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tema === 'todos' ? '📚 Todos los temas' : tema}
                </button>
              ))}
            </div>

            {/* Listado de expresiones agrupadas */}
            <div className="space-y-6">
              {expresionesFiltradas.map((item, index) => {
                const temaActualItem = item.topic_title || 'General';
                const expresionesDelTema = expresiones.filter(e => (e.topic_title || 'General') === temaActualItem);
                const indiceEnTema = expresionesDelTema.findIndex(e => e.id === item.id);
                const esMuestraGratis = indiceEnTema < 2; 

                const estaDesbloqueado = versionComprada !== null || esMuestraGratis;

                return (
                  <div 
                    key={item.id} 
                    className={`p-6 rounded-2xl border transition-all ${
                      estaDesbloqueado 
                        ? darkMode ? 'bg-slate-900 border-slate-800 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
                        : darkMode ? 'bg-slate-900/30 border-slate-800/60 text-slate-500' : 'bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200'}`}>
                        {temaActualItem} (Expresión #{indiceEnTema + 1})
                      </span>

                      {esMuestraGratis ? (
                        <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-xs">
                          ✨ MUESTRA GRATIS
                        </span>
                      ) : versionComprada ? (
                        <span className="text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded-full shadow-xs">
                          🔓 DESBLOQUEADO ({versionComprada.toUpperCase()})
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-amber-500 text-white px-3 py-1 rounded-full shadow-xs">
                          🔒 REQUIERE COMPRA
                        </span>
                      )}
                    </div>

                    {estaDesbloqueado ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.phrase}</p>
                          <p className={`text-lg font-medium mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.translation}</p>
                        </div>

                        {(item.example || item.example_translation) && (
                          <div className={`border-l-4 border-emerald-500 p-3.5 rounded-r-xl space-y-1 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                              Ejemplo de Uso:
                            </p>
                            {item.example && (
                              <p className={`text-sm font-semibold italic ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                "{item.example}"
                              </p>
                            )}
                            {item.example_translation && (
                              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {item.example_translation}
                              </p>
                            )}
                          </div>
                        )}

                        {item.usage_tip && (
                          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                            <span className="font-bold">💡 Tip:</span>
                            <span>{item.usage_tip}</span>
                          </div>
                        )}

                        {item.audio_url && (esMuestraGratis || esPro) ? (
                          <button
                            onClick={() => reproducirAudio(item.audio_url)}
                            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition ${darkMode ? 'bg-emerald-950/40 hover:bg-emerald-950 text-emerald-400 border-emerald-900' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                          >
                            🔊 Escuchar pronunciación nativa
                          </button>
                        ) : !esMuestraGratis && !esPro ? (
                          <p className="text-xs text-amber-500 font-medium">
                            💡 Audio disponible en la Versión Pro ($199).
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className={`font-medium mb-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          🔒 Esta expresión forma parte del contenido completo de <span className="font-bold">{nombreIdioma}</span>.
                        </p>
                        <button 
                          onClick={() => setModalPagoAbierto(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm transition"
                        >
                          Comprar Idioma Completo para Desbloquear Todo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE SELECCIÓN DE VERSIÓN Y PAGO */}
      {modalPagoAbierto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-xl border relative ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <button 
              onClick={() => setModalPagoAbierto(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 text-xl font-bold"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                Lingo4Real 🌍
              </span>
              <h2 className={`text-2xl font-extrabold mt-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Desbloquear Curso de {nombreIdioma}
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Elige tu versión ideal para obtener acceso permanente y descargas.
              </p>
            </div>

            {exitoRegistro ? (
              <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-center font-medium text-sm">
                ¡Compra registrada con éxito! Redirigiendo... 🚀
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setTipoVersionElegida('standard')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition ${tipoVersionElegida === 'standard' ? 'border-emerald-500 bg-emerald-500/10' : darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">Estándar</span>
                      <span className="text-emerald-500 font-black">$139</span>
                    </div>
                    <p className="text-xs text-slate-400">Incluye libro digital PDF sin audios.</p>
                  </div>

                  <div 
                    onClick={() => setTipoVersionElegida('pro')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition ${tipoVersionElegida === 'pro' ? 'border-emerald-500 bg-emerald-500/10' : darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-indigo-400">Pro 🎵</span>
                      <span className="text-emerald-500 font-black">$199</span>
                    </div>
                    <p className="text-xs text-slate-400">Incluye libro PDF + Audios descargables.</p>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Correo Electrónico</label>
                  <input 
                    type="email" 
                    placeholder="tu.correo@ejemplo.com"
                    value={correoInput}
                    onChange={(e) => setCorreoInput(e.target.value)}
                    required
                    className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3.5 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {enviando ? 'Redirigiendo a PayPal...' : `Pagar Versión ${tipoVersionElegida.toUpperCase()} ($${tipoVersionElegida === 'standard' ? '139' : '199'}) →`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE INICIO DE SESIÓN */}
      {modalLoginAbierto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl p-8 max-w-md w-full shadow-xl border relative ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <button 
              onClick={() => setModalLoginAbierto(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 text-xl font-bold"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${darkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-800'}`}>
                Restaurar Accesos 🎓
              </span>
              <h2 className={`text-2xl font-extrabold mt-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Iniciar Sesión
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Ingresa tu correo para recuperar tus compras de Lingo4Real.
              </p>
            </div>

            {mensajeLogin && (
              <div className="bg-amber-950 border border-amber-800 text-amber-300 p-3 rounded-xl text-xs font-medium mb-4 text-center">
                {mensajeLogin}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Correo Registrado</label>
                <input 
                  type="email" 
                  placeholder="tu.correo@ejemplo.com"
                  value={correoInput}
                  onChange={(e) => setCorreoInput(e.target.value)}
                  required
                  className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <button 
                type="submit"
                disabled={enviando}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold p-3.5 rounded-xl shadow-sm transition disabled:opacity-50 border border-slate-700"
              >
                {enviando ? 'Buscando compras...' : 'Restaurar Mis Cursos →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}