// tracing.js
// Este archivo debe estar en la raíz de tu proyecto.

// 1. Importar los módulos necesarios de OpenTelemetry
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

console.log("[TRACING] Inicializando OpenTelemetry para lista-tareas-app...");

// 2. Configurar el exportador de Traces (para enviar datos a Grafana)
// Por defecto, se conectará al endpoint definido en la variable de entorno OTEL_EXPORTER_OTLP_ENDPOINT.
// Grafana Cloud y Render configuran esto automáticamente si están vinculados.
const traceExporter = new OTLPTraceExporter();

// 3. Crear una instancia del SDK de OpenTelemetry
const sdk = new NodeSDK({
  // Define un "recurso" para identificar tu servicio en Grafana.
  resource: new Resource({
    // Cambia por el nombre que quieras ver en Grafana
    [SemanticResourceAttributes.SERVICE_NAME]: 'lista-tareas-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  // Asigna el exportador que acabamos de crear.
  traceExporter,
  // Habilita las instrumentaciones automáticas para librerías populares (Express, MySQL, etc.).
  instrumentations: [getNodeAutoInstrumentations()],
});

// 4. Iniciar el SDK y manejar el apagado seguro.
try {
  sdk.start();
  console.log('[TRACING] OpenTelemetry SDK iniciado correctamente.');
} catch (error) {
  console.error('[TRACING] Error al iniciar OpenTelemetry SDK:', error);
}

// Asegurarse de que el SDK se apague correctamente cuando el proceso termine.
process.on('SIGTERM', () => {
  console.log('[TRACING] Recibida señal SIGTERM, cerrando OpenTelemetry...');
  sdk.shutdown()
    .then(() => console.log('[TRACING] Tracing terminado correctamente.'))
    .catch((error) => console.log('[TRACING] Error al terminar el tracing:', error))
    .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[TRACING] Recibida señal SIGINT, cerrando OpenTelemetry...');
  sdk.shutdown()
    .then(() => console.log('[TRACING] Tracing terminado correctamente.'))
    .catch((error) => console.log('[TRACING] Error al terminar el tracing:', error))
    .finally(() => process.exit(0));
});