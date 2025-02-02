const {
  assertSpans,
  logSpanTable,
  request,
  waitSpans,
} = require('../utils.js');
const snapshot = require('./snapshot.js');

waitSpans(snapshot.length).then((data) => {
	logSpanTable(data);
	assertSpans(data, snapshot);
}).then(() => {
  console.log(`${snapshot.length} spans validated.`);
});

request(process.env.REQ_URL ?? 'http://localhost:8080/hello');
