import { Shell } from "@/components/shell";
import { ACCEPTOR_LIMIT } from "@/lib/wording";

export const metadata = { title: "Privacidad · Constancia" };

export default function Privacy() {
  return (
    <Shell>
      <h1 className="text-2xl font-bold">Qué guardamos y qué no</h1>
      <div className="prose mt-4 space-y-4 text-slate-800">
        <p><strong>Guardamos:</strong> las cifras mensuales calculadas, un resumen (nombre del archivo, huella del texto, cuántos depósitos incluiste) y tus permisos. <strong>No guardamos</strong> el texto completo de tu estado de cuenta ni descripciones de movimientos.</p>
        <p><strong>Procesamiento:</strong> el texto que pegas se lee en el servidor para detectar depósitos y se descarta al terminar. Nada se registra en bitácoras.</p>
        <p><strong>Lectura con IA (opcional):</strong> si la activas, el texto se envía a la API gratuita de Gemini de Google para proponer filas. La capa gratuita puede usar el contenido para mejorar sus productos; por eso está apagada por defecto. Cada fila que propone la IA se vuelve a comprobar contra tu texto y se descarta si no aparece. La IA nunca calcula tus cifras.</p>
        <p><strong>Constancias:</strong> son un enlace con vencimiento (7, 30 o 90 días) que tú creas y puedes revocar. Quien tenga el enlace ve las cifras. Registramos solo la hora de cada apertura, sin IP ni navegador.</p>
        <p><strong>Borrar:</strong> desde tu panel puedes borrar un registro o todos tus datos en cualquier momento.</p>
        <p><strong>Límite:</strong> el documento lo subes tú; no está verificado por el banco ni por el IMSS. {ACCEPTOR_LIMIT}</p>
      </div>
    </Shell>
  );
}
