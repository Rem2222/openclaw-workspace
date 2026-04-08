const GatewayClient = require('./gateway');

const gateway = new GatewayClient(
  process.env.GATEWAY_URL,
  process.env.GATEWAY_TOKEN
);

module.exports = gateway;
