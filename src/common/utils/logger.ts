import { JetLogger } from 'jet-logger';

// Structured JSON logs.
const logger = JetLogger({
  mode: 'console',
  format: 'json',
  showTime: true,
});

export default logger;
