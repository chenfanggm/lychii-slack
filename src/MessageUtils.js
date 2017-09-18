
const asUser = (user) => {
  return `<@${user.id}>`
}

const asToUserMessage = (message, user) => {
  return `${asUser(user)} ${message}`
}

const asCodeBlock = (message) => {
  return `\`\`\`${message}\`\`\``
}

module.exports = {
  asUser,
  asToUserMessage,
  asCodeBlock
}