import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY!;

if (!supabaseUrl || !supabaseKey || !elevenLabsApiKey) {
  console.error('❌ Error: Falta alguna de las variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🎯 CONFIGURA AQUÍ LOS IDs DE LAS VOCES DE ELEVENLABS SEGÚN EL IDIOMA
// Puedes obtener los Voice IDs desde el catálogo/biblioteca de ElevenLabs
function obtenerVoiceIdPorIdioma(idioma: string): string {
  const idiomaClean = idioma.toLowerCase().trim();

  switch (idiomaClean) {
    case 'ingles':
    case 'english':
      return 'x70vRnQBMBu4FAYhjJbO'; // Ejemplo: Rachel

    case 'frances':
    case 'french':
      return 'RBhYSNMNu6b2CGZ9Fn1M'; // Ejemplo: Charlotte / Antoine

    case 'italiano':
    case 'italian':
      return 'pMsXg24629a2EjaK99gi'; 

    case 'aleman':
    case 'german':
      return 'Cqbq4nsuUe1we6J45miU';

    default:
      // Voz por defecto si no coincide el nombre exacto del idioma
      return '21m00Tcm4TlvDq8ikWAM';
  }
}

async function procesarAudiosPendientes() {
  console.log('🔍 Consultando expresiones pendientes en Supabase...');

  // 1. Obtener las expresiones que NO tienen audio cargado
  const { data: expresiones, error } = await supabase
    .from('expressions')
    .select('id, phrase, language')
    .or('audio_url.is.null,audio_url.eq.""');

  if (error) {
    console.error('❌ Error al consultar la base de datos:', error.message);
    return;
  }

  if (!expresiones || expresiones.length === 0) {
    console.log('✨ ¡Excelente! No hay expresiones pendientes por generar audio.');
    return;
  }

  console.log(`🎙️ Se encontraron ${expresiones.length} expresiones pendientes.`);
  console.log('🚀 Iniciando proceso de generación masiva...\n');

  let procesadosExitosos = 0;

  for (let i = 0; i < expresiones.length; i++) {
    const item = expresiones[i];
    const contador = `[${i + 1}/${expresiones.length}]`;

    try {
      console.log(`${contador} Generando audio para (${item.language}): "${item.phrase}"...`);

      const voiceId = obtenerVoiceIdPorIdioma(item.language);

      // 2. Llamar a ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
          text: item.phrase,
          model_id: 'eleven_multilingual_v2', // Modelo recomendado con pronunciación excelente
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error en ElevenLabs API (ID ${item.id}):`, errorText);
        continue;
      }

      // Convertir la respuesta a Buffer
      const audioArrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);

      // Nombre amigable para el archivo en Supabase Storage
      const fileName = `${item.language.toLowerCase()}/expresion_${item.id}.mp3`;

      // 3. Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('audios')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`❌ Error subiendo a Storage (ID ${item.id}):`, uploadError.message);
        continue;
      }

      // 4. Obtener la URL pública del audio cargado
      const { data: publicUrlData } = supabase.storage
        .from('audios')
        .getPublicUrl(fileName);

      const audioUrl = publicUrlData.publicUrl;

      // 5. Actualizar la tabla 'expressions' con la nueva URL
      const { error: updateError } = await supabase
        .from('expressions')
        .update({ audio_url: audioUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Error al actualizar registro en base de datos (ID ${item.id}):`, updateError.message);
      } else {
        console.log(`✅ ¡Guardado con éxito! -> ${audioUrl}\n`);
        procesadosExitosos++;
      }

      // Pausa de 800ms entre peticiones para evitar saturación y cuidar rate limits
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (err) {
      console.error(`⚠️ Excepción imprevista procesando ID ${item.id}:`, err);
    }
  }

  console.log(`🎉 ¡Proceso finalizado! Se generaron ${procesadosExitosos} audios exitosamente.`);
}

procesarAudiosPendientes();