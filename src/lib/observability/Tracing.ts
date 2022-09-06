/**
 * Tracing using OpenTelemetry connected to a
 * Grafana.com Tempo instance
 */

import { diag, DiagLogLevel, Sampler, trace } from '@opentelemetry/api';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  InMemorySpanExporter,
  SpanExporter,
  TraceIdRatioBasedSampler
} from '@opentelemetry/sdk-trace-base';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { Resource } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { container } from 'tsyringe';
import { CubeLogger } from './CubeLogger';

/**
 * creates an OpenTelemetry Tracer
 * @returns new Tracer object
 */
export function configureTracer() {
  const logger = container.resolve(CubeLogger).traces;

  diag.setLogger(logger, DiagLogLevel.DEBUG);

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'cubemoji',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.CM_ENVIRONMENT
    })
  );

  let sampler: Sampler = new AlwaysOnSampler();
  if (process.env.CM_ENVIRONMENT === 'prd') {
    sampler = new TraceIdRatioBasedSampler(0.6);
  }

  const provider = new NodeTracerProvider({
    resource,
    sampler
  });

  let exporter: SpanExporter = new InMemorySpanExporter();
  // enable exporting if this flag is set
  if (process.env.CM_ENABLE_TRACING) {
    exporter = new ZipkinExporter({
      url: process.env.CM_TRACE_URL
    });
  }

  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: 2000,
    scheduledDelayMillis: 30000
  }));

  provider.register();

  return trace.getTracer('cubemoji');
}
