# Profiling

> :construction: &nbsp;Status: Experimental - profiling is currently considered in alpha status and not suitable for production use.

Continuous profiling of applications.

## Configuration

When loading the instrumentation via CLI:

```
export SPLUNK_PROFILER_ENABLED=true
node -r @splunk/otel/instrument app.js
```

Or when using [advanced configuration](advanced-config.md):

```javascript
const { startProfiling } = require('@splunk/otel');

startProfiling({
  serviceName: 'my-service',
});
```
