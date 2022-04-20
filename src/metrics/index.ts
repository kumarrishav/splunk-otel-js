/*
 * Copyright Splunk Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { metrics, ValueType } from '@opentelemetry/api-metrics';
import { Resource } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader, PushMetricExporter } from '@opentelemetry/sdk-metrics-base';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { defaultServiceName, getEnvBoolean, getEnvNumber } from '../options';
import { EnvResourceDetector } from '../resource';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export type MetricExporterFactory = (options: MetricsOptions) => PushMetricExporter;

interface MetricsOptions {
  serviceName: string;
  accessToken: string;
  endpoint?: string;
  resource?: Resource;
  exportInterval: number;
  exporterFactory: MetricExporterFactory;
  enableRuntimeMetrics: boolean;
}

/* TODO: Native API might need a new API for OTel metrics. Types commented out until then.
interface Counters {
  min: number;
  max: number;
  average: number;
  sum: number;
  count: number;
}

interface GcCounters {
  collected: Counters;
  duration: Counters;
}

interface NativeCounters {
  eventLoopLag: Counters;
  gc: {
    all: GcCounters;
    scavenge: GcCounters;
    mark_sweep_compact: GcCounters;
    incremental_marking: GcCounters;
    process_weak_callbacks: GcCounters;
  };
}
*/

export type StartMetricsOptions = Partial<MetricsOptions>;

export function otlpMetricsExporterFactory(
  options: StartMetricsOptions
): PushMetricExporter {
  // TODO: Re-add once the grpc package conflict does not happen due to bundledDeps
  /*
  const metadata = new grpc.Metadata();
  if (options.accessToken) {
    metadata.set('X-SF-TOKEN', options.accessToken);
  }
  */
  return new OTLPMetricExporter({
    url: options.endpoint,
  });
}

export function startMetrics(opts: StartMetricsOptions = {}) {
  const options = _setDefaultOptions(opts);

  const provider = new MeterProvider({
    resource: options.resource,
  });

  provider.addMetricReader(new PeriodicExportingMetricReader({
    exportIntervalMillis: options.exportInterval,
    exporter: options.exporterFactory(options),
  }));

  metrics.setGlobalMeterProvider(provider);

  if (options.enableRuntimeMetrics) {
    const meter = metrics.getMeter('splunk-otel-js');

    meter.createObservableGauge(
      'process.runtime.nodejs.memory.heap.total',
      result => {
        result.observe(process.memoryUsage().heapTotal, {});
      },
      {
        unit: 'By',
        valueType: ValueType.INT,
      },
    );

    meter.createObservableGauge(
      'process.runtime.nodejs.memory.heap.used',
      result => {
        result.observe(process.memoryUsage().heapUsed, {});
      },
      {
        unit: 'By',
        valueType: ValueType.INT,
      },
    );

    meter.createObservableGauge(
      'process.runtime.nodejs.memory.rss',
      result => {
        result.observe(process.memoryUsage().rss, {});
      },
      {
        unit: 'By',
        valueType: ValueType.INT,
      },
    );
  }
}

export function _setDefaultOptions(
  options: StartMetricsOptions = {}
): MetricsOptions {
  const accessToken =
    options.accessToken || process.env.SPLUNK_ACCESS_TOKEN || '';

  const envResource = new EnvResourceDetector().detect();

  const serviceName = String(
    options.serviceName ||
      process.env.OTEL_SERVICE_NAME ||
      envResource.attributes[SemanticResourceAttributes.SERVICE_NAME] ||
      defaultServiceName
  );

  const resource = envResource.merge(
    new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName })
  );

  return {
    serviceName,
    accessToken,
    resource,
    endpoint: options.endpoint,
    exporterFactory: otlpMetricsExporterFactory,
    exportInterval:
      options.exportInterval ||
      getEnvNumber('OTEL_METRIC_EXPORT_INTERVAL', 5000),
    enableRuntimeMetrics:
      options.enableRuntimeMetrics ||
      getEnvBoolean('SPLUNK_RUNTIME_METRICS_ENABLED', false),
  };
}
