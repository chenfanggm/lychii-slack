const SlackAdapter = require('./SlackAdapter')
const messageUtils = require('./messageUtils')


module.exports = SlackAdapter

for (const key in messageUtils) {
  module.exports[key] = messageUtils[key]
}
